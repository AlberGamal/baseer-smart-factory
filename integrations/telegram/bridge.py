"""
Telegram ⇆ Baseer bridge — the synchronization layer.

The unified `alerts` table is the single source of truth shared between the
platform and the team's Telegram bot (godfather):

  • Platform writes alerts  (status='new').
  • This bridge polls for 'new' alerts, sends them to Telegram, then marks
    them sent_to_telegram=TRUE / status='sent' and stores telegram_message_id.
  • If the bot/operator acknowledges from Telegram, the bridge can flip
    status='ack' on the same row → the dashboard reflects it within seconds.

To plug in the team's existing notifier.py, drop it next to this file and
replace `_send_to_telegram()` with a call to its `send_telegram_msg(...)` /
`report_ppe_violation(...)`. The DB polling/sync logic below stays the same.

Run:  python -m integrations.telegram.bridge
"""

import os
import json
import asyncio
import urllib.request

import asyncpg

POLL_SECONDS = 3
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
DEFAULT_CHAT_ID = os.getenv("TELEGRAM_DEFAULT_CHAT_ID", "")


async def _connect() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "postgres"),
        database=os.getenv("POSTGRES_DB", "baseer"),
        min_size=1, max_size=4,
    )


def _send_to_telegram(chat_id: str, text: str) -> str:
    """Send one message; return the telegram message id (or '' on failure).

    >>> Replace this body with the team's notifier.send_telegram_msg(...) <<<
    """
    if not TOKEN or not chat_id:
        print(f"[telegram-bridge] (dry-run) → {chat_id}: {text}")
        return ""
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    data = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            payload = json.loads(resp.read().decode())
            return str(payload.get("result", {}).get("message_id", ""))
    except Exception as e:
        print(f"[telegram-bridge] send failed: {e}")
        return ""


async def _resolve_chat_id(pool: asyncpg.Pool, employee_id) -> str:
    if employee_id:
        cid = await pool.fetchval(
            "SELECT telegram_chat_id FROM employees WHERE id=$1", employee_id)
        if cid:
            return cid
    return DEFAULT_CHAT_ID


async def run():
    pool = await _connect()
    print("[telegram-bridge] started — syncing `alerts` table with Telegram every "
          f"{POLL_SECONDS}s")
    while True:
        rows = await pool.fetch(
            "SELECT id, title, body, employee_id FROM alerts "
            "WHERE status='new' ORDER BY created_at LIMIT 20")
        for r in rows:
            chat_id = await _resolve_chat_id(pool, r["employee_id"])
            text = f"<b>{r['title']}</b>\n{r['body'] or ''}"
            msg_id = _send_to_telegram(chat_id, text)
            await pool.execute(
                "UPDATE alerts SET status='sent', sent_to_telegram=TRUE, "
                "telegram_message_id=$2 WHERE id=$1", r["id"], msg_id or None)
            print(f"[telegram-bridge] alert #{r['id']} sent → {chat_id or 'dry-run'}")
        await asyncio.sleep(POLL_SECONDS)


if __name__ == "__main__":
    asyncio.run(run())
