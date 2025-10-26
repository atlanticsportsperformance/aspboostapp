# Driveline Biomechanics Percentile Integration

## Overview

Evan's app uses **Driveline Baseball's open-source biomechanics database** to provide percentile rankings for VALD ForceDecks metrics. This allows athletes to see how they compare to a large population dataset.

## What is Driveline's Database?

**Driveline Baseball** has published open-source biomechanics data from thousands of athletes tested at their facility. This includes:
- Force plate metrics (VALD ForceDecks)
- Range of motion measurements
- Pitching/batting velocities
- Multiple play levels (Youth, High School, College, Pro)

**Dataset name**: `hp_obp` (High Performance - Open Biomechanics Project)

**Public Access**: Available through Driveline's research portal

## How It Works in Evan's App

### 1. Data Source (`hp_obp.csv`)
- CSV file with thousands of test results
- Each row = one athlete test session
- Columns = various biomechanics metrics
- **Note**: CSV file NOT in git repo (too large, or external download)

### 2. Percentile Computation (`computePercentiles.ts`)

**Location**: `scripts/computePercentiles.ts`

**Process**:
```
hp_obp.csv
  ↓ Parse CSV
  ↓ Extract numeric columns
  ↓ Calculate percentiles (1st, 5th, 10th, 20th, 25th, 30th, 40th, 50th, 60th, 70th, 75th, 80th, 90th, 95th, 99th)
  ↓ Include min, max, mean
  ↓ Save to JSON
hp_obp_percentiles.json (18 KB)
```

**Key Metrics Calculated**:
```javascript
{
  "jump_height_(imp-mom)_[cm]_mean_cmj": {
    "1": 17.4168,    // 1st percentile value
    "5": 22.586,     // 5th percentile
    "50": 39.83,     // Median
    "95": 52.058,    // 95th percentile
    "min": 9.88,     // Minimum in dataset
    "max": 62.26,    // Maximum in dataset
    "mean": 39.0058  // Average
  }
}
```

### 3. Metrics Included

#### CMJ (Countermovement Jump):
- `jump_height_(imp-mom)_[cm]_mean_cmj`
- `lower-limb_stiffness_[n/m]_mean_cmj`
- `peak_power_[w]_mean_cmj`
- `peak_power_/_bm_[w/kg]_mean_cmj` (body mass relative)
- `eccentric_braking_rfd_[n/s]_mean_cmj`
- `eccentric_duration_[ms]_mean_cmj`
- `concentric_duration_[ms]_mean_cmj`
- `rsi-modified_[m/s]_mean_cmj`
- `countermovement_depth_[cm]_mean_cmj`
- Various asymmetry metrics

#### SJ (Squat Jump):
- `jump_height_(imp-mom)_[cm]_mean_sj`
- `peak_power_[w]_mean_sj`
- `peak_power_/_bm_[w/kg]_mean_sj`
- Asymmetry metrics

#### IMTP (Isometric Mid-Thigh Pull):
- `peak_vertical_force_[n]_max_imtp`
- `net_peak_vertical_force_[n]_max_imtp`
- `force_at_100ms_[n]_max_imtp`
- `force_at_150ms_[n]_max_imtp`
- `force_at_200ms_[n]_max_imtp`
- `relative_strength` (calculated field)

#### HJ/HT (Hop Test):
- `best_active_stiffness_[n/m]_mean_ht`
- `best_jump_height_(flight_time)_[cm]_mean_ht`
- `best_rsi_(flight/contact_time)_mean_ht`
- `best_rsi_(jump_height/contact_time)_[m/s]_mean_ht`

#### PPU (Prone Push-Up):
- `peak_takeoff_force_[n]_mean_pp`
- `peak_eccentric_force_[n]_mean_pp`
- Asymmetry metrics

#### Additional Metrics:
- T-Spine ROM (rotation)
- Shoulder ER/IR (external/internal rotation)
- Pitch speed (mph)
- Bat speed (mph)
- Body weight

