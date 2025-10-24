const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'dashboard', 'workouts', 'exercise-detail-panel.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Strategy: Find the measurements dropdown section and move it BEFORE the {!enablePerSet conditional
// The dropdown is currently inside the simple mode branch, we need to extract it

const lines = content.split('\n');

// Find the line with {!enablePerSet ? (
const enablePerSetLine = lines.findIndex(line => line.includes('{!enablePerSet ? ('));

if (enablePerSetLine === -1) {
  console.error('Could not find {!enablePerSet line');
  process.exit(1);
}

// Find where the measurements dropdown starts (inside the simple mode else branch)
// Look for the duplicate AMRAP checkbox and measurements dropdown that's nested
const measurementsStart = lines.findIndex((line, idx) =>
  idx > enablePerSetLine && line.includes('/* AMRAP Checkbox - First, only show if Reps is enabled */')
);

// Find where it ends (look for the closing </div> of the measurements section)
let measurementsEnd = -1;
let divDepth = 0;
for (let i = measurementsStart; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<div')) divDepth++;
  if (line.includes('</div>')) {
    divDepth--;
    if (divDepth === -1) { // Found the closing div
      measurementsEnd = i;
      break;
    }
  }
}

// Extract the measurements section
const measurementsSection = lines.slice(measurementsStart - 2, measurementsEnd + 1); // Include the opening div

// Remove it from its current location
lines.splice(measurementsStart - 2, measurementsEnd - measurementsStart + 3);

// Insert it BEFORE the {!enablePerSet line
// But we need to adjust it so AMRAP only shows in simple mode without per-set config
const adjustedSection = measurementsSection.map((line, idx) => {
  // Change the AMRAP checkbox condition
  if (line.includes('isMeasurementEnabled(\'reps\') && (')) {
    return line.replace(
      'isMeasurementEnabled(\'reps\') && (',
      '!enablePerSet && isMeasurementEnabled(\'reps\') && !exercise.set_configurations && ('
    );
  }
  return line;
});

// Add a comment before measurements
adjustedSection.unshift('          {/* Measurements Selector - Always visible */}');

// Find the NEW location of enablePerSet (it shifted after deletion)
const newEnablePerSetLine = lines.findIndex(line => line.includes('{!enablePerSet ? ('));
lines.splice(newEnablePerSetLine, 0, ...adjustedSection, '');

const newContent = lines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✓ Moved measurements dropdown to always be visible');
