#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Compare a baseline-subtracted trifilar result with a known solid-disk reference.

All inertia/mass/radius quantities must use SI units. Uncertainties are standard
uncertainties. The compatibility threshold defaults to 2 combined standard
uncertainties; it is a screening criterion, not proof that systematic errors vanish.
"""
from __future__ import annotations
import argparse
import json
import math
import sys


def finite(value: float, name: str, *, positive: bool = False, nonnegative: bool = False) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a finite number")
    try:
        number = float(value)
    except (OverflowError, TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be a finite number") from exc
    if not math.isfinite(number):
        raise ValueError(f"{name} must be finite")
    if positive and number <= 0:
        raise ValueError(f"{name} must be greater than zero")
    if nonnegative and number < 0:
        raise ValueError(f"{name} cannot be negative")
    return number


def compare(measured: float, u_measured: float, mass: float, u_mass: float,
            radius: float, u_radius: float, coverage_factor: float = 2.0) -> dict:
    measured = finite(measured, "measured inertia", positive=True)
    u_measured = finite(u_measured, "measured standard uncertainty", nonnegative=True)
    mass = finite(mass, "reference disk mass", positive=True)
    u_mass = finite(u_mass, "reference mass standard uncertainty", nonnegative=True)
    radius = finite(radius, "reference disk radius", positive=True)
    u_radius = finite(u_radius, "reference radius standard uncertainty", nonnegative=True)
    coverage_factor = finite(coverage_factor, "coverage factor", positive=True)
    if u_mass >= mass:
        raise ValueError("reference mass standard uncertainty must be smaller than the mass")
    if u_radius >= radius:
        raise ValueError("reference radius standard uncertainty must be smaller than the radius")

    # Multiply in stages so small/large values have the best chance of cancelling
    # before an intermediate square overflows. Reject results outside float range.
    try:
        expected = 0.5 * mass * radius * radius
    except OverflowError as exc:
        raise ValueError("reference inertia is outside the supported numerical range") from exc
    if not math.isfinite(expected) or expected <= 0:
        raise ValueError("reference inertia is outside the supported numerical range")

    relative_reference_uncertainty = math.hypot(u_mass / mass, 2 * (u_radius / radius))
    u_expected = expected * relative_reference_uncertainty
    if not math.isfinite(u_expected):
        raise ValueError("reference uncertainty is outside the supported numerical range")
    u_combined = math.hypot(u_measured, u_expected)
    if not math.isfinite(u_combined):
        raise ValueError("combined uncertainty is outside the supported numerical range")

    difference = abs(measured - expected)
    relative_error = difference / expected
    percent_error = 100 * relative_error
    if not math.isfinite(difference) or not math.isfinite(percent_error):
        raise ValueError("comparison difference is outside the supported numerical range")
    normalized = difference / u_combined if u_combined > 0 else (0.0 if difference == 0 else None)
    if normalized is not None and not math.isfinite(normalized):
        raise ValueError("normalized difference is outside the supported numerical range")
    compatible = (difference == 0) if normalized is None else normalized <= coverage_factor
    return {
        "measured_inertia_kg_m2": measured,
        "measured_standard_uncertainty_kg_m2": u_measured,
        "reference_inertia_kg_m2": expected,
        "reference_standard_uncertainty_kg_m2": u_expected,
        "combined_standard_uncertainty_kg_m2": u_combined,
        "absolute_difference_kg_m2": difference,
        "percent_error": percent_error,
        "normalized_difference": normalized,
        "coverage_factor": coverage_factor,
        "compatible_within_threshold": compatible,
        "interpretation": (
            f"Compatible within {coverage_factor:g} combined standard uncertainties; "
            "this does not rule out unmodelled systematic errors."
            if compatible else
            f"Does not meet the {coverage_factor:g}-combined-standard-uncertainty threshold; "
            "review the model assumptions, setup, inputs, and uncertainty budget."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--measured", type=float, required=True, help="app's baseline-subtracted specimen inertia (kg m^2)")
    parser.add_argument("--u-measured", type=float, required=True, help="app's standard uncertainty (kg m^2)")
    parser.add_argument("--mass", type=float, required=True, help="known solid disk/cylinder mass (kg)")
    parser.add_argument("--u-mass", type=float, required=True, help="mass standard uncertainty (kg)")
    parser.add_argument("--radius", type=float, required=True, help="reference disk radius (m)")
    parser.add_argument("--u-radius", type=float, required=True, help="radius standard uncertainty (m)")
    parser.add_argument("--coverage-factor", type=float, default=2.0, help="combined-uncertainty threshold (default 2)")
    args = parser.parse_args()
    try:
        result = compare(args.measured, args.u_measured, args.mass, args.u_mass,
                         args.radius, args.u_radius, args.coverage_factor)
    except ValueError as exc:
        parser.error(str(exc))
        return 2
    print(json.dumps(result, indent=2))
    return 0 if result["compatible_within_threshold"] else 1


if __name__ == "__main__":
    sys.exit(main())
