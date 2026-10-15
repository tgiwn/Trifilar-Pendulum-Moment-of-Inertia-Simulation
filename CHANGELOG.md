## Licensing

- Added the Apache License 2.0 text and SPDX identifiers for project-authored implementation and test code. Confirm you have the rights to license all included material before publishing.

# Changelog

## Independent prototype completion pass

- Split calculation logic into a pure `model.js` module so it can be independently tested.
- Added timing from total elapsed time and oscillation count.
- Added empty-platform baseline subtraction.
- Added first-order standard-uncertainty propagation for mass, timing, and geometry.
- Treated repeated geometry uncertainties as correlated when calculating the baseline-subtracted specimen inertia.
- Added save/remove trial rows and CSV export including inputs and result uncertainty.
- Added input validation, status messages, responsive styling, a test suite, and GitHub Actions checks.
- Clearly marked starting values as illustrative, not experimental measurements.
- Added a reference-object comparison helper and a documented calibration procedure.
- Cleared displayed result values after failed recalculation to avoid leaving stale numbers visible beside an error status.
- Tightened the pure calculation model to reject non-number values and non-boolean baseline flags rather than silently coercing them.

The application is still an idealized educational model; it has not been validated against a physical apparatus.


### Additional final-audit fixes (2026-10-13)

- Reject malformed geometry/measurement objects instead of allowing low-level type errors.
- Reject non-finite derived periods, inertias, and uncertainties rather than returning `Infinity`/`NaN`.
- Require the oscillation count to be a safe integer.
- Add regression tests for malformed objects, numerical overflow, and unsafe oscillation counts.
- Remove generated Python bytecode from release ZIPs.

### Additional thorough audit (2026-10-14)

- Reject non-finite specimen uncertainty from the combination of loaded and baseline runs, including arithmetic overflow in the combined variance.
- Harden the known-reference comparison helper against boolean input, unsupported numeric ranges, underflowed reference inertia, and non-finite percentage/normalized differences.
- Stop scheduling animation frames while the schematic animation is paused to avoid unnecessary periodic redraws.
- Clarify that individual geometry parameter uncertainties are assumed independent, even though the same geometry is shared between runs.

### Input-consistency and numerical-stability pass (2026-10-14)

- Reject baseline-subtracted runs unless the loaded assembly mass exceeds the empty-platform mass, as required by the input definitions.
- Use `Math.hypot` to combine uncertainty terms without avoidable overflow from squaring intermediate values.
- Divide absolute uncertainty by inertia before scaling to percent to avoid overflow from multiplication order.
- Add regression coverage for inconsistent mass inputs and large finite uncertainties.

### Final input and numerical-stability verification (2026-10-14)

- Reject baseline subtraction when the loaded assembly mass is not greater than the empty-platform mass.
- Combine uncertainty terms with `Math.hypot` to avoid avoidable overflow from squaring intermediate terms.
- Calculate relative uncertainty percentages in a numerically safer operation order.
- Add large-finite-value regression checks and cross-check propagated uncertainties against finite-difference derivatives.

### Trial-quality validation (2026-10-14)

- Prevented saving a baseline-subtracted trial when its calculated specimen inertia is non-positive; preserve a clear warning instead of reporting success.

### GitHub Actions runtime compatibility (2026-10-14)

- Upgraded checkout and setup-node actions to current Node 24-compatible major releases following GitHub's Node 20 runner removal.

### Fifteen-pass release audit (2026-10-14)

- Reorder uncertainty ratios to avoid intermediate overflow in the known-reference comparison helper.
- Add an extreme-but-representable numerical regression case.
- Update the browser test workflow to target Node.js 24 and synchronize the combined bundle with the individual repositories.


### Repository hygiene follow-up (2026-10-14)

- Ignore local Python/JavaScript coverage artifacts (`.coverage`, `htmlcov/`, `coverage/`, and `.nyc_output/`) so generated test metadata is not accidentally committed.

### Low-signal estimate caution (2026-10-14)

- Warn when a positive inertia estimate is no larger than one standard uncertainty, so weakly resolved measurements are not shown as an unqualified success.
- Preserve the warning when such a trial is saved; saving the data remains possible for later review.
- Add browser smoke coverage for calculating and saving a low-signal specimen result.
