// SPDX-License-Identifier: Apache-2.0
'use strict';

const assert = require('node:assert/strict');
const Model = require('../model.js');

const example = {
  geometry: {
    separation: 0.998749,
    separationUncertainty: 0.001,
    upperRadius: 0.05,
    upperRadiusUncertainty: 0.0008,
    lowerRadius: 0.025,
    lowerRadiusUncertainty: 0.0004,
  },
  loaded: {
    mass: 2.0,
    massUncertainty: 0.005,
    elapsedTime: 20,
    elapsedTimeUncertainty: 0.02,
    oscillations: 10,
  },
  baselineEnabled: true,
  baseline: {
    mass: 0.8,
    massUncertainty: 0.005,
    elapsedTime: 16,
    elapsedTimeUncertainty: 0.02,
    oscillations: 10,
  },
};

function near(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`);
}

const result = Model.calculate(example);
near(result.loaded.inertia, 0.0024871649072142547, 1e-14);
near(result.baseline.inertia, 0.0006367142162468493, 1e-14);
near(result.specimen.inertia, 0.0018504506909674053, 1e-14);
near(result.loaded.standardUncertainty, 0.00005689318408153553, 1e-14);
near(result.baseline.standardUncertainty, 0.000015044723044295125, 1e-14);
near(result.specimen.standardUncertainty, 0.000042876368175567535, 1e-14);
near(result.specimen.relativeStandardUncertaintyPercent, 2.3170770442497988, 1e-10);
assert.ok(result.loaded.standardUncertainty > 0);
assert.ok(result.baseline.standardUncertainty > 0);
assert.ok(result.specimen.standardUncertainty > 0);
assert.ok(result.specimen.relativeStandardUncertaintyPercent > 0);

// Large but finite results must not overflow merely because the percentage formula
// multiplies the absolute uncertainty by 100 before dividing by the inertia.
const largeAssembly = Model.calculateAssembly({
  separation: 1, separationUncertainty: 0,
  upperRadius: 1, upperRadiusUncertainty: 0,
  lowerRadius: 1, lowerRadiusUncertainty: 0,
}, {
  mass: 4e307, massUncertainty: 4e306,
  elapsedTime: 1, elapsedTimeUncertainty: 0.1, oscillations: 1,
});
assert.ok(Number.isFinite(largeAssembly.inertia));
assert.ok(Number.isFinite(largeAssembly.standardUncertainty));
assert.ok(Number.isFinite(largeAssembly.relativeStandardUncertaintyPercent));
assert.ok(largeAssembly.relativeStandardUncertaintyPercent > 0);

const withoutBaseline = Model.calculate({ ...example, baselineEnabled: false });
near(withoutBaseline.specimen.inertia, withoutBaseline.loaded.inertia, 1e-14);
assert.equal(withoutBaseline.baseline, null);

const largerTimingUncertainty = Model.calculate({
  ...example,
  loaded: { ...example.loaded, elapsedTimeUncertainty: 0.2 },
});
assert.ok(largerTimingUncertainty.specimen.standardUncertainty > result.specimen.standardUncertainty);

assert.throws(() => Model.calculate({
  ...example,
  geometry: { ...example.geometry, separation: 0 },
}), /Vertical separation must be greater than zero/);
assert.throws(() => Model.calculate({
  ...example,
  loaded: { ...example.loaded, oscillations: 2.5 },
}), /oscillation count must be a safe whole number/);
assert.throws(() => Model.calculate({
  ...example,
  loaded: { ...example.loaded, oscillations: 1e20 },
}), /oscillation count must be a safe whole number/);
assert.throws(() => Model.calculate({
  ...example,
  baseline: { ...example.baseline, massUncertainty: 0.8 },
}), /mass uncertainty must be smaller than the mass/);
assert.throws(() => Model.calculate({
  ...example,
  loaded: { ...example.loaded, massUncertainty: null },
}), /mass uncertainty must be a finite number/);
assert.throws(() => Model.calculate({
  ...example,
  loaded: { ...example.loaded, massUncertainty: '' },
}), /mass uncertainty must be a finite number/);
assert.throws(() => Model.calculate({ ...example, baselineEnabled: 'false' }),
  /Baseline subtraction setting must be true or false/);


assert.throws(() => Model.calculate({ ...example, geometry: null }), /Geometry must be an object/);
assert.throws(() => Model.calculate({ ...example, loaded: [] }), /Loaded assembly measurement must be an object/);
assert.throws(() => Model.calculate({
  ...example,
  baselineEnabled: false,
  geometry: { ...example.geometry, upperRadius: 1e308, upperRadiusUncertainty: 0 },
}), /Calculated inertia is outside the supported numerical range/);


// Relative uncertainty terms are combined with Math.hypot: their individual values
// and final combined uncertainty remain finite even though naively squaring terms
// would overflow IEEE-754 arithmetic.
const largeFinite = Model.calculate({
  geometry: {
    separation: 1, separationUncertainty: 0.9,
    upperRadius: 1, upperRadiusUncertainty: 0.9,
    lowerRadius: 1, lowerRadiusUncertainty: 0.9,
  },
  loaded: { mass: 2e154, massUncertainty: 1.8e154, elapsedTime: 1,
    elapsedTimeUncertainty: 0.9, oscillations: 1 },
  baselineEnabled: true,
  baseline: { mass: 1.9e154, massUncertainty: 1.71e154, elapsedTime: 1,
    elapsedTimeUncertainty: 0.9, oscillations: 1 },
});
assert.ok(Number.isFinite(largeFinite.specimen.inertia));
assert.ok(Number.isFinite(largeFinite.specimen.standardUncertainty));

assert.throws(() => Model.calculate({
  ...example,
  loaded: { ...example.loaded, mass: example.baseline.mass },
}), /Loaded assembly mass must be greater than empty-platform mass/);
assert.throws(() => Model.calculate({
  ...example,
  loaded: { ...example.loaded, mass: 0.7 },
}), /Loaded assembly mass must be greater than empty-platform mass/);

console.log('All trifilar calculation tests passed.');
