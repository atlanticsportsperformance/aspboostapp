# Driveline Percentile Integration - Setup Complete ✅

## What We Found

Evan's app integrates **Driveline Baseball's open-source biomechanics database** to provide percentile rankings for VALD metrics. This allows athletes to see where they rank compared to thousands of other athletes.

## Files Copied to Your Project

### 1. Percentile Data (18 KB)
**Location**: `public/hp_obp_percentiles.json`

Contains pre-computed percentiles for 44 metrics across all test types:
- 16 CMJ metrics
- 3 SJ metrics
- 5 IMTP metrics
- 4 HJ/HT metrics
- 4 PPU metrics
- 12 additional metrics (ROM, velocity, body weight, etc.)

**Format**:
```json
{
  "metric_name": {
    "1": 17.42,    // 1st percentile value
    "50": 39.83,   // Median
    "99": 57.46,   // 99th percentile
    "min": 9.88,
    "max": 62.26,
    "mean": 39.01
  }
}
```

### 2. Computation Script
**Location**: `scripts/computePercentiles.ts`

Script that processes raw CSV data and generates percentile JSON.
- Reads `public/hp_obp.csv` (not included - must obtain separately)
- Calculates percentiles: 1, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 99
- Outputs `public/hp_obp_percentiles.json`

**Usage** (if you get the CSV):
```bash
npx tsx scripts/computePercentiles.ts
```

## How It Works

### 1. Percentile Ranking Formula

```typescript
function percentRank(value: number, ref: Record<string, number>): number {
  // Takes athlete's metric value
  // Compares against reference percentile data
  // Returns where they rank (0-100)
}
```

**Example**:
```typescript
// Athlete's SJ peak power: 4850 W
// Reference data:
//   50th percentile: 4759 W
//   60th percentile: 5066 W
//   ... interpolate ...
// Result: ~58th percentile
```

### 2. Tier Classification

Based on percentile ranking:

