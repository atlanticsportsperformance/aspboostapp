# Force Plate Test Parameters - Complete Reference

## Overview

This document defines the complete data flow from VALD ForceDecks hardware through the API to your database, including all test parameters, metrics collected, and how the percentile system uses this data.

---

## Test Types

Your system tracks **5 test types** from VALD ForceDecks:

| Test Type | Full Name | What It Measures | Key Metrics |
|-----------|-----------|------------------|-------------|
| **CMJ** | Counter Movement Jump | Lower body power with countermovement | Jump Height, Peak Power, RSI |
| **SJ** | Squat Jump | Lower body power from static position | Jump Height, Peak Power |
| **HJ** | Hop Test | Single-leg power and landing mechanics | Jump Height (per hop), Asymmetry |
| **PPU** | Prone Push-Up | Upper body power and explosiveness | Peak Propulsive Power, Contraction Time |
| **IMTP** | Isometric Mid-Thigh Pull | Maximum force production capacity | Peak Force, RFD (Rate of Force Development) |

---

## Complete Test Session Definition

**A "Complete Test Session"** = All 5 tests performed on the same calendar day

**2nd Complete Test Session Rule:**
- Athletes must complete 2 full test sessions before contributing to percentile rankings
- This ensures data quality and consistency
- Prevents outliers from skewing percentile distributions

**Example:**
```
Day 1 (Jan 1, 2025):
  ✅ CMJ at 9:00 AM
  ✅ SJ at 9:15 AM
  ✅ HJ at 9:30 AM
  ✅ PPU at 9:45 AM
  ✅ IMTP at 10:00 AM
  → 1st Complete Session (does NOT contribute to percentiles yet)

Day 15 (Jan 15, 2025):
  ✅ CMJ at 10:00 AM
  ✅ SJ at 10:15 AM
  ✅ HJ at 10:30 AM
  ✅ PPU at 10:45 AM
  ✅ IMTP at 11:00 AM
  → 2nd Complete Session (AUTOMATICALLY added to percentile contributions!)
```

---

## VALD API Data Flow

### Step 1: VALD ForceDecks Hardware
Athlete performs test on force plates → VALD Hub stores data

### Step 2: Your System Syncs Data
```
POST /api/athletes/{athleteId}/vald/sync
  ↓
Calls VALD API: getTests(modifiedFromUtc, profileId)
  ↓
Returns list of tests since last sync
  ↓
For each test: getTrials(testId)
  ↓
Gets detailed metrics for that test
```

### Step 3: VALD API Response Structure

**getTests() Response:**
```json
{
  "tests": [
    {
      "testId": "abc123-def456-ghi789",
      "testType": "CMJ",
      "recordedUTC": "2025-01-26T10:00:00Z",
      "profileId": "athlete-uuid-here"
    }
  ]
}
```

**getTrials() Response:**
```json
{
  "trials": [
    {
      "athleteId": "athlete-uuid",
      "recordedUTC": "2025-01-26T10:00:00Z",
      "results": [
        {
          "definition": {
            "result": "JUMP_HEIGHT",
            "unit": "cm"
          },
          "limb": "trial",
          "value": 45.2
        },
        {
          "definition": {
            "result": "PEAK_TAKEOFF_POWER",
            "unit": "W"
          },
          "limb": "trial",
          "value": 3542.8
        }
        // ... more metrics
      ]
    }
  ]
}
```

### Step 4: Database Storage

**Mapping Logic (from `lib/vald/store-test.ts`):**
```typescript
// VALD metric → Your database column
for (const result of trial.results) {
  const metricName = result.definition.result    // "JUMP_HEIGHT"
  const limb = result.limb.toLowerCase()         // "trial", "left", "right"
  const columnName = `${metricName}_${limb}_value`

  // Stores as: jump_height_trial_value = 45.2
  // Stores as: jump_height_trial_unit = "cm"
}
```

---

## Test-Specific Parameters

### 1. CMJ (Counter Movement Jump)

**Table:** `cmj_tests`

