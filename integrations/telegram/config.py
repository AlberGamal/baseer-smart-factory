"""
Config shim for the Telegram notifier (godfather).

The team's notifier.py does `from config import TELEGRAM_BOT_TOKEN`. This shim
supplies it from the environment so the same bot file drops in unchanged.
"""

import os

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
