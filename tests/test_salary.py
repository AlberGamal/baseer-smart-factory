import unittest

from api.salary import compute_salary


class FakePool:
    def __init__(self):
        self.calls = []

    async def fetchrow(self, query, *args):
        self.calls.append((query, args))
        if "FROM settings" in query:
            return {"normal_rate": 50, "overtime_rate": 80}
        if "FROM attendance_records" in query:
            return {"normal_hours": 8.25, "overtime_hours": 2}
        if "FROM salary_adjustments" in query:
            return {"deductions": 25, "bonuses": 10}
        raise AssertionError(f"Unexpected query: {query}")


class SalaryTests(unittest.IsolatedAsyncioTestCase):
    async def test_salary_breakdown_is_recomputed_from_source_rows(self):
        result = await compute_salary(FakePool(), 4, "2026-08")
        self.assertEqual(result["normal_hours"], 8.25)
        self.assertEqual(result["overtime_pay"], 160.0)
        self.assertEqual(result["base_pay"], 412.5)
        self.assertEqual(result["deductions"], 25.0)
        self.assertEqual(result["bonuses"], 10.0)
        self.assertEqual(result["net_salary"], 557.5)


if __name__ == "__main__":
    unittest.main()
