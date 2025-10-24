const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'dashboard', 'workouts', 'exercise-detail-panel.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// Find the line with `{!enablePerSet ? (`
const targetIndex = lines.findIndex(line => line.trim() === '{!enablePerSet ? (');

if (targetIndex === -1) {
  console.error('Could not find target line');
  process.exit(1);
}

// Insert the per-set summary check after line 301 (Simple Mode comment) and before line 302
const insertIndex = targetIndex + 2; // After "/* Simple Mode - Compact Grid */" and before "<>"

const newCode = `            /* Check if per-set configuration exists */
            exercise.set_configurations && exercise.set_configurations.length > 0 ? (
              /* Per-Set Summary - Read Only */
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-blue-300 font-medium">Per-Set Configuration Active</p>
                  <span className="text-xs text-gray-400">Click ☰ to edit details</span>
                </div>
                <div className="space-y-2">
                  {exercise.set_configurations.map((setConfig: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 text-sm p-2 bg-white/5 rounded">
                      <span className="text-gray-400 w-16">Set {idx + 1}:</span>
                      <div className="flex gap-3 flex-wrap">
                        {setConfig.metric_values && Object.entries(setConfig.metric_values).map(([key, value]: [string, any]) => {
                          const measurement = getAllAvailableMeasurements().find(m => m.id === key);
                          if (!value) return null;
                          return (
                            <span key={key} className="text-white">
                              {value} {measurement?.name || key}
                            </span>
                          );
                        })}
                        {setConfig.intensity_percent && (
                          <span className="text-blue-300">@ {setConfig.intensity_percent}%</span>
                        )}
                        {setConfig.is_amrap && (
                          <span className="text-blue-400 text-xs px-1.5 py-0.5 bg-blue-500/20 rounded">AMRAP</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (`;

// Need to find the matching closing tag for the original fragment and add a closing paren
const closingFragmentIndex = lines.findIndex((line, idx) => idx > insertIndex + 200 && line.trim() === '</>');

// Insert newCode and wrap the existing content
lines.splice(insertIndex, 1, newCode + '\n' + lines[insertIndex]);

// Add closing parenthesis and fragment after the original </> closing tag
lines[closingFragmentIndex] = lines[closingFragmentIndex] + '\n            )';

const newContent = lines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✓ Fixed per-set display in exercise-detail-panel.tsx');
