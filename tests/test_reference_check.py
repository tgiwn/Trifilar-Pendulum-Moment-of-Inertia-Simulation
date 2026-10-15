# SPDX-License-Identifier: Apache-2.0
import importlib.util
import math
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "compare_reference.py"
spec = importlib.util.spec_from_file_location("compare_reference", SCRIPT)
ref = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(ref)


class ReferenceComparisonTests(unittest.TestCase):
    def test_known_solid_disk_formula(self):
        result = ref.compare(measured=0.01, u_measured=0.0001,
                             mass=2.0, u_mass=0.001,
                             radius=0.1, u_radius=0.0001)
        self.assertAlmostEqual(result["reference_inertia_kg_m2"], 0.01, places=14)
        self.assertTrue(result["compatible_within_threshold"])
        self.assertAlmostEqual(result["percent_error"], 0.0, places=10)

    def test_clear_disagreement_fails(self):
        result = ref.compare(measured=0.015, u_measured=0.00001,
                             mass=2.0, u_mass=0.001,
                             radius=0.1, u_radius=0.0001)
        self.assertFalse(result["compatible_within_threshold"])
        self.assertGreater(result["normalized_difference"], 2.0)

    def test_zero_uncertainty_mismatch_stays_valid_json_and_fails(self):
        result = ref.compare(measured=0.011, u_measured=0.0,
                             mass=2.0, u_mass=0.0,
                             radius=0.1, u_radius=0.0)
        self.assertIsNone(result["normalized_difference"])
        self.assertFalse(result["compatible_within_threshold"])

    def test_rejects_invalid_mass(self):
        with self.assertRaisesRegex(ValueError, "mass must be greater than zero"):
            ref.compare(0.01, 0.001, 0.0, 0.001, 0.1, 0.001)


    def test_rejects_reference_inertia_overflow(self):
        with self.assertRaisesRegex(ValueError, "reference inertia is outside the supported numerical range"):
            ref.compare(0.01, 0.001, 2.0, 0.001, 1e308, 0.001)

    def test_rejects_percent_error_overflow(self):
        with self.assertRaisesRegex(ValueError, "comparison difference is outside the supported numerical range"):
            ref.compare(1e308, 0.001, 2.0, 0.001, 0.1, 0.001)

    def test_rejects_zero_underflow_reference_inertia(self):
        with self.assertRaisesRegex(ValueError, "reference inertia is outside the supported numerical range"):
            ref.compare(0.01, 0.001, 2.0, 0.001, 1e-200, 0.0)

    def test_rejects_boolean_numeric_input(self):
        with self.assertRaisesRegex(ValueError, "measured inertia must be a finite number"):
            ref.compare(True, 0.001, 2.0, 0.001, 0.1, 0.001)

    def test_rejects_reference_uncertainty_not_smaller_than_quantity(self):
        with self.assertRaisesRegex(ValueError, "mass standard uncertainty must be smaller"):
            ref.compare(0.01, 0.001, 2.0, 2.0, 0.1, 0.001)

    def test_large_radius_uncertainty_ratio_avoids_intermediate_overflow(self):
        # 2*u_radius would overflow before division even though 2*(u_radius/radius)
        # and the final reference uncertainty remain representable.
        result = ref.compare(
            measured=5e295, u_measured=1e294,
            mass=1e-320, u_mass=0.0,
            radius=1e308, u_radius=9e307,
        )
        self.assertTrue(math.isfinite(result["reference_inertia_kg_m2"]))
        self.assertTrue(math.isfinite(result["reference_standard_uncertainty_kg_m2"]))
        self.assertTrue(math.isfinite(result["combined_standard_uncertainty_kg_m2"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