### 4. Percentile Calculation Function

**Used in**: Charts and composite score API

```typescript
function percentRank(value: number, ref: Record<string, number>): number {
  // 1. Get percentile points from reference data
  const points = Object.entries(ref)
    .map(([k, v]) => [Number(k), Number(v)])
    .filter(([p, v]) => Number.isFinite(p) && Number.isFinite(v))

  // 2. Sort by value (ascending)
  points.sort((a, b) => a[1] - b[1])

  // 3. Find where the athlete's value falls
  // 4. Linearly interpolate between two percentile points
  // 5. Return percentile rank (0-100)
}
```

**Example**:
```typescript
// Athlete jumps 45 cm
// Reference data shows:
//   50th percentile = 39.83 cm
//   60th percentile = 41.75 cm
//   70th percentile = 43.70 cm
//   75th percentile = 44.65 cm
//   80th percentile = 45.91 cm

// Result: ~79th percentile (interpolated between 75th and 80th)
```

### 5. Tier Classification

**Tiers based on percentiles:**
- **Foundational**: < 60th percentile (Purple)
- **Developing**: 60th-74th percentile (Gray)
- **Advanced**: 75th-89th percentile (Yellow/Amber)
- **Elite**: 90th+ percentile (Cyan)

**Visual representation**:
```typescript
function tierColors(value: number, lines: { developing, advanced, elite }) {
  if (value >= elite) return cyan
  if (value >= advanced) return amber
  if (value >= developing) return gray
  return purple
}
```

### 6. Composite Score

**Purpose**: Single number representing overall athletic performance

**Calculation**:
```typescript
const compositeScore = (
  netPeakVerticalForcePercentile +    // IMTP
  relativeStrengthPercentile +        // IMTP
  peakTakeoffForcePercentile +        // PPU
  peakTakeoffPowerPercentile +        // SJ
  bodymassRelativePercentile +        // SJ
  reactiveStrengthIndexPercentile     // HJ
) / 6;
```

**Example**:
```
IMTP Net Peak Force: 85th percentile
IMTP Relative Strength: 78th percentile
PPU Peak Force: 82nd percentile
SJ Peak Power: 90th percentile
SJ BM-Relative Power: 88th percentile
HJ RSI: 75th percentile

Composite Score = (85 + 78 + 82 + 90 + 88 + 75) / 6 = 83
```

**Storage**:
- Latest score: `athletes.vald_composite_score` (FLOAT)
- History: `athletes.vald_composite_history` (JSONB array)

```json
[
  { "score": 78.5, "date": "2024-10-15T10:00:00Z" },
  { "score": 81.2, "date": "2024-11-01T14:30:00Z" },
  { "score": 83.0, "date": "2024-11-20T09:15:00Z" }
]
```

## Implementation in Your App

### Step 1: Obtain Driveline Data

**Option A: Direct from Driveline**
1. Visit Driveline's research portal
2. Download the HP-OBP dataset
3. Save as `public/hp_obp.csv`

**Option B: Use Evan's Processed Data**
- Copy `hp_obp_percentiles.json` from atlantic_evan_app
- Place in your `public/` folder
- Skip CSV processing step

### Step 2: Copy Percentile Files

```bash
# Copy the percentile JSON (18 KB)
cp atlantic_evan_app/atlantic-app-improved/public/hp_obp_percentiles.json \\
   public/hp_obp_percentiles.json

# Copy the computation script (optional, if you want to regenerate)
cp atlantic_evan_app/atlantic-app-improved/scripts/computePercentiles.ts \\
   scripts/computePercentiles.ts
```

### Step 3: Create Percentile Utility Functions

**File**: `lib/vald/percentiles.ts`

