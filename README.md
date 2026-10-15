# Trifilar Pendulum Lab — Independent Educational Prototype

A self-contained browser app for exploring an idealized trifilar-pendulum moment-of-inertia calculation. It is an independently written educational prototype, **not the original source code associated with a software registration certificate**.

## Features

- Responsive browser-based interface and illustrative animated apparatus sketch
- Entry of upper/lower attachment radii, vertical separation, mass, elapsed timing, oscillation count, and standard measurement uncertainties
- Calculation of loaded assembly inertia from the measured mean period
- Optional empty-platform baseline subtraction to estimate specimen inertia
- First-order uncertainty propagation for mass, timing, and geometry inputs
- Correct treatment of shared geometry uncertainties as correlated between loaded and baseline runs
- Save/remove trial rows and export the measurement inputs and calculated results to CSV
- A pure calculation module with Node.js unit tests and a standard-library Python helper for comparing a measured result with a known solid-disk reference; no third-party runtime dependencies

## Run locally

Open `index.html` in a current web browser. No installation or local web server is required. If browser security policy prevents local use in a particular environment, serve the folder with Python:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Model

The app uses the small-angle idealized relationship

`I = m g R r T² / (4 π² H)`

where `m` is the total suspended mass for a run, `g = 9.80665 m/s²`, `R` and `r` are the upper and lower attachment radii, `H` is the vertical separation between the attachment planes in the resting configuration, and `T = elapsed time / number of oscillations`. For equal upper and lower radii (`R = r`), the equation reduces to the familiar symmetric-geometry relationship proportional to `R²`.

When baseline subtraction is enabled:

`I_specimen = I_loaded − I_empty platform`

The loaded mass must include the platform plus specimen; the baseline mass is the empty suspended platform assembly. The baseline should be measured with the same geometry and apparatus arrangement. When baseline subtraction is enabled, the app rejects inputs where the loaded mass is not greater than the empty-platform mass.

### Uncertainty treatment

The interface accepts standard uncertainties for geometry, mass, and elapsed time. The oscillation count is treated as exact, so `u(T) = u(elapsed time) / N`. First-order propagation assumes independent mass/timing inputs and treats the same measured geometry as shared (correlated) between loaded and empty-platform runs. Baseline-subtracted calculations require the loaded mass (platform plus specimen) to exceed the empty-platform mass. Uncertainty terms are combined with a numerically stable hypotenuse calculation to avoid intermediate square overflow. Geometry uncertainty is therefore propagated against the inertia difference for the specimen result, rather than counted twice as if the two geometry measurements were independent. The displayed uncertainty is a **standard uncertainty**, not a 95% confidence interval; unmodelled systematic effects are not included.

The model treats the standard uncertainties of `H`, `R`, and `r` as mutually independent, while each geometry parameter is shared (and therefore correlated) between loaded and baseline runs. If the geometry measurements have covariance, the present model does not include covariance terms. The common symmetric trifilar relation and platform-subtraction method are described in open research literature, for example [An open-source camera-based trifilar pendulum setup for measuring mass moment of inertia of small satellites](https://pmc.ncbi.nlm.nih.gov/articles/PMC13594614/). The product `R·r` extension here assumes a symmetric three-filament arrangement with attachment points aligned radially at rest, equal filaments, small oscillations, and `H` defined as vertical separation. Verify the equation and parameter definitions against the actual lab apparatus/manual before using experimental results.

## Example values are not measurements

The starting values reproduce an illustrative numerical example: loaded assembly inertia approximately `0.0024871649 kg·m²`, empty-platform inertia approximately `0.0006367142 kg·m²`, and baseline-subtracted specimen inertia approximately `0.0018504507 kg·m²`. They are provided for regression testing and must not be presented as experimental measurements. The starting uncertainty values are also illustrative; replace them with values justified by instrument specifications, calibration, and the measurement procedure.

## Tests

Requires Node.js 18+ for the test runner (the app itself runs in a browser without Node.js):

```bash
node --check model.js
node --check app.js
node tests/test_model.js
python -m unittest discover -s tests -v
```

The tests verify the example values to tight numeric tolerances, baseline on/off behavior, uncertainty propagation response, and rejection of invalid geometry, non-safe-integer oscillation counts, malformed inputs, inconsistent loaded/baseline masses, and unsupported numeric inputs. A large finite-value regression also checks that the uncertainty and relative-percentage calculations avoid avoidable intermediate overflow.

## Limitations

- The animation is a schematic and does not numerically integrate the apparatus motion.
- No measurement from a physical rig has been used to validate this implementation yet. Follow [`docs/EXPERIMENTAL_VALIDATION.md`](docs/EXPERIMENTAL_VALIDATION.md) and compare with a known-inertia calibration object before describing the model as experimentally validated.
- The simple model assumes small-amplitude motion, rigid parts, equal-length three-filament suspension with aligned upper/lower attachment geometry, and negligible friction/damping. The upper/lower-radius product form should be checked against the lab manual for the actual rig before physical use.
- Centre-of-mass offsets, filament mass/elasticity, platform flexure, geometric imperfections, and calibration corrections are not modelled.
- Trial rows live only in the current browser tab until exported. Use CSV export for record keeping.
- This is an educational prototype, not a validated scientific instrument. Confirm the model against a trusted lab manual and independent reference calculations before research use.

## Copyright and provenance

This independent prototype is not the registered software's original source code. The supplied certificate title is 三线扭摆法测转动惯量虚拟仿真软件 V1.0 (registration number stated on the supplied certificate: 2026SR0119932). The certificate names 天津职业技术师范大学（中国职业培训指导教师进修中心） as the copyright holder. This repository does not imply ownership of that registered work or permission to redistribute its original source/assets. Confirm authorization before public release and describe this implementation accurately in applications.


## License

The independently written code and documentation in this repository are licensed under the [Apache License, Version 2.0](LICENSE), subject to the publisher having the rights to grant that license. The license does not apply to third-party material or grant rights to any separately registered software, institutional names, or logos. See [COPYRIGHT.md](COPYRIGHT.md) for provenance and scope.
