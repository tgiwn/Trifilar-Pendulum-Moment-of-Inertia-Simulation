// SPDX-License-Identifier: Apache-2.0
'use strict';

const $ = (id) => document.getElementById(id);
const trials = [];
let latest = null;
let latestInputs = null;
let animationRunning = true;
let phase = 0;
let animationFrameHandle = null;

function readNumber(id) {
  const element = $(id);
  if (element.value.trim() === '') throw new Error(`${element.labels?.[0]?.textContent || id} is required.`);
  return Number(element.value);
}

function gatherInputs() {
  return {
    geometry: {
      separation: readNumber('separation'),
      separationUncertainty: readNumber('separationUncertainty'),
      upperRadius: readNumber('upperRadius'),
      upperRadiusUncertainty: readNumber('upperRadiusUncertainty'),
      lowerRadius: readNumber('lowerRadius'),
      lowerRadiusUncertainty: readNumber('lowerRadiusUncertainty'),
    },
    loaded: {
      mass: readNumber('loadedMass'),
      massUncertainty: readNumber('loadedMassUncertainty'),
      elapsedTime: readNumber('loadedElapsedTime'),
      elapsedTimeUncertainty: readNumber('loadedTimeUncertainty'),
      oscillations: readNumber('loadedOscillations'),
    },
    baselineEnabled: $('baselineEnabled').checked,
    baseline: $('baselineEnabled').checked ? {
      mass: readNumber('baselineMass'),
      massUncertainty: readNumber('baselineMassUncertainty'),
      elapsedTime: readNumber('baselineElapsedTime'),
      elapsedTimeUncertainty: readNumber('baselineTimeUncertainty'),
      oscillations: readNumber('baselineOscillations'),
    } : null,
  };
}

function fmt(value, digits = 8) {
  if (!Number.isFinite(value)) return '—';
  return Math.abs(value) >= 1e-7 ? value.toFixed(digits) : value.toExponential(3);
}

function fmtInertia(value) {
  return `${fmt(value)} kg·m²`;
}

function showAssembly(result, valueId, uncertaintyId) {
  $(valueId).textContent = fmtInertia(result.inertia);
  $(uncertaintyId).textContent = `Standard uncertainty: ±${fmt(result.standardUncertainty)} kg·m²`;
}

function clearRenderedResults() {
  $('loadedResult').textContent = '—';
  $('loadedUncertaintyResult').textContent = 'Standard uncertainty: —';
  $('baselineResult').textContent = '—';
  $('baselineUncertaintyResult').textContent = 'Standard uncertainty: —';
  $('baselineResultCard').hidden = !$('baselineEnabled').checked;
  $('specimenLabel').textContent = $('baselineEnabled').checked
    ? 'Specimen inertia (baseline-subtracted)'
    : 'Loaded assembly inertia (no subtraction)';
  $('specimenResult').textContent = '—';
  $('specimenUncertaintyResult').textContent = 'Standard uncertainty: —';
  $('relativeUncertaintyResult').textContent = 'Relative standard uncertainty: —';
}

function calculateAndRender() {
  try {
    const inputs = gatherInputs();
    const result = window.TrifilarModel.calculate(inputs);
    latest = result;
    latestInputs = inputs;
    showAssembly(result.loaded, 'loadedResult', 'loadedUncertaintyResult');
    $('baselineResultCard').hidden = !result.baselineEnabled;
    if (result.baseline) {
      showAssembly(result.baseline, 'baselineResult', 'baselineUncertaintyResult');
    } else {
      $('baselineResult').textContent = 'Not subtracted';
      $('baselineUncertaintyResult').textContent = 'Baseline subtraction is disabled';
    }
    $('specimenLabel').textContent = result.baselineEnabled ? 'Specimen inertia (baseline-subtracted)' : 'Loaded assembly inertia (no subtraction)';
    $('specimenResult').textContent = fmtInertia(result.specimen.inertia);
    $('specimenUncertaintyResult').textContent = `Standard uncertainty: ±${fmt(result.specimen.standardUncertainty)} kg·m²`;
    $('relativeUncertaintyResult').textContent = result.specimen.relativeStandardUncertaintyPercent === null
      ? 'Relative standard uncertainty: not meaningful for a non-positive estimate'
      : `Relative standard uncertainty: ${result.specimen.relativeStandardUncertaintyPercent.toFixed(2)}%`;
    if (result.baselineEnabled && result.specimen.inertia <= 0) {
      $('status').textContent = 'Calculated, but the specimen estimate is non-positive. Check that the masses and timing runs describe the same apparatus and that the baseline is valid.';
      $('status').className = 'status warning';
    } else if (result.specimen.inertia > 0 && result.specimen.standardUncertainty >= result.specimen.inertia) {
      $('status').textContent = 'Caution: the positive inertia estimate is no larger than one standard uncertainty, so it is poorly resolved. Review repeatability, baseline measurements, and the uncertainty budget before interpreting it.';
      $('status').className = 'status warning';
    } else {
      $('status').textContent = 'Calculation complete. These results are based on the displayed inputs and idealized model assumptions.';
      $('status').className = 'status success';
    }
    return true;
  } catch (error) {
    latest = null;
    latestInputs = null;
    clearRenderedResults();
    $('status').textContent = error instanceof Error ? error.message : String(error);
    $('status').className = 'status error';
    return false;
  }
}

