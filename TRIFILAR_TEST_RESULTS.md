# Test Summary — Trifilar Pendulum Simulation

**Audit date:** 14 October 2026  
**Project type:** Independent educational prototype

This record summarizes the calculation regression tests, reference comparisons, and browser interaction checks performed on the audited release.

## Test results

- `node --check model.js`: passed.
- `node --check app.js`: passed.
- `node tests/test_model.js`: passed.
- `python -m unittest discover -s tests -v`: 10 Python reference-comparison tests passed.
- A deterministic 200-case finite-difference comparison of first-order uncertainty propagation passed; the maximum relative difference in that sample was approximately `8.71e-11`.
- Browser interaction smoke checks covered calculation, invalid-input/error clearing, save/remove, CSV export and column alignment, refusal to save a non-positive baseline-subtracted result, a caution for a positive result no larger than one standard uncertainty (including after saving), baseline toggling, mobile-width layout, and animation pause/resume. No browser errors or horizontal overflow were observed during those checks.

## Validation scope and next steps

The results support the calculation and interface behaviors exercised by these tests. Before using the simulation to report experimental accuracy, confirm that the equation and geometry assumptions match the intended apparatus and lab procedure, then compare results against a reference object with known moment of inertia using recorded measurements from the physical rig.

The current uncertainty model does not include all possible systematic errors or geometry covariance. Retain raw mass, timing, and geometry data; report theoretical and measured values with their uncertainties; and document calibration conditions. See [`EXPERIMENTAL_VALIDATION.md`](EXPERIMENTAL_VALIDATION.md) for the procedure. Values shown in the app are illustrative regression values, not experimental measurements.
