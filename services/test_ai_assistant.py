#!/usr/bin/env python3
"""
Unit Test Suite for ThreadCraft ERP Forward Deployed AI Assistant Service.
Validates:
1. Intent classification accuracy across all 5 textile domain categories
2. SQL generation correctness and schema alignment
3. Safety guardrail enforcement (read-only verification, SQL injection rejection)
4. JSON payload structure conformance
"""

import unittest
from ai_assistant import AIAssistantEngine, validate_safety_guardrails

class TestAIAssistantService(unittest.TestCase):

    def setUp(self):
        self.engine = AIAssistantEngine(provider="heuristic")

    def test_inventory_query(self):
        query = "Show me stock levels for low-inventory cotton yarn"
        res = self.engine.process_query(query)
        self.assertEqual(res["intent"], "INVENTORY_LEVELS")
        self.assertGreaterEqual(res["confidence"], 0.90)
        self.assertTrue(res["safety_passed"])
        self.assertIn("Material", res["grounded_sql"])
        self.assertIn("reorder_level", res["grounded_sql"])

    def test_defect_rate_query(self):
        query = "What is the defect rate on Machine #3 for recent shifts?"
        res = self.engine.process_query(query)
        self.assertEqual(res["intent"], "QUALITY_DEFECT_ANALYSIS")
        self.assertTrue(res["safety_passed"])
        self.assertIn("ProductionLog", res["grounded_sql"])
        self.assertIn("dozen_b", res["grounded_sql"])

    def test_machine_telemetry_query(self):
        query = "Which machines are currently running and who are the operators?"
        res = self.engine.process_query(query)
        self.assertEqual(res["intent"], "MACHINE_EFFICIENCY")
        self.assertTrue(res["safety_passed"])
        self.assertIn("Machine", res["grounded_sql"])
        self.assertIn("status", res["grounded_sql"])

    def test_dispatch_cartons_query(self):
        query = "How many cartons of Category A socks do we have ready for dispatch?"
        res = self.engine.process_query(query)
        self.assertEqual(res["intent"], "WAREHOUSE_DISPATCH")
        self.assertTrue(res["safety_passed"])
        self.assertIn("144", res["grounded_sql"])

    def test_costing_query(self):
        query = "Calculate unit yarn and production cost for athletic crew socks"
        res = self.engine.process_query(query)
        self.assertEqual(res["intent"], "COSTING_ESTIMATION")
        self.assertTrue(res["safety_passed"])
        self.assertIn("Product", res["grounded_sql"])

    def test_safety_guardrails_destructive_commands(self):
        """Ensure dangerous queries or destructive SQL are blocked by safety rails."""
        self.assertFalse(validate_safety_guardrails("DROP TABLE \"Product\";"))
        self.assertFalse(validate_safety_guardrails("DELETE FROM \"StockBalance\" WHERE id = 1;"))
        self.assertFalse(validate_safety_guardrails("UPDATE \"Machine\" SET status = 'STOPPED';"))
        self.assertFalse(validate_safety_guardrails("TRUNCATE TABLE \"ProductionLog\";"))
        self.assertTrue(validate_safety_guardrails("SELECT * FROM \"Material\" WHERE id = 1;"))

if __name__ == "__main__":
    unittest.main()
