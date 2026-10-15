# Experimental validation protocol

The unit tests verify calculation behavior; they do not establish that the equation, geometry, or uncertainty budget matches a physical rig. Do not describe this simulator as experimentally validated until this procedure has been completed with recorded data.

## 1. Confirm the equation matches the apparatus

The current model uses the small-angle relationship

`I = m g R_upper R_lower T^2 / (4 pi^2 H)`

where `H` is the *vertical separation* at rest, and the upper/lower attachment radii are measured from the rotation axis. The generalization to different upper and lower radii assumes three equal-length filaments, the attachment points are aligned in the stated rest configuration, the centre of mass is on the rotation axis, the platform moves nearly as a rigid body, and the oscillation amplitude is small. For equal radii, this reduces to the familiar `I = m g R^2 T^2 / (4 pi^2 H)` form.

Before using measurements, compare the equation and every parameter definition with the lab manual or a trusted reference for the actual geometry. Published trifilar-pendulum formulations often state the symmetric form in terms of a single suspension radius and cable length, and discuss calibration, amplitude, and alignment errors; don't substitute a sloping filament length for vertical separation without re-deriving the formula for that geometry. Reference: Previati (2020), *Large oscillations of the trifilar pendulum: Analytical and experimental study*, https://doi.org/10.1016/j.mechmachtheory.2020.104157. A published open hardware example also describes calibration against objects with known theoretical inertia and repeat measurements: https://pmc.ncbi.nlm.nih.gov/articles/PMC13594614/.

If the actual rig does not meet these assumptions, the validation must stop until the model is adapted. Do not adjust measured inputs just to make the output match an expected result.

## 2. Choose a reference object with known inertia

Use a homogeneous solid disk or cylinder whose axis of rotation is its central symmetry axis, placed securely with its centre of mass on the platform's rotation axis. Measure its mass `m_ref` and radius `a` with calibrated instruments. Its theoretical inertia is

`I_ref = 0.5 * m_ref * a^2`

assuming the mass distribution is that of a uniform solid disk/cylinder. The standard uncertainty from independent mass and radius uncertainties is

`u_ref = I_ref * sqrt((u_m/m_ref)^2 + (2*u_a/a)^2)`.

Do not use this formula for a hollow cylinder, irregular object, or a disk whose axis/reference axis differs from the actual axis without using the appropriate inertia formula and parallel-axis correction.

## 3. Collect data reproducibly

1. Measure and record `H`, upper radius, lower radius, and how each standard uncertainty was determined. Measure vertical separation rather than assuming it equals filament length when upper and lower radii differ.
2. Use a small, repeatable angular displacement (for example, only a few degrees) and avoid pushing the platform during timing. Check that the motion is predominantly rotational and that the object does not slide.
3. Time a stated integer number `N` of full oscillations, preferably enough cycles to reduce reaction-time impact. Repeat the empty platform and loaded platform timing at least five times each.
4. Determine a mean period and an uncertainty that reflects instrument resolution and observed repeatability. Do not treat the stopwatch display resolution alone as the complete uncertainty if repeated times vary more widely.
5. Enter loaded mass as platform + reference object, then enter the empty-platform mass and timing with baseline subtraction enabled. Use the same geometry and axis in both configurations. Preserve raw timings and masses in a separate record/CSV.
6. Save the calculated specimen inertia and its standard uncertainty. Repeat the test with the reference object removed and reinstalled to check setup repeatability.

## 4. Compare measured and theoretical inertia

Let `I_meas` be the baseline-subtracted specimen result and `u_meas` its displayed standard uncertainty. Assuming the reference and measurement uncertainties are independent, compute

`u_combined = sqrt(u_meas^2 + u_ref^2)`

and the normalized difference

`z = abs(I_meas - I_ref) / u_combined`.

As a first-order compatibility check, `z <= 2` is consistent with agreement within approximately two combined standard uncertainties under approximately normal uncertainty assumptions. This is not proof that all systematic errors are absent. Report percent error too:

`percent_error = 100 * abs(I_meas - I_ref) / I_ref`.

For a proper validation report, state the acceptance criterion before examining the result. If it fails, investigate geometry/units, centring, filament asymmetry, amplitude dependence, timing method, platform flexibility, mass uncertainty, and the validity of baseline subtraction. Do not increase input uncertainties after seeing a failed result merely to force a pass.

A standard-library helper calculates this comparison and returns a nonzero exit code on a failed threshold. Example command (illustrative numbers only; substitute your measured values):

```bash
python tools/compare_reference.py --measured 0.01 --u-measured 0.0001 --mass 2 --u-mass 0.001 --radius 0.1 --u-radius 0.0001
```

The helper expects SI units and standard uncertainties. It assumes a uniform solid disk/cylinder with its axis through the centre; do not use its reference formula for an object with a different shape or axis.

## 5. Repeatability and record keeping

Keep at least five raw timing runs per configuration, instrument identifiers/resolution, date, geometry, oscillation amplitude, reference-object dimensions/mass, calculated `I_ref` and `u_ref`, every measured result, the normalized difference, and any excluded run with its reason. Export the app's CSV for trial records, but keep the raw timing log as well.

## Acceptance status

- **Calculation regression tests passed:** software matches its specified equation for test cases.
- **Reference-object comparison passed:** only after the physical trial agrees with the preregistered criterion and the model assumptions are confirmed.
- **Repeatability passed:** only after repeated physical trials meet a criterion declared in advance.

Until the latter two steps are performed on the intended apparatus, describe this as an independently implemented educational model with numerical tests, not as a validated instrument.


**Mass consistency check:** The loaded mass must include the platform plus specimen and must be greater than the empty-platform mass when baseline subtraction is enabled. The model rejects a run that violates this requirement.
