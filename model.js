// SPDX-License-Identifier: Apache-2.0
/* Pure calculation functions for the trifilar pendulum educational prototype. */
(function (root, factory) {
  const model = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  if (root) root.TrifilarModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const G = 9.80665; // Standard gravity, m/s^2.
  const FOUR_PI_SQUARED = 4 * Math.PI * Math.PI;

  function finiteNumber(value, label, { positive = false, nonNegative = false } = {}) {
    // The UI already parses fields into numbers. Reject null/blank/boolean values
    // rather than silently coercing them to zero via Number(value).
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number.`);
    }
    const number = value;
    if (positive && number <= 0) throw new Error(`${label} must be greater than zero.`);
    if (nonNegative && number < 0) throw new Error(`${label} cannot be negative.`);
    return number;
  }

  function requireObject(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label} must be an object.`);
    }
    return value;
  }

  function validateGeometry(geometry) {
    requireObject(geometry, 'Geometry');
    const h = finiteNumber(geometry.separation, 'Vertical separation', { positive: true });
    const upperRadius = finiteNumber(geometry.upperRadius, 'Upper attachment radius', { positive: true });
    const lowerRadius = finiteNumber(geometry.lowerRadius, 'Lower attachment radius', { positive: true });
    const separationUncertainty = finiteNumber(geometry.separationUncertainty, 'Separation uncertainty', { nonNegative: true });
    const upperRadiusUncertainty = finiteNumber(geometry.upperRadiusUncertainty, 'Upper-radius uncertainty', { nonNegative: true });
    const lowerRadiusUncertainty = finiteNumber(geometry.lowerRadiusUncertainty, 'Lower-radius uncertainty', { nonNegative: true });
    if (separationUncertainty >= h) throw new Error('Separation uncertainty must be smaller than the vertical separation.');
    if (upperRadiusUncertainty >= upperRadius) throw new Error('Upper-radius uncertainty must be smaller than the upper radius.');
    if (lowerRadiusUncertainty >= lowerRadius) throw new Error('Lower-radius uncertainty must be smaller than the lower radius.');
    return { separation: h, upperRadius, lowerRadius, separationUncertainty, upperRadiusUncertainty, lowerRadiusUncertainty };
  }

  function validateMeasurement(measurement, label) {
    requireObject(measurement, `${label} measurement`);
    const mass = finiteNumber(measurement.mass, `${label} mass`, { positive: true });
    const massUncertainty = finiteNumber(measurement.massUncertainty, `${label} mass uncertainty`, { nonNegative: true });
    const elapsedTime = finiteNumber(measurement.elapsedTime, `${label} timed duration`, { positive: true });
    const elapsedTimeUncertainty = finiteNumber(measurement.elapsedTimeUncertainty, `${label} timing uncertainty`, { nonNegative: true });
    const oscillations = finiteNumber(measurement.oscillations, `${label} oscillation count`, { positive: true });
    if (!Number.isSafeInteger(oscillations)) throw new Error(`${label} oscillation count must be a safe whole number.`);
    if (massUncertainty >= mass) throw new Error(`${label} mass uncertainty must be smaller than the mass.`);
    if (elapsedTimeUncertainty >= elapsedTime) throw new Error(`${label} timing uncertainty must be smaller than the timed duration.`);
    const period = elapsedTime / oscillations;
    const periodUncertainty = elapsedTimeUncertainty / oscillations;
    if (!Number.isFinite(period) || period <= 0 || !Number.isFinite(periodUncertainty)) {
      throw new Error(`${label} period is outside the supported numerical range.`);
    }
    return { mass, massUncertainty, elapsedTime, elapsedTimeUncertainty, oscillations, period, periodUncertainty };
  }

  function geometryRelativeVariance(geometry) {
    return (geometry.upperRadiusUncertainty / geometry.upperRadius) ** 2
      + (geometry.lowerRadiusUncertainty / geometry.lowerRadius) ** 2
      + (geometry.separationUncertainty / geometry.separation) ** 2;
  }

  function factorFor(geometry) {
    return G * geometry.upperRadius * geometry.lowerRadius
      / (FOUR_PI_SQUARED * geometry.separation);
  }

  function calculateAssembly(geometryInput, measurementInput, label = 'Loaded assembly') {
    const geometry = validateGeometry(geometryInput);
    const measurement = validateMeasurement(measurementInput, label);
    const factor = factorFor(geometry);
    const inertia = factor * measurement.mass * measurement.period ** 2;
    if (!Number.isFinite(inertia) || inertia <= 0) {
      throw new Error('Calculated inertia is outside the supported numerical range; check input values and SI units.');
    }
    // Express sensitivity terms as relative fractions of inertia and combine with
    // Math.hypot, avoiding overflow from squaring large-but-finite uncertainties.
    const massTerm = inertia * (measurement.massUncertainty / measurement.mass);
    const periodTerm = inertia * (2 * (measurement.periodUncertainty / measurement.period));
    const geometryTerm = inertia * Math.sqrt(geometryRelativeVariance(geometry));
    const standardUncertainty = Math.hypot(massTerm, periodTerm, geometryTerm);
    if (!Number.isFinite(standardUncertainty)) {
      throw new Error('Calculated standard uncertainty is outside the supported numerical range; check input values and SI units.');
    }
    const relativeStandardUncertaintyPercent = 100 * (standardUncertainty / inertia);
    if (!Number.isFinite(relativeStandardUncertaintyPercent)) {
      throw new Error('Calculated relative uncertainty is outside the supported numerical range; check input values and SI units.');
    }
    return { ...measurement, inertia, standardUncertainty, relativeStandardUncertaintyPercent };
  }

  function calculate(input) {
    if (!input || typeof input !== 'object') throw new Error('Calculation input must be an object.');
    if (typeof input.baselineEnabled !== 'boolean') {
      throw new Error('Baseline subtraction setting must be true or false.');
    }
    const geometry = validateGeometry(input.geometry);
    const loaded = calculateAssembly(geometry, input.loaded, 'Loaded assembly');
    const baselineEnabled = input.baselineEnabled;
    if (!baselineEnabled) {
      return { geometry, loaded, baseline: null, specimen: { ...loaded, label: 'Loaded assembly (no baseline subtraction)' }, baselineEnabled: false };
    }

    const baseline = calculateAssembly(geometry, input.baseline, 'Empty platform');
    if (loaded.mass <= baseline.mass) {
      throw new Error('Loaded assembly mass must be greater than empty-platform mass when baseline subtraction is enabled.');
    }
    // Geometry uncertainties are common to both runs. They are therefore propagated
    // against the difference, rather than incorrectly counted twice as independent.
    const specimenInertia = loaded.inertia - baseline.inertia;
    if (!Number.isFinite(specimenInertia)) {
      throw new Error('Calculated specimen inertia is outside the supported numerical range; check input values and SI units.');
    }
    const loadedMassTerm = loaded.inertia * (loaded.massUncertainty / loaded.mass);
    const loadedPeriodTerm = loaded.inertia * (2 * (loaded.periodUncertainty / loaded.period));
    const baselineMassTerm = baseline.inertia * (baseline.massUncertainty / baseline.mass);
    const baselinePeriodTerm = baseline.inertia * (2 * (baseline.periodUncertainty / baseline.period));
    const geometryTerm = specimenInertia * Math.sqrt(geometryRelativeVariance(geometry));
    // Math.hypot combines terms without overflowing their squares prematurely.
    const standardUncertainty = Math.hypot(
      loadedMassTerm, loadedPeriodTerm, baselineMassTerm, baselinePeriodTerm, geometryTerm,
    );
    if (!Number.isFinite(standardUncertainty)) {
      throw new Error('Calculated specimen standard uncertainty is outside the supported numerical range; check input values and SI units.');
    }
    const relativeStandardUncertaintyPercent = specimenInertia > 0
      ? 100 * (standardUncertainty / specimenInertia)
      : null;
    if (relativeStandardUncertaintyPercent !== null && !Number.isFinite(relativeStandardUncertaintyPercent)) {
      throw new Error('Calculated relative specimen uncertainty is outside the supported numerical range; check input values and SI units.');
    }
    const specimen = {
      inertia: specimenInertia,
      standardUncertainty,
      relativeStandardUncertaintyPercent,
      period: loaded.period,
      label: 'Specimen (baseline-subtracted)',
    };
    return { geometry, loaded, baseline, specimen, baselineEnabled: true };
  }

  return Object.freeze({ G, validateGeometry, validateMeasurement, calculateAssembly, calculate });
});
