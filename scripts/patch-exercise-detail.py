#!/usr/bin/env python3
import re

# Read the file
with open('components/dashboard/workouts/exercise-detail-panel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old code pattern (lines 370-375)
old_pattern = r'''    } else {
      // Add measurement to enabled list
      const updateObj = { enabled_measurements: \[\.\.\. current, measurementId\] };
      console\.log\('🔘 ADDING - Calling onUpdate with:', updateObj\);
      onUpdate\(updateObj\);
    }'''

# Define the new code
new_code = '''    } else {
      // Add measurement to enabled list
      const updated = [...current, measurementId];

      // Find the measurement to check if it's paired
      const measurement = getAllAvailableMeasurements().find(m => m.id === measurementId);

      // Initialize metric values in metric_targets for paired measurements
      let updatedTargets = { ...exercise.metric_targets };
      if (measurement?.category === 'paired') {
        // For paired measurements, initialize BOTH primary and secondary metrics
        if (measurement.primary_metric_id && !(measurement.primary_metric_id in updatedTargets)) {
          updatedTargets[measurement.primary_metric_id] = null;
        }
        if (measurement.secondary_metric_id && !(measurement.secondary_metric_id in updatedTargets)) {
          updatedTargets[measurement.secondary_metric_id] = null;
        }
      } else {
        // For single measurements, initialize the metric if not already present
        if (!(measurementId in updatedTargets)) {
          updatedTargets[measurementId] = null;
        }
      }

      const updateObj = {
        enabled_measurements: updated,
        metric_targets: Object.keys(updatedTargets).length > 0 ? updatedTargets : null
      };
      console.log('🔘 ADDING - Calling onUpdate with:', updateObj);
      onUpdate(updateObj);
    }'''

# Replace
new_content = re.sub(old_pattern, new_code, content, flags=re.MULTILINE)

# Write back
with open('components/dashboard/workouts/exercise-detail-panel.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("OK Patched successfully!")