**Metrics Collected:**
| VALD Metric Name | Database Column | Unit | Description |
|------------------|-----------------|------|-------------|
| JUMP_HEIGHT | jump_height_trial_value | cm | Vertical jump height |
| PEAK_TAKEOFF_POWER | peak_takeoff_power_trial_value | W | Maximum power during takeoff |
| PEAK_LANDING_FORCE | peak_landing_force_trial_value | N | Maximum force on landing |
| RSI_MODIFIED | rsi_modified_trial_value | ratio | Reactive Strength Index |
| TIME_TO_TAKEOFF | time_to_takeoff_trial_value | ms | Duration of movement phase |
| ECCENTRIC_DURATION | eccentric_duration_trial_value | ms | Downward movement time |
| CONCENTRIC_DURATION | concentric_duration_trial_value | ms | Upward movement time |
| ASYMMETRY | asymmetry_trial_value | % | Left/right difference |

**Percentile Metrics (8 total):**
1. `cmj_jump_height`
2. `cmj_peak_power`
3. (Other metrics added as needed)

---

### 2. SJ (Squat Jump)

**Table:** `sj_tests`

**Metrics Collected:**
| VALD Metric Name | Database Column | Unit | Description |
|------------------|-----------------|------|-------------|
| JUMP_HEIGHT | jump_height_trial_value | cm | Vertical jump height from static squat |
| PEAK_TAKEOFF_POWER | peak_takeoff_power_trial_value | W | Maximum power during takeoff |
| PEAK_LANDING_FORCE | peak_landing_force_trial_value | N | Maximum force on landing |
| TIME_TO_TAKEOFF | time_to_takeoff_trial_value | ms | Duration from start to takeoff |
| CONCENTRIC_IMPULSE | concentric_impulse_trial_value | Ns | Total impulse during push phase |

**Percentile Metrics:**
- Similar to CMJ but without countermovement-specific metrics

---

### 3. HJ (Hop Test)

**Table:** `hj_tests`

**Special Behavior:** Averages multiple hops per test

**Metrics Collected:**
| VALD Metric Name | Database Column | Unit | Description |
|------------------|-----------------|------|-------------|
| JUMP_HEIGHT | jump_height_trial_value | cm | Average hop height across all hops |
| RSI | rsi_trial_value | ratio | Reactive Strength Index |
| CONTACT_TIME | contact_time_trial_value | ms | Time foot is on ground |
| FLIGHT_TIME | flight_time_trial_value | ms | Time in air |
| ASYMMETRY | asymmetry_trial_value | % | Left/right difference |

**Left/Right Metrics:**
- `jump_height_left_value` - Left leg hop height
- `jump_height_right_value` - Right leg hop height
- `rsi_left_value` - Left leg RSI
- `rsi_right_value` - Right leg RSI

---

### 4. PPU (Prone Push-Up)

**Table:** `ppu_tests`

**Metrics Collected:**
| VALD Metric Name | Database Column | Unit | Description |
|------------------|-----------------|------|-------------|
| PEAK_PROPULSIVE_POWER | peak_propulsive_power_trial_value | W | Maximum power during push |
| CONTRACTION_TIME | contraction_time_trial_value | ms | Duration of push phase |
| PEAK_FORCE | peak_force_trial_value | N | Maximum force produced |
| IMPULSE | impulse_trial_value | Ns | Total impulse during movement |

---

### 5. IMTP (Isometric Mid-Thigh Pull)

**Table:** `imtp_tests`

**Metrics Collected:**
| VALD Metric Name | Database Column | Unit | Description |
|------------------|-----------------|------|-------------|
| PEAK_FORCE | peak_force_trial_value | N | Maximum force produced |
| RFD_100MS | rfd_100ms_trial_value | N/s | Rate of Force Development (0-100ms) |
| RFD_200MS | rfd_200ms_trial_value | N/s | Rate of Force Development (0-200ms) |
| TIME_TO_PEAK_FORCE | time_to_peak_force_trial_value | ms | Time to reach peak force |
| ASYMMETRY | asymmetry_trial_value | % | Left/right difference |

**Left/Right Metrics:**
- `peak_force_left_value` - Left leg force
- `peak_force_right_value` - Right leg force

---

## Percentile System Integration

### Current Percentile Metrics (8 total)

Based on your seed data from Driveline:

