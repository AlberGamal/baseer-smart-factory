import unittest
from datetime import datetime

from pydantic import ValidationError

from api.ingest import AttendanceIn, DefectIn, FireIn, SafetyIn
from api.models import AdjustmentRequest, LoginRequest, Settings


class ModelValidationTests(unittest.TestCase):
    def test_valid_ingestion_payloads(self):
        self.assertEqual(DefectIn(image_path="frame.png", label="Defect", score=0.91).label, "Defect")
        self.assertEqual(AttendanceIn(employee_code="EMP-001", event_type="in").event_type, "in")
        self.assertEqual(SafetyIn(employee_code="EMP-001", items={"helmet": True}).items["helmet"], True)
        self.assertEqual(FireIn(alert_type="smoke", confidence=0.75).confidence, 0.75)

    def test_ingestion_ranges_and_enums_are_enforced(self):
        with self.assertRaises(ValidationError):
            DefectIn(image_path="frame.png", label="Unknown", score=0.5)
        with self.assertRaises(ValidationError):
            DefectIn(image_path="frame.png", label="Defect", score=1.1)
        with self.assertRaises(ValidationError):
            AttendanceIn(employee_code="EMP-001", event_type="present")
        with self.assertRaises(ValidationError):
            FireIn(alert_type="flame", confidence=0.5)

    def test_business_input_limits_are_enforced(self):
        with self.assertRaises(ValidationError):
            LoginRequest(username="", password="x")
        with self.assertRaises(ValidationError):
            AdjustmentRequest(kind="bonus", amount=0)
        with self.assertRaises(ValidationError):
            AdjustmentRequest(kind="bonus", amount=10, month="2026-13")
        settings = Settings(
            work_start="09:00", work_end="17:00", normal_rate=50,
            overtime_rate=80, grace_minutes=15
        )
        self.assertEqual(settings.grace_minutes, 15)


if __name__ == "__main__":
    unittest.main()