```typescript
export function percentRank(
  value: number,
  ref: Record<string, number>
): number {
  if (!ref || typeof value !== 'number' || Number.isNaN(value)) return 0

  const points = Object.entries(ref)
    .map(([k, v]) => [Number(k), Number(v)] as [number, number])
    .filter(([p, v]) => Number.isFinite(p) && Number.isFinite(v))
    .sort((a, b) => a[1] - b[1])

  if (points.length === 0) return 0

  const [firstP, firstV] = points[0]
  const [lastP, lastV] = points[points.length - 1]

  if (value <= firstV) return Math.max(0, Math.min(100, firstP))
  if (value >= lastV) return Math.max(0, Math.min(100, lastP))

  for (let i = 0; i < points.length - 1; i++) {
    const [p1, v1] = points[i]
    const [p2, v2] = points[i + 1]
    if (value >= v1 && value <= v2) {
      if (v2 === v1) return Math.max(0, Math.min(100, p2))
      const t = (value - v1) / (v2 - v1)
      return Math.max(0, Math.min(100, p1 + t * (p2 - p1)))
    }
  }

  return 0
}

export function getTier(percentile: number): {
  name: string;
  color: string;
  bgColor: string;
} {
  if (percentile >= 90) {
    return { name: 'Elite', color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.1)' }
  }
  if (percentile >= 75) {
    return { name: 'Advanced', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.1)' }
  }
  if (percentile >= 60) {
    return { name: 'Developing', color: '#cbd5e1', bgColor: 'rgba(203, 213, 225, 0.1)' }
  }
  return { name: 'Foundational', color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.1)' }
}

export async function loadPercentiles(): Promise<Record<string, Record<string, number>>> {
  const res = await fetch('/hp_obp_percentiles.json')
  if (!res.ok) throw new Error('Failed to load percentiles')
  return await res.json()
}
```

### Step 4: Add Composite Score Calculation

**File**: `lib/vald/composite-score.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { percentRank, loadPercentiles } from './percentiles'

export async function calculateCompositeScore(athleteId: string) {
  const supabase = await createClient()
  const percentiles = await loadPercentiles()

  // Get latest tests (within same day)
  const tests = await getLatestTestSession(supabase, athleteId)

  // Calculate average values for each metric
  const imtpData = await calculateIMTPMetrics(supabase, tests.imtp)
  const ppuData = await calculatePPUMetrics(supabase, tests.ppu)
  const sjData = await calculateSJMetrics(supabase, tests.sj)
  const hjData = await calculateHJMetrics(supabase, tests.hj)

  // Get percentile rankings
  const scores = {
    imtpNetPeak: percentRank(
      imtpData.netPeakVerticalForce,
      percentiles["net_peak_vertical_force_[n]_max_imtp"]
    ),
    imtpRelStrength: percentRank(
      imtpData.relativeStrength,
      percentiles["relative_strength"]
    ),
    ppuPeakForce: percentRank(
      ppuData.peakTakeoffForce,
      percentiles["peak_takeoff_force_[n]_mean_pp"]
    ),
    sjPeakPower: percentRank(
      sjData.peakTakeoffPower,
      percentiles["peak_power_[w]_mean_sj"]
    ),
    sjBMRelative: percentRank(
      sjData.bodymassRelativePower,
      percentiles["peak_power_/_bm_[w/kg]_mean_sj"]
    ),
    hjRSI: percentRank(
      hjData.reactiveStrengthIndex,
      percentiles["best_rsi_(flight/contact_time)_mean_ht"]
    ),
  }

  // Calculate composite (average of all percentiles)
  const composite = Object.values(scores).reduce((a, b) => a + b, 0) / 6

  // Store in database
  await storeCompositeScore(supabase, athleteId, composite, scores)

  return { composite, scores }
}
```

### Step 5: Display Percentiles in UI

**Example Component**: `components/vald/metric-card.tsx`