1. **cmj_jump_height** - Counter Movement Jump height (cm)
2. **cmj_peak_power** - CMJ peak takeoff power (W)
3. **sj_jump_height** - Squat Jump height (cm)
4. **hj_jump_height** - Hop Test average height (cm)
5. **ppu_peak_power** - Push-Up peak propulsive power (W)
6. **imtp_peak_force** - Pull peak force (N)
7. **imtp_rfd_100ms** - Pull RFD at 100ms (N/s)
8. **imtp_rfd_200ms** - Pull RFD at 200ms (N/s)

### Play Levels (5 total)

1. **Youth** - Currently no data (NULL placeholders)
2. **High School** - Data available
3. **College** - Data available
4. **Pro** - Data available
5. **Overall** - All levels combined

### Percentile Calculation

**Total Percentile Thresholds:** 4,040 rows
- 8 metrics × 5 levels × 101 percentiles (0-100) = 4,040

**How Percentiles Work:**

1. **Storage:** Only threshold values stored (not every athlete value)
```sql
-- Example: CMJ Jump Height for High School level
percentile | value (cm)
-----------|------------
0          | 20.5
1          | 22.1
2          | 23.4
...
50         | 45.2  ← 50th percentile (median)
...
99         | 68.9
100        | 72.3
```

2. **Lookup:** Athlete's value compared to thresholds
```typescript
// Athlete jumps 50.0 cm
// System finds: 50.0 cm falls between 58th and 59th percentile
// Returns: 58th percentile
```

3. **Contribution:** After 2nd complete session
```sql
-- Athlete added to contribution pool
INSERT INTO athlete_percentile_contributions (
  athlete_id,
  play_level,
  session_date
);

-- Percentiles recalculated to include their data
-- New thresholds computed across all contributing athletes
```

---

## Duplicate Prevention

### How It Works

**UNIQUE Constraint on `test_id`:**
```sql
ALTER TABLE cmj_tests
ADD CONSTRAINT cmj_tests_test_id_unique UNIQUE (test_id);
```

**Result:**
- If VALD sync tries to insert the same test twice, database rejects it
- Prevents duplicate data from corrupting percentile calculations
- `test_id` is VALD's unique identifier for each test

**Sync Behavior:**
```typescript
// Incremental sync using modifiedFromUtc
const latestDate = await getLatestTestDate(supabase, athleteId);
const testsResponse = await valdApi.getTests(latestDate.toISOString(), profileId);

// Only fetches tests modified since last sync
// Combined with UNIQUE constraint = no duplicates possible
```

---

## End-to-End Data Flow

### Complete Workflow

```mermaid
1. Athlete performs tests on VALD ForceDecks
   ↓
2. VALD Hub assigns profileId (if new athlete)
   ↓
3. Test data stored in VALD's cloud
   ↓
4. Coach clicks "Sync VALD Data" in your app
   ↓
5. POST /api/athletes/{id}/vald/sync
   ↓
6. System checks: vald_synced_at (last sync timestamp)
   ↓
7. Calls VALD API: getTests(since lastSync, profileId)
   ↓
8. For each new test:
   - Calls getTrials(testId)
   - Maps VALD metrics → Database columns
   - Inserts into appropriate test table
   ↓
9. TRIGGER fires: check_and_add_percentile_contribution()
   ↓
10. Trigger checks:
    - Do all 5 test types exist for this date?
    - Is this the 2nd complete session?
    - Is athlete already contributing?
   ↓
11. If YES to all:
    - INSERT INTO athlete_percentile_contributions
    - Athlete now contributes to percentile pool
   ↓
12. Percentile rankings update:
    - Recalculate thresholds including new athlete
    - Update percentile_lookup table
   ↓
13. Dashboard displays:
    - Athlete's current metrics
    - Their percentile ranking vs peers
    - Performance trends over time
```

---

## Testing Checklist

### Before Going Live

- [ ] Apply migration: `20250126000000_create_auto_contribution_triggers.sql`
- [ ] Verify triggers exist on all 5 test tables
- [ ] Verify UNIQUE constraints on test_id
- [ ] Test VALD API authentication
- [ ] Sync test data for at least one athlete
- [ ] Verify 1st complete session does NOT trigger contribution
- [ ] Verify 2nd complete session DOES trigger contribution
- [ ] Check `athlete_percentile_contributions` table updated
- [ ] Verify duplicate prevention (try syncing same test twice)
- [ ] Check percentile rankings display correctly

