"""Authentication helpers for the Baseer platform.

Passwords use PBKDF2-HMAC-SHA256 with a per-password random salt. The verifier
also accepts the original fixed-salt SHA-256 format so existing installations can
be migrated by resetting passwords rather than being locked out.

Tokens are compact HMAC-signed payloads. Set ``BASEER_SECRET`` to a long random
value in every deployed environment; the development fallback is rejected when
``APP_ENV`` is ``production``.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Dict, Optional

TOKEN_TTL = 60 * 60 * 12  # 12 hours
_PASSWORD_SCHEME = "pbkdf2_sha256"
_PASSWORD_ITERATIONS = 310_000
_LEGACY_SALT = "baseer"
_DEV_SECRET = "baseer-dev-secret-change-me"


def _token_secret() -> bytes:
    configured = os.getenv("BASEER_SECRET", "").strip()
    app_env = os.getenv("APP_ENV", "development").lower()
    if not configured:
        if app_env == "production":
            raise RuntimeError("BASEER_SECRET must be configured in production")
        configured = _DEV_SECRET
    if len(configured) < 32 and app_env == "production":
        raise RuntimeError("BASEER_SECRET must contain at least 32 characters in production")
    return configured.encode("utf-8")


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 and a random salt."""
    if not isinstance(password, str) or not password:
        raise ValueError("Password must be a non-empty string")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PASSWORD_ITERATIONS
    )
    return f"{_PASSWORD_SCHEME}${_PASSWORD_ITERATIONS}${_b64e(salt)}${_b64e(digest)}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify modern hashes and the legacy fixed-salt SHA-256 format."""
    if not isinstance(password, str) or not isinstance(password_hash, str):
        return False
    if password_hash.startswith(f"{_PASSWORD_SCHEME}$"):
        try:
            scheme, iterations, encoded_salt, encoded_digest = password_hash.split("$", 3)
            if scheme != _PASSWORD_SCHEME:
                return False
            iterations_int = int(iterations)
            if iterations_int < 100_000:
                return False
            salt = _b64d(encoded_salt)
            expected = _b64d(encoded_digest)
            actual = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), salt, iterations_int
            )
            return hmac.compare_digest(actual, expected)
        except (TypeError, ValueError):
            return False

    # Backward compatibility for hashes created by the original demo.
    legacy = hashlib.sha256((_LEGACY_SALT + password).encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy, password_hash)


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64d(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_token(user_id: int, role: str, employee_id: Optional[int]) -> str:
    payload = {
        "uid": user_id,
        "role": role,
        "eid": employee_id,
        "exp": int(time.time()) + TOKEN_TTL,
    }
    body = _b64e(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _b64e(hmac.new(_token_secret(), body.encode("ascii"), hashlib.sha256).digest())
    return f"{body}.{signature}"


def decode_token(token: str) -> Optional[Dict]:
    try:
        body, signature = token.split(".", 1)
        expected = _b64e(hmac.new(_token_secret(), body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(_b64d(body))
        if not isinstance(payload, dict) or payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except (RuntimeError, TypeError, ValueError, json.JSONDecodeError):
        return None
