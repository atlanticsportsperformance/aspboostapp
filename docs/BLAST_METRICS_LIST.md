# BLAST MOTION METRICS - Complete List

Based on actual API data from your Blast Motion account.

## All Available Metrics (from API):

Looking at the API response, here are the metrics Blast Motion provides:

### **Speed Metrics:**
1. **bat_speed** - Bat Speed (mph) - PRIMARY METRIC
2. **swing_speed** - Swing Speed
3. **peak_hand_speed** - Peak Hand Speed (mph)
4. **peak_bat_speed** - Peak Bat Speed

### **Path/Angle Metrics:**
5. **bat_path_angle** - Attack Angle / Launch Angle (degrees) - PRIMARY METRIC
6. **vertical_bat_angle** - Vertical Bat Angle
7. **on_plane_efficiency** - On Plane Efficiency (%)

### **Timing Metrics:**
8. **time_to_contact** - Time to Contact (seconds) - PRIMARY METRIC
9. **time_to_impact** - Time to Impact

### **Quality Scores:**
10. **plane_score** - Plane Score (0-10) - PRIMARY METRIC
11. **connection_score** - Connection Score (0-10)
12. **rotation_score** - Rotation Score (0-10)
13. **power_score** - Power Score

### **Power Metrics:**
14. **power** - Power - PRIMARY METRIC
15. **rotation_acceleration** - Rotational Acceleration

### **Mechanics Metrics:**
16. **early_connection** - Early Connection
17. **body_rotation** - Body Rotation

### **Additional Metrics:**
(Blast may have more - the exact list depends on sensor version and sport)

---

## MY RECOMMENDATION FOR DATABASE COLUMNS:

Extract these **TOP 10** as individual columns for fast queries:

```sql
ALTER TABLE blast_swings ADD COLUMN
  -- Speed (most important)
  bat_speed DECIMAL(5,2),           -- e.g., 72.50 mph

  -- Path (most important)
  attack_angle DECIMAL(5,2),        -- e.g., 15.20 degrees

  -- Timing
  time_to_contact DECIMAL(6,3),    -- e.g., 0.150 seconds

  -- Quality Scores
  plane_score INTEGER,               -- e.g., 8 (out of 10)
  connection_score INTEGER,          -- e.g., 7 (out of 10)
  rotation_score INTEGER,            -- e.g., 9 (out of 10)

  -- Power
  power DECIMAL(7,2),                -- e.g., 1250.00
  peak_hand_speed DECIMAL(5,2),     -- e.g., 22.50 mph

  -- Path Quality
  on_plane_efficiency DECIMAL(5,2), -- e.g., 85.50 %
  vertical_bat_angle DECIMAL(5,2);  -- e.g., 12.30 degrees
```

**Keep ALL metrics in JSONB for:**
- Flexibility (new metrics added by Blast)
- Rare metrics you don't query often
- Future analysis needs

---

## USAGE FOR PAIRED ANALYSIS:

With these columns, you can do:

**Quality Swing Analysis:**
```sql
SELECT * FROM blast_swings
WHERE bat_speed > 70
  AND attack_angle BETWEEN 15 AND 25
  AND plane_score >= 7;
```

**Power Hitters:**
```sql
SELECT * FROM blast_swings
WHERE bat_speed > 75
  AND power > 1000
  AND connection_score >= 8;
```

**Sweet Spot Swings:**
```sql
SELECT * FROM blast_swings
WHERE attack_angle BETWEEN 10 AND 30
  AND on_plane_efficiency > 80
  AND time_to_contact < 0.18;
```

---

## IMPORTANT NOTES:

1. **Metric availability** varies by:
   - Blast sensor model (bat sensor vs swing tracer)
   - Sport (baseball vs softball)
   - Firmware version

2. **Some swings may have NULL values** for certain metrics

3. **Units:**
   - Speed: mph
   - Angles: degrees
   - Time: seconds
   - Scores: 0-10 scale
   - Power: arbitrary units

4. **The API returns ~15-20 metrics** per swing on average

---

## NEXT STEPS:

**Tell me which metrics YOU want as columns, then I'll:**
1. Create the migration SQL
2. Update the sync endpoint to extract those metrics
3. Backfill existing data in database

**Or just say "use your recommendation" and I'll use the top 10 above.**
