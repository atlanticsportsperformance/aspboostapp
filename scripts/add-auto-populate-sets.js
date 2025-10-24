const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'dashboard', 'workouts', 'exercise-detail-panel.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find where to insert the helper function (before "return (")
const returnIndex = content.indexOf('  return (');

if (returnIndex === -1) {
  console.error('Could not find return statement');
  process.exit(1);
}

// Insert the helper function
const helperFunction = `
  // Generate initial sets from simple mode values (metric_targets) when opening per-set editor
  const getInitialSetsFromSimpleMode = () => {
    if (exercise.set_configurations && exercise.set_configurations.length > 0) {
      // Already has per-set config, use it
      return exercise.set_configurations;
    }

    // Create initial sets from simple mode values
    const totalSets = exercise.sets || 3;
    const initialSets = [];

    for (let i = 0; i < totalSets; i++) {
      initialSets.push({
        set_number: i + 1,
        metric_values: { ...exercise.metric_targets } || {},
        intensity_type: exercise.intensity_targets?.[0]?.metric || undefined,
        intensity_percent: exercise.intensity_targets?.[0]?.percent || undefined,
        rest_seconds: exercise.rest_seconds || 60,
        is_amrap: exercise.is_amrap || false
      });
    }

    return initialSets;
  };

`;

content = content.slice(0, returnIndex) + helperFunction + content.slice(returnIndex);

// Now update the SetBySetEditor call to use this function
content = content.replace(
  /initialSets=\{exercise\.set_configurations \|\| \[\]\}/,
  'initialSets={getInitialSetsFromSimpleMode()}'
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ Added auto-populate functionality for per-set editor');
