# Custom Measurements Schema

## Overview
The `custom_measurements` table stores all measurement definitions used across exercises in the platform. This includes both single measurements (e.g., "Weight", "Distance") and paired measurements (e.g., "Blue Ball (450g)" which tracks both Reps and MPH).

## Schema Design

### Simplified Structure
The schema has been simplified to eliminate redundancy:
- **Single measurements**: Use only `primary_metric_*` fields
- **Paired measurements**: Use both `primary_metric_*` and `secondary_metric_*` fields

### Table Schema

```sql
CREATE TABLE custom_measurements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                    -- Display name (e.g., "Blue Ball (450g)")
  category TEXT NOT NULL,                 -- 'single' or 'paired'

  -- Primary metric (used for ALL measurements)
  primary_metric_id TEXT,
  primary_metric_name TEXT,              -- This serves as the UNIT (e.g., "Reps", "lbs", "MPH")
  primary_metric_type TEXT,              -- Data type: 'reps', 'performance_decimal', 'performance_integer', 'weight', 'time', 'distance'

  -- Secondary metric (only for paired measurements)
  secondary_metric_id TEXT,
  secondary_metric_name TEXT,            -- Unit for second metric (e.g., "MPH")
  secondary_metric_type TEXT,

  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

## Key Design Principles

### 1. Name IS the Unit
The `primary_metric_name` and `secondary_metric_name` fields serve as BOTH the name AND the unit for the measurement. This eliminates the need for separate `unit` fields.

**Examples:**
- For "Weight": `primary_metric_name = "lbs"`
- For "Distance": `primary_metric_name = "ft/yds"`
- For "Blue Ball (450g)" primary: `primary_metric_name = "Reps"`
- For "Blue Ball (450g)" secondary: `secondary_metric_name = "MPH"`

### 2. Category Determines Field Usage

**Single Measurements** (`category = 'single'`):
- Use only `primary_metric_*` fields
- `secondary_metric_*` fields are NULL
- Example: "Distance" measurement
  ```json
  {
    "id": "distance",
    "name": "Distance",
    "category": "single",
    "primary_metric_id": "distance",
    "primary_metric_name": "ft/yds",
    "primary_metric_type": "distance",
    "secondary_metric_id": null,
    "secondary_metric_name": null,
    "secondary_metric_type": null,
    "is_locked": true
  }
  ```

**Paired Measurements** (`category = 'paired'`):
- Use both `primary_metric_*` AND `secondary_metric_*` fields
- Allows tracking two related metrics together
- Example: "Blue Ball (450g)" measurement
  ```json
  {
    "id": "blue_ball",
    "name": "Blue Ball (450g)",
    "category": "paired",
    "primary_metric_id": "blue_ball_reps",
    "primary_metric_name": "Reps",
    "primary_metric_type": "reps",
    "secondary_metric_id": "blue_ball_velo",
    "secondary_metric_name": "MPH",
    "secondary_metric_type": "performance_decimal",
    "is_locked": false
  }
  ```

## Measurement Types

The `primary_metric_type` and `secondary_metric_type` fields support:

- `reps` - For counting repetitions
- `performance_decimal` - For decimal values (velocity, weight, etc.)
- `performance_integer` - For integer values (time, count, etc.)
- `weight` - For weight measurements
- `time` - For time-based measurements
- `distance` - For distance measurements

## Locked Measurements

System-provided measurements have `is_locked = true` to prevent deletion or modification:
- Reps
- Weight
- Time
- Distance

## UI Form Structure

### Creating Single Measurements
1. **Measurement Name**: Display name (e.g., "Jump Height")
2. **Measurement Name/Unit**: The unit (e.g., "inches") - becomes `primary_metric_name`
3. **Type**: Data type (Integer/Decimal)

### Creating Paired Measurements
1. **Measurement Name**: Display name (e.g., "Blue Ball (450g)")
2. **Primary Metric**:
   - Name: (e.g., "Reps")
   - Type: (Integer/Decimal)
3. **Secondary Metric**:
   - Name: (e.g., "MPH")
   - Type: (Integer/Decimal)

## Migration History

### Phase 1: Original Structure (Deprecated)
- Stored measurements as fake "system exercises" with `_system` tag
- Used JSONB `metric_schema` field in exercises table

### Phase 2: Redundant Schema (Deprecated)
- Created dedicated `custom_measurements` table
- Had both top-level `type`/`unit` AND `primary_metric_type`/`primary_metric_unit`
- Caused confusion with duplicate fields

### Phase 3: Simplified Schema (Current)
- Removed top-level `type` and `unit` columns
- ALL measurements use `primary_metric_*` fields
- Single measurements: only primary fields populated
- Paired measurements: both primary and secondary populated
- `primary_metric_name` serves as the unit

## Related Files

- **Schema**: `scripts/recreate-custom-measurements-table.sql`
- **Migrations**:
  - `scripts/migrate-to-custom-measurements-table.ts`
  - `scripts/migrate-ball-measurements.ts`
- **UI Component**: `components/dashboard/exercises/custom-measurements-manager.tsx`
- **Verification**: `scripts/check-custom-measurements.ts`

## Usage in Exercises

When adding a measurement to an exercise:
1. For **single measurements**: Add the `primary_metric_id` to the exercise's `metric_schema.measurements` array
2. For **paired measurements**: Add BOTH `primary_metric_id` AND `secondary_metric_id` to the array

This allows exercises to reference measurements and maintain consistency across the platform.