| Percentile | Tier | Color | Badge |
|---|---|---|---|
| 90-100 | **Elite** | Cyan (#22d3ee) | ⭐ |
| 75-89 | **Advanced** | Amber (#fbbf24) | 🏆 |
| 60-74 | **Developing** | Gray (#cbd5e1) | 📈 |
| 0-59 | **Foundational** | Purple (#a78bfa) | 🌱 |

### 3. Composite Score

Combines 6 key metrics into a single performance score:

```
Composite = (
  IMTP Net Peak Force %ile +
  IMTP Relative Strength %ile +
  PPU Peak Force %ile +
  SJ Peak Power %ile +
  SJ BM-Relative Power %ile +
  HJ RSI %ile
) / 6
```

**Stored in**:
- `athletes.vald_composite_score` - Latest score
- `athletes.vald_composite_history` - JSON array of historical scores

## Metrics Available for Percentile Ranking

### CMJ (Countermovement Jump)
- Jump Height (imp-mom)
- Lower-Limb Stiffness
- Peak Power (absolute & relative to body mass)
- Eccentric Braking RFD
- Eccentric/Concentric Duration
- RSI-Modified
- Countermovement Depth
- Various asymmetry metrics

### SJ (Squat Jump)
- Jump Height (imp-mom)
- Peak Power (absolute & relative to body mass)
- Impulse asymmetry metrics

### IMTP (Isometric Mid-Thigh Pull)
- Peak Vertical Force
- Net Peak Vertical Force
- Force at 100ms, 150ms, 200ms
- Relative Strength (calculated field)

### HJ/HT (Hop Test)
- Active Stiffness
- Jump Height (flight time)
- RSI (flight/contact & jump height/contact)

### PPU (Prone Push-Up)
- Peak Takeoff Force
- Peak Eccentric Force
- Force asymmetry metrics

### Additional Metrics
- T-Spine ROM (rotation left/right)
- Shoulder ER/IR (external/internal rotation)
- Pitch Speed (mph)
- Bat Speed (mph)
- Body Weight
- Relative Strength

## Next Steps to Implement

### Phase 1: Core Functions (Recommended First)

1. **Create percentile utility** - `lib/vald/percentiles.ts`
   ```typescript
   export function percentRank(value, ref): number
   export function getTier(percentile): { name, color, bgColor }
   export async function loadPercentiles(): Promise<...>
   ```

2. **Add to test display** - Show percentile next to each metric
   ```typescript
   <MetricCard
     label="Jump Height"
     value={45.2}
     unit="cm"
     percentile={79}  // NEW
   />
   ```

### Phase 2: Composite Score

3. **Create composite calculator** - `lib/vald/composite-score.ts`
   ```typescript
   export async function calculateCompositeScore(athleteId)
   export async function updateCompositeHistory(athleteId, score)
   ```

4. **Add API endpoint** - `app/api/athletes/[id]/vald/composite-score/route.ts`
   ```typescript
   GET /api/athletes/:id/vald/composite-score
   // Returns composite score + component percentiles
   ```

5. **Build composite dashboard widget**
   - Radar chart showing 6 component scores
   - Line chart showing history over time
   - Current tier badge

### Phase 3: Enhanced UI

6. **Percentile bars** - Visual progress bars on metric cards
7. **Tier badges** - Color-coded badges (Elite, Advanced, etc.)
8. **Comparison view** - See how athlete improved over time
9. **Goal setting** - "You're 5 points away from Elite tier!"

## Example UI Implementation

### Metric Card with Percentile

```tsx
<div className="metric-card">
  <div className="metric-header">
    <span className="metric-label">Peak Power</span>
    <span className="percentile-badge elite">90th %ile</span>
  </div>

  <div className="metric-value">
    4850 <span className="unit">W</span>
  </div>

  <div className="percentile-bar">
    <div className="fill elite" style={{ width: '90%' }} />
  </div>

  <div className="tier-label">Elite</div>
</div>
```

### Composite Score Widget

```tsx
<div className="composite-score-widget">
  <div className="score-circle">
    <span className="score">83</span>
    <span className="label">Composite</span>
  </div>

  <div className="tier-badge advanced">Advanced</div>

  <div className="components">
    <MetricBar label="IMTP Force" percentile={85} />
    <MetricBar label="IMTP Strength" percentile={78} />
    <MetricBar label="PPU Force" percentile={82} />
    <MetricBar label="SJ Power" percentile={90} />
    <MetricBar label="SJ BM-Rel" percentile={88} />
    <MetricBar label="HJ RSI" percentile={75} />
  </div>
</div>
```

## Data Attribution

Always include attribution to Driveline:

```tsx
<div className="data-attribution">
  Percentile data from Driveline Baseball's High Performance
  Open Biomechanics Project (HP-OBP)
</div>
```

## Benefits

1. **Context**: Raw numbers → Percentile rankings
2. **Motivation**: "You're in the 85th percentile!" > "4850 W"
3. **Progress**: Track percentile improvement over time
4. **Goals**: "Let's get you to Elite tier (90th+)"
5. **Comparisons**: See how you stack up vs thousands of athletes

## Files in Your Project

```
✅ public/hp_obp_percentiles.json (18 KB)
✅ scripts/computePercentiles.ts (3.5 KB)
✅ docs/DRIVELINE_PERCENTILE_INTEGRATION.md (Full documentation)
✅ docs/DRIVELINE_SETUP_SUMMARY.md (This file)
```

## Summary

You now have:
- ✅ Percentile reference data for 44 VALD metrics
- ✅ Script to regenerate percentiles (if you get raw CSV)
- ✅ Complete documentation on how Evan's app uses this
- ✅ Implementation guide for your app

**Next**: Build the percentile utility functions and start displaying percentiles in your VALD metric cards!

The foundation is ready - now you can give your athletes meaningful context for their performance data! 🎯
