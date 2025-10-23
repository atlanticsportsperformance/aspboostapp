# Tonight's Progress - Measurements & AMRAP Implementation

## ✅ COMPLETED

### 1. **Database Migration** ✅
- Added `enabled_measurements TEXT[]` column to `routine_exercises`
- Added `is_amrap BOOLEAN` column to `routine_exercises`
- Migration successfully run in Supabase
- Verified columns exist

### 2. **Placeholder System Updated** ✅
- Placeholders now start with empty `metric_schema: { measurements: [] }`
- No more default metrics assigned
- Ready for per-instance customization

### 3. **Exercise Detail Panel Structure** ✅
- Updated TypeScript interfaces to include new fields
- Removed "Each Side" tab (moved to exercise builder)
- Changed tabs to: **Measurements** | **AMRAP**
- Removed heart (♡) button
- Removed square (□) button
- Kept: Replace (↻) and Delete (🗑) buttons

### 4. **Measurement Functions Added** ✅
- `getAllAvailableMeasurements()` - Gets all possible measurements (exercise + standard)
- `getDisplayMeasurements()` - Gets measurements to show based on `enabled_measurements`
- `isMeasurementEnabled(id)` - Checks if measurement is enabled
- `toggleMeasurement(id)` - Adds/removes measurement from enabled list
- `toggleAllSetsAMRAP(value)` - Enables/disables AMRAP for all sets

---

## 🔲 REMAINING WORK

### **Tomorrow Morning - Tab Content:**

#### **Measurements Tab Content:**
Need to build UI that shows:
```
┌────────────────────────────────────┐
│ Available Measurements:            │
│                                    │
│ ☑ Reps            [  10  ]         │
│ ☑ Weight          [ 225  ] lbs     │
│ ☐ Time            [      ] sec     │
│ ☐ Distance        [      ] ft      │
│ ☐ Exit Velo       [      ] mph     │
│ ☐ Peak Velo       [      ] mph     │
└────────────────────────────────────┘
```

**Logic:**
- Loop through `getAllAvailableMeasurements()`
- Show checkbox for each
- Checked = in `enabled_measurements` array
- Show input field only if checked
- Clicking checkbox calls `toggleMeasurement(id)`

#### **AMRAP Tab Content:**
```
┌────────────────────────────────────┐
│ ☑ All Sets AMRAP                   │
│                                    │
│ OR                                 │
│                                    │
│ Per-Set Configuration:             │
│ Set 1: [10 reps] ☐ AMRAP           │
│ Set 2: [ 8 reps] ☐ AMRAP           │
│ Set 3: [-- reps] ☑ AMRAP           │
└────────────────────────────────────┘
```

**Logic:**
- Toggle for "All Sets AMRAP" → `is_amrap`
- If not all sets, show per-set checkboxes
- Per-set uses `set_configurations[i].is_amrap`

---

## **Current File State:**

**File:** `components/dashboard/workouts/exercise-detail-panel.tsx`

**What's there:**
- Lines 1-261: Interfaces, functions, header, tabs ✅
- Lines 262+: Scrollable content area (OLD STRUCTURE)

**What needs to happen:**
- Wrap lines 262+ in conditional:
  - If `activeTab === 'measurements'` → show Measurements tab content
  - If `activeTab === 'amrap'` → show AMRAP tab content

**Old content has:**
- Configuration bar (sets, reps, rest, tempo, intensity)
- Metric inputs
- Set-by-set editor
- Notes

**New Measurements tab should have:**
- List of all available measurements with checkboxes
- Input fields only for enabled measurements
- Configuration bar (sets, reps, rest) - KEEP
- Set-by-set editor - KEEP
- Notes - KEEP

**New AMRAP tab should have:**
- "All Sets AMRAP" toggle
- Per-set AMRAP checkboxes
- Visual indicator of AMRAP sets

---

## **Code Snippets for Tomorrow:**

