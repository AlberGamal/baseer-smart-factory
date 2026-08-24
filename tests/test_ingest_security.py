import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from api.ingest import verify_ingest_key


class IngestionSecurityTests(unittest.TestCase):
    def test_ingestion_key_is_required(self):
        with patch.dict(os.environ, {"BASEER_INGEST_KEY": "secret-key"}):
            with self.assertRaises(HTTPException) as missing:
                verify_ingest_key(None)
            self.assertEqual(missing.exception.status_code, 401)
            with self.assertRaises(HTTPException) as wrong:
                verify_ingest_key("wrong-key")
            self.assertEqual(wrong.exception.status_code, 401)
            self.assertIsNone(verify_ingest_key("secret-key"))

    def test_ingestion_is_unavailable_when_not_configured(self):
        with patch.dict(os.environ, {"BASEER_INGEST_KEY": ""}):
            with self.assertRaises(HTTPException) as exc:
                verify_ingest_key("anything")
            self.assertEqual(exc.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