function renderTrials() {
  const body = $('trials');
  body.replaceChildren();
  if (!trials.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 7;
    cell.textContent = 'No trials saved yet.';
    return;
  }
  trials.forEach((trial, index) => {
    const row = body.insertRow();
    const cells = [
      String(index + 1),
      trial.savedAt,
      fmt(trial.result.loaded.period, 5),
      fmt(trial.result.loaded.inertia),
      fmt(trial.result.specimen.inertia),
      fmt(trial.result.specimen.standardUncertainty),
    ];
    cells.forEach((value) => { row.insertCell().textContent = value; });
    const actionCell = row.insertCell();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'delete';
    button.textContent = 'Remove';
    button.setAttribute('aria-label', `Remove trial ${index + 1}`);
    button.addEventListener('click', () => {
      trials.splice(index, 1);
      renderTrials();
    });
    actionCell.appendChild(button);
  });
}

function saveTrial() {
  if (!calculateAndRender()) return;
  // A non-positive baseline-subtracted inertia indicates inconsistent/noisy data;
  // keep the calculation visible for diagnosis, but do not mark it as a saved trial.
  if (latest.baselineEnabled && latest.specimen.inertia <= 0) {
    $('status').textContent = 'Trial not saved: the baseline-subtracted specimen estimate is non-positive. Check the timing runs, masses, and baseline configuration.';
    $('status').className = 'status warning';
    return;
  }
  const poorlyResolved = latest.specimen.inertia > 0
    && latest.specimen.standardUncertainty >= latest.specimen.inertia;
  trials.push({ savedAt: new Date().toISOString(), inputs: structuredClone(latestInputs), result: structuredClone(latest) });
  renderTrials();
  if (poorlyResolved) {
    $('status').textContent = `Trial ${trials.length} saved, but caution: the positive estimate is no larger than one standard uncertainty.`;
    $('status').className = 'status warning';
  } else {
    $('status').textContent = `Trial ${trials.length} saved in this browser tab.`;
    $('status').className = 'status success';
  }
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCSV() {
  if (!trials.length) {
    $('status').textContent = 'Save at least one trial before exporting CSV.';
    $('status').className = 'status warning';
    return;
  }
  const columns = [
    'saved_at_utc', 'baseline_subtraction_enabled', 'vertical_separation_m', 'separation_standard_uncertainty_m',
    'upper_radius_m', 'upper_radius_standard_uncertainty_m', 'lower_radius_m', 'lower_radius_standard_uncertainty_m',
    'loaded_mass_kg', 'loaded_mass_standard_uncertainty_kg', 'loaded_elapsed_time_s',
    'loaded_time_standard_uncertainty_s', 'loaded_oscillations', 'loaded_period_s',
    'baseline_mass_kg', 'baseline_mass_standard_uncertainty_kg', 'baseline_elapsed_time_s',
    'baseline_time_standard_uncertainty_s', 'baseline_oscillations', 'baseline_period_s',
    'loaded_inertia_kg_m2', 'loaded_standard_uncertainty_kg_m2', 'baseline_inertia_kg_m2',
    'baseline_standard_uncertainty_kg_m2', 'specimen_inertia_kg_m2', 'specimen_standard_uncertainty_kg_m2',
    'specimen_relative_standard_uncertainty_percent',
  ];
  const rows = [columns];
  trials.forEach((trial) => {
    const i = trial.inputs;
    const r = trial.result;
    rows.push([
      trial.savedAt, i.baselineEnabled, i.geometry.separation, i.geometry.separationUncertainty,
      i.geometry.upperRadius, i.geometry.upperRadiusUncertainty, i.geometry.lowerRadius, i.geometry.lowerRadiusUncertainty,
      i.loaded.mass, i.loaded.massUncertainty, i.loaded.elapsedTime, i.loaded.elapsedTimeUncertainty,
      i.loaded.oscillations, r.loaded.period,
      i.baselineEnabled ? i.baseline.mass : '', i.baselineEnabled ? i.baseline.massUncertainty : '',
      i.baselineEnabled ? i.baseline.elapsedTime : '', i.baselineEnabled ? i.baseline.elapsedTimeUncertainty : '',
      i.baselineEnabled ? i.baseline.oscillations : '', r.baseline ? r.baseline.period : '',
      r.loaded.inertia, r.loaded.standardUncertainty, r.baseline ? r.baseline.inertia : '',
      r.baseline ? r.baseline.standardUncertainty : '', r.specimen.inertia,
      r.specimen.standardUncertainty, r.specimen.relativeStandardUncertaintyPercent ?? '',
    ]);
  });
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'trifilar-trials.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = `Exported ${trials.length} trial(s) to CSV.`;
  $('status').className = 'status success';
}

$('calcBtn').addEventListener('click', calculateAndRender);
$('trialBtn').addEventListener('click', saveTrial);
$('csvBtn').addEventListener('click', exportCSV);
$('baselineEnabled').addEventListener('change', () => {
  const enabled = $('baselineEnabled').checked;
  $('baselineFields').querySelectorAll('input').forEach((input) => { input.disabled = !enabled; });
  calculateAndRender();
});
document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('input', () => {
    // Never leave an apparently current numerical result visible after its inputs
    // have changed. Saved trial rows remain available, but the current result must
    // be recalculated before it can be saved as another trial.
    latest = null;
    latestInputs = null;
    clearRenderedResults();
    $('status').textContent = 'Inputs changed. Select Calculate or Save trial to update the displayed result.';
    $('status').className = 'status';
  });
});