```typescript
export function MetricCard({
  label,
  value,
  unit,
  percentile
}: MetricCardProps) {
  const tier = getTier(percentile)

  return (
    <div className="p-4 rounded-lg border" style={{ borderColor: tier.color }}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold">{value} {unit}</p>
        </div>
        <div
          className="px-2 py-1 rounded text-xs font-semibold"
          style={{ color: tier.color, backgroundColor: tier.bgColor }}
        >
          {percentile}th %ile
        </div>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${percentile}%`,
                backgroundColor: tier.color
              }}
            />
          </div>
          <span className="text-xs" style={{ color: tier.color }}>
            {tier.name}
          </span>
        </div>
      </div>
    </div>
  )
}
```

## Database Schema Additions

Already added in foundation migration:

```sql
-- Composite score tracking
ALTER TABLE athletes ADD COLUMN vald_composite_score FLOAT;
ALTER TABLE athletes ADD COLUMN vald_composite_history JSONB DEFAULT '[]'::jsonb;
```

## API Endpoints to Create

### GET `/api/athletes/[id]/vald/composite-score`

Returns composite score and component percentiles:

```json
{
  "composite_score": 83.2,
  "percentiles": {
    "imtp_net_peak": 85,
    "imtp_relative_strength": 78,
    "ppu_peak_force": 82,
    "sj_peak_power": 90,
    "sj_bm_relative": 88,
    "hj_rsi": 75
  },
  "history": [
    { "score": 78.5, "date": "2024-10-15T10:00:00Z" },
    { "score": 81.2, "date": "2024-11-01T14:30:00Z" },
    { "score": 83.2, "date": "2024-11-20T09:15:00Z" }
  ]
}
```

### GET `/api/athletes/[id]/vald/metrics/[testType]`

Returns metrics with percentiles for a specific test:

```json
{
  "test_type": "SJ",
  "latest_test": "2024-11-20T09:15:00Z",
  "metrics": {
    "peak_power": {
      "value": 4850,
      "unit": "W",
      "percentile": 90,
      "tier": "Elite"
    },
    "bm_relative_power": {
      "value": 62.5,
      "unit": "W/kg",
      "percentile": 88,
      "tier": "Elite"
    }
  }
}
```

## Benefits of Percentile Integration

1. **Context for Athletes**: "You're in the 85th percentile" is more meaningful than raw numbers
2. **Goal Setting**: "Let's get you to the 90th percentile (Elite tier)"
3. **Motivation**: Visual progress bars and tier badges
4. **Comparisons**: See how you stack up against thousands of athletes
5. **Composite Score**: Single metric to track overall performance

## Data Source Attribution

Always credit Driveline Baseball:

```
"Percentile data based on Driveline Baseball's High Performance
Open Biomechanics Project (HP-OBP). Sample size: [N] athletes."
```

## Next Steps to Implement

1. ✅ Copy `hp_obp_percentiles.json` to your `public/` folder
2. ✅ Create `lib/vald/percentiles.ts` with utility functions
3. ✅ Create `lib/vald/composite-score.ts` for score calculation
4. ✅ Add API endpoint for composite score
5. ✅ Create UI components to display percentiles
6. ✅ Add percentile bars to test result cards
7. ✅ Build composite score dashboard/widget
8. ✅ Add tier badges throughout the UI

## Files to Copy from atlantic_evan_app

```
atlantic_evan_app/atlantic-app-improved/public/hp_obp_percentiles.json
  → public/hp_obp_percentiles.json

atlantic_evan_app/atlantic-app-improved/scripts/computePercentiles.ts
  → scripts/computePercentiles.ts (optional)
```

## Summary

Evan's app uses Driveline's open-source biomechanics data to provide:
- **Percentile rankings** for all major VALD metrics
- **Tier classifications** (Foundational, Developing, Advanced, Elite)
- **Composite scores** combining multiple test types
- **Historical tracking** of performance over time

This adds tremendous value by giving athletes and coaches context for their numbers, making raw metrics much more actionable and motivating.
