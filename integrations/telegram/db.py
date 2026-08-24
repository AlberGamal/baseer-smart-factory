"""
Minimal `db` shim so the team's notifier.py (`from db import logger`) drops in
unchanged. Replace with the real attendance-system db module if you prefer.
"""

import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("baseer.telegram")