### **Measurements Tab Content:**
```tsx
{activeTab === 'measurements' ? (
  <div className="space-y-6">
    {/* Available Measurements */}
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <h3 className="text-white font-semibold mb-4">Available Measurements</h3>
      <div className="space-y-2">
        {getAllAvailableMeasurements().map((measurement) => (
          <label
            key={measurement.id}
            className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={isMeasurementEnabled(measurement.id)}
              onChange={() => toggleMeasurement(measurement.id)}
              className="w-4 h-4"
            />
            <span className="text-white flex-1">{measurement.name}</span>
            {isMeasurementEnabled(measurement.id) && (
              <input
                type="number"
                value={getMetricValue(measurement.id) || ''}
                onChange={(e) => updateMetricValue(measurement.id, e.target.value)}
                className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white"
                placeholder="--"
              />
            )}
            <span className="text-gray-400 text-sm w-12">{measurement.unit}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Configuration Bar - KEEP EXISTING */}
    {/* Sets, Reps, Rest, etc. */}

    {/* Set-by-Set Editor - KEEP EXISTING */}

    {/* Notes - KEEP EXISTING */}
  </div>
) : (
  // AMRAP Tab
  <div className="space-y-6">
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={exercise.is_amrap || false}
          onChange={(e) => toggleAllSetsAMRAP(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-white font-semibold">All Sets AMRAP</span>
      </label>

      {!exercise.is_amrap && (
        <div className="mt-4 space-y-2">
          <p className="text-gray-400 text-sm">Or configure per set:</p>
          {/* Per-set checkboxes */}
        </div>
      )}
    </div>
  </div>
)}
```

---

## **Testing Plan:**

### **Test 1: Placeholder with Custom Measurements**
1. Create placeholder "Main Throwing Exercise"
2. Add to workout
3. Open Measurements tab
4. Check: Reps, Peak Velo, Distance
5. Set values: 8 reps, 85 mph, 150 ft
6. Save
7. Verify `enabled_measurements = ['reps', 'peak_velo', 'distance']`
8. Verify metric_targets saved

### **Test 2: Replace Exercise Inherits Everything**
1. Using placeholder from Test 1
2. Click Replace (↻) button (future feature)
3. Select "Javelin Long Toss"
4. Verify measurements still checked (Reps, Peak Velo, Distance)
5. Verify values preserved (8, 85, 150)
6. Verify only exercise_id changed

### **Test 3: AMRAP Functionality**
1. Add exercise to workout
2. Open AMRAP tab
3. Toggle "All Sets AMRAP"
4. Verify `is_amrap = true`
5. Untoggle
6. Check Set 3 only
7. Verify `set_configurations[2].is_amrap = true`

---

## **Files Modified Tonight:**

1. `supabase/migrations/20251023040000_add_measurements_and_amrap.sql` - NEW
2. `docs/RUN_THIS_MIGRATION.sql` - NEW (RAN SUCCESSFULLY)
3. `docs/MEASUREMENTS_AND_AMRAP_IMPLEMENTATION.md` - NEW
4. `components/dashboard/exercises/custom-measurements-manager.tsx` - MODIFIED (removed default metrics)
5. `components/dashboard/workouts/exercise-detail-panel.tsx` - PARTIALLY MODIFIED (tabs added, content pending)

---

## **Key Architectural Decisions:**

✅ **Per-Instance Customization** - `enabled_measurements` array on `routine_exercises`
✅ **Backwards Compatible** - NULL = show all from exercise schema
✅ **Standard Measurements Always Available** - Can add Reps/Weight/Time/etc. to any exercise
✅ **Placeholders Start Empty** - Coach adds measurements as needed
✅ **Replacement Preserves Everything** - Only exercise_id changes

---

## **Start Here Tomorrow:**

1. Open `exercise-detail-panel.tsx`
2. Find line 262 (Scrollable Content section)
3. Wrap in `{activeTab === 'measurements' ? (...) : (...)}`
4. Build Measurements tab UI with checkboxes
5. Build AMRAP tab UI
6. Test with placeholder workflow

**Estimated Time:** 1-2 hours for tab content implementation
