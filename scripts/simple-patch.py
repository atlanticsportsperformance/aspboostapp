#!/usr/bin/env python3

# Read the file
with open('components/dashboard/workouts/exercise-detail-panel.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with "// Add measurement to enabled list"
start_idx = None
for i, line in enumerate(lines):
    if '// Add measurement to enabled list' in line and i > 300:
        start_idx = i
        break

if start_idx is None:
    print("Could not find the target location!")
    exit(1)

print(f"Found target at line {start_idx + 1}")

# The new code to insert (lines 371-403)
new_lines = [
    "      // Add measurement to enabled list\n",
    "      const updated = [...current, measurementId];\n",
    "\n",
    "      // Find the measurement to check if it's paired\n",
    "      const measurement = getAllAvailableMeasurements().find(m => m.id === measurementId);\n",
    "\n",
    "      // Initialize metric values in metric_targets for paired measurements\n",
    "      let updatedTargets = { ...exercise.metric_targets };\n",
    "      if (measurement?.category === 'paired') {\n",
    "        // For paired measurements, initialize BOTH primary and secondary metrics\n",
    "        if (measurement.primary_metric_id && !(measurement.primary_metric_id in updatedTargets)) {\n",
    "          updatedTargets[measurement.primary_metric_id] = null;\n",
    "        }\n",
    "        if (measurement.secondary_metric_id && !(measurement.secondary_metric_id in updatedTargets)) {\n",
    "          updatedTargets[measurement.secondary_metric_id] = null;\n",
    "        }\n",
    "      } else {\n",
    "        // For single measurements, initialize the metric if not already present\n",
    "        if (!(measurementId in updatedTargets)) {\n",
    "          updatedTargets[measurementId] = null;\n",
    "        }\n",
    "      }\n",
    "\n",
    "      const updateObj = {\n",
    "        enabled_measurements: updated,\n",
    "        metric_targets: Object.keys(updatedTargets).length > 0 ? updatedTargets : null\n",
    "      };\n",
    "      console.log('🔘 ADDING - Calling onUpdate with:', updateObj);\n",
    "      onUpdate(updateObj);\n",
]

# Replace lines 371-374 (4 lines) with the new 28 lines
# start_idx points to line 371 (0-indexed line 370)
lines[start_idx:start_idx+4] = new_lines

# Write back
with open('components/dashboard/workouts/exercise-detail-panel.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"Patched successfully! Replaced 4 lines with {len(new_lines)} lines")