// Decorative canvas animation, deliberately separate from the numerical model.
const canvas = $('scene');
const ctx = canvas.getContext('2d');
function draw() {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#1e344c';
  ctx.lineWidth = 1;
  for (let x = 20; x < width; x += 45) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 20; y < height; y += 45) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  const cx = width / 2;
  const top = 82;
  const bottom = 302;
  const upper = 150;
  const lower = 108;
  const angle = Math.sin(phase) * 0.11;
  ctx.strokeStyle = '#8fa7c2';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, top, upper, 31, 0, 0, Math.PI * 2); ctx.stroke();
  for (let index = 0; index < 3; index += 1) {
    const a = index * 2 * Math.PI / 3;
    const x1 = cx + Math.cos(a) * upper;
    const y1 = top + Math.sin(a) * 31;
    const x2 = cx + Math.cos(a + angle) * lower;
    const y2 = bottom + Math.sin(a + angle) * 23;
    ctx.strokeStyle = '#70d9d0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.fillStyle = '#1a324b'; ctx.strokeStyle = '#76e0d4'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, bottom, lower, 23, angle, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#edf4ff'; ctx.font = '17px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Suspended platform', cx, bottom + 6);
  ctx.fillStyle = '#9eafc5'; ctx.font = '14px system-ui';
  ctx.fillText('Three equally spaced suspension filaments · schematic only', cx, 390);
  if (animationRunning) {
    phase += 0.025;
    animationFrameHandle = window.requestAnimationFrame(draw);
  } else {
    animationFrameHandle = null;
  }
}

$('startBtn').addEventListener('click', () => {
  animationRunning = !animationRunning;
  $('startBtn').textContent = animationRunning ? 'Pause animation' : 'Resume animation';
  if (!animationRunning && animationFrameHandle !== null) {
    window.cancelAnimationFrame(animationFrameHandle);
    animationFrameHandle = null;
    draw(); // Render a final static frame without scheduling another repaint.
  } else if (animationRunning && animationFrameHandle === null) {
    animationFrameHandle = window.requestAnimationFrame(draw);
  }
});

$('baselineFields').querySelectorAll('input').forEach((input) => { input.disabled = !$('baselineEnabled').checked; });
calculateAndRender();
renderTrials();
draw();
