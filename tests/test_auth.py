import hashlib
import os
import unittest
from unittest.mock import patch

from api import auth


class AuthTests(unittest.TestCase):
    def test_password_hash_is_random_and_verifies(self):
        first = auth.hash_password("correct horse")
        second = auth.hash_password("correct horse")
        self.assertNotEqual(first, second)
        self.assertTrue(auth.verify_password("correct horse", first))
        self.assertFalse(auth.verify_password("wrong horse", first))

    def test_legacy_hash_remains_verifiable(self):
        legacy = hashlib.sha256("baseersecret".encode()).hexdigest()
        self.assertTrue(auth.verify_password("secret", legacy))

    def test_signed_token_round_trip_and_tamper_rejection(self):
        with patch.dict(os.environ, {"BASEER_SECRET": "x" * 40, "APP_ENV": "production"}):
            token = auth.create_token(7, "manager", None)
            self.assertEqual(auth.decode_token(token)["uid"], 7)
            body, signature = token.split(".", 1)
            tampered = f"{body[:-1]}A.{signature}"
            self.assertIsNone(auth.decode_token(tampered))

    def test_production_requires_a_configured_secret(self):
        with patch.dict(os.environ, {"BASEER_SECRET": "", "APP_ENV": "production"}):
            with self.assertRaises(RuntimeError):
                auth.create_token(1, "manager", None)


if __name__ == "__main__":
    unittest.main()
