# Percentile System Architecture Fix

## What We Built (WRONG):

❌ **percentile_pool** with 57,795 rows
- Each row = one metric value (e.g., jump_height = 24.5)
- Stored individual data points, not athlete records
- This is the WRONG approach

✅ **driveline_seed_data** table exists but is EMPTY
- This is the RIGHT table, just needs data loaded correctly

## What We SHOULD Have:

### Table 1: `driveline_seed_data`
**Purpose:** Baseline data that never changes
**Structure:** ONE row per athlete with ALL metrics as columns

```
| id | athlete_name | playing_level | jump_height_cmj | peak_power_sj | net_peak_force_imtp | ... (53 columns) |
|----|--------------|---------------|-----------------|---------------|---------------------|------------------|
| 1  | NULL         | High School   | 24.5            | 2896.73       | 1250.3              | ...              |
| 2  | NULL         | College       | 28.2            | 3353.12       | 1480.7              | ...              |
... (1,934 total rows)
```

### Table 2: `athlete_percentile_contributions`
**Purpose:** Growing database of YOUR athletes' 2nd tests
**Structure:** Same columns as driveline_seed_data

```
| athlete_id | test_type | playing_level | jump_height_cmj | peak_power_sj | net_peak_force_imtp | test_date | ... |
|------------|-----------|---------------|-----------------|---------------|---------------------|-----------|-----|
| uuid-123   | CMJ       | College       | 26.7            | 3100.5        | 1350.2              | 2025-01-15| ... |
```

**Primary Key:** (athlete_id, test_type, play_level) — enforces "2nd test only" rule

## How Percentile Calculation Works:

When athlete takes a test:

1. **Get their 6 composite metric values:**
   - jump_height_cmj
   - peak_power_sj
   - peak_power_per_bw_sj
   - net_peak_force_imtp
   - relative_strength (IMTP)
   - best_rsi_flight_contact_ht (HJ)

2. **For EACH metric, calculate percentile:**
   ```sql
   -- Example: Calculate jump_height_cmj percentile for College level
   WITH all_values AS (
     SELECT jump_height_cmj AS value
     FROM driveline_seed_data
     WHERE playing_level = 'College'
     AND jump_height_cmj IS NOT NULL

     UNION ALL

     SELECT jump_height_cmj AS value
     FROM athlete_percentile_contributions
     WHERE playing_level = 'College'
     AND jump_height_cmj IS NOT NULL
   ),
   ranked AS (
     SELECT
       value,
       COUNT(*) FILTER (WHERE value < 26.7) AS below_count,
       COUNT(*) AS total_count
     FROM all_values
   )
   SELECT ROUND((below_count::FLOAT / total_count::FLOAT) * 100) AS percentile
   FROM ranked;
   ```

3. **Composite Score:**
   - Average the 6 percentiles
   - Example: (88 + 92 + 76 + 81 + 85 + 79) / 6 = 83.5 → **84th percentile**

4. **Store in `athlete_percentile_history`:**
   - JSONB with all 6 percentiles + composite
   - Timestamp for historical tracking

## What Needs to be Fixed:

1. ✅ Check if `driveline_seed_data` has correct columns (53 from CSV)
2. ❌ Clear or drop `percentile_pool` (we don't need it)
3. ❌ Rewrite seed data loader to insert 1,934 athlete RECORDS (not 60k data points)
4. ❌ Update percentile calculation function to query BOTH tables
5. ✅ `athlete_percentile_contributions` structure is correct
6. ✅ `athlete_percentile_history` structure is correct

## Next Steps:

1. Check `driveline_seed_data` schema
2. Load CSV data correctly (1,934 rows)
3. Drop/clear `percentile_pool`
4. Test percentile calculation with new approach