### Test Data Requirements

**Minimum for testing:**
- 1 athlete with VALD profileId linked
- 2 complete test sessions (10 total tests across 2 days)
- Each session must have all 5 test types

**Expected Results:**
- After 1st session: 5 rows in test tables, 0 in contributions
- After 2nd session: 10 rows in test tables, 1 in contributions
- Percentile ranking appears for athlete
- Re-syncing same data produces no duplicates

---

## Common Issues & Solutions

### Issue: Tests sync but percentile doesn't update
**Cause:** Missing one of the 5 test types
**Fix:** Ensure complete session (CMJ, SJ, HJ, PPU, IMTP all present same day)

### Issue: Duplicate tests in database
**Cause:** UNIQUE constraint not applied
**Fix:** Apply migration to add test_id constraints

### Issue: Athlete not contributing after 2nd session
**Cause:** Triggers not created
**Fix:** Apply migration to create triggers

### Issue: Wrong percentile ranking
**Cause:** Athlete at wrong play level
**Fix:** Update athlete's play_level in athletes table, recalculate percentiles

### Issue: NULL percentiles for Youth
**Expected:** Youth level has no data yet (waiting for first youth athletes)
**Fix:** Not an issue - NULL placeholders ready for when youth data arrives

---

## Force Plate Hardware Specifications

**VALD ForceDecks:**
- Dual force plates (left/right)
- Sampling rate: 1000 Hz
- Force measurement range: 0-10,000 N
- Accuracy: ±1 N
- Platform size: 400mm × 600mm per plate

**Test Environment Requirements:**
- Flat, level surface
- Adequate ceiling height for jumps (10+ feet)
- Minimal distractions
- Consistent testing protocols

---

## Database Schema Reference

### Test Table Structure (All 5 tables follow this pattern)

```sql
CREATE TABLE cmj_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  test_id VARCHAR NOT NULL UNIQUE,  -- VALD's testId
  recorded_utc TIMESTAMP NOT NULL,

  -- Metrics (pattern: {metric}_{limb}_{value|unit})
  jump_height_trial_value FLOAT,
  jump_height_trial_unit VARCHAR,
  peak_takeoff_power_trial_value FLOAT,
  peak_takeoff_power_trial_unit VARCHAR,
  -- ... more metrics

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cmj_tests_athlete_date
  ON cmj_tests (athlete_id, DATE(recorded_utc));
```

### Contribution Table

```sql
CREATE TABLE athlete_percentile_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL UNIQUE REFERENCES athletes(id),
  play_level TEXT NOT NULL,
  contributed_at TIMESTAMP DEFAULT NOW(),
  session_date DATE NOT NULL  -- Date of 2nd complete session
);
```

### Percentile Lookup Table

```sql
CREATE TABLE percentile_lookup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_column TEXT NOT NULL,  -- e.g., 'cmj_jump_height'
  play_level TEXT NOT NULL,     -- 'Youth', 'High School', etc.
  percentile INTEGER NOT NULL,  -- 0-100
  value FLOAT,                  -- NULL for Youth (no data yet)
  total_count INTEGER,          -- Number of athletes in calculation

  UNIQUE (metric_column, play_level, percentile)
);
```

---

## Summary

**What You Have:**
- ✅ Complete VALD API integration
- ✅ All 5 test types supported
- ✅ 8 percentile metrics calculated
- ✅ 5 play levels with 4,040 thresholds
- ✅ Duplicate prevention via UNIQUE constraints
- ✅ Auto-contribution via database triggers
- ✅ 2nd complete session detection

**What's Ready:**
- Apply the migration and start testing!
- System will automatically detect 2nd complete sessions
- Percentile rankings will update in real-time
- No manual intervention needed after initial setup

**Next Steps:**
1. Apply migration: `supabase/migrations/20250126000000_create_auto_contribution_triggers.sql`
2. Test with real VALD data from your 118 athletes
3. Verify auto-contribution works
4. Monitor percentile accuracy as data grows
