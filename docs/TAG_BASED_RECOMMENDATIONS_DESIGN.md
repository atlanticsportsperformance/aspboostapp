# Tag-Based Exercise Recommendation System

## Overview
Athletes have tags (pitcher, velocity_focus, shoulder_mobility, etc.). Exercises also have tags. When building workouts for specific athletes, the system recommends exercises that match the athlete's tags.

---

## Database Schema

### 1. Athletes Table (Already Exists)
Add `training_tags` column to store athlete-specific training focuses:

```sql
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS training_tags text[] DEFAULT '{}';

-- Example:
-- training_tags: ['pitcher', 'velocity_focus', 'shoulder_mobility', 'right_handed']
```

### 2. Exercises Table (Already Has Tags)
```sql
-- Already exists:
exercises.tags (text[])

-- Example:
-- tags: ['throwing', 'velocity', 'shoulder_health', 'upper_body']
```

### 3. Workout Instance Context (Already Exists)
```sql
workout_instances:
  - athlete_id (uuid) -- Links to specific athlete
  - workout_id (uuid) -- Links to workout template
```

---

## Recommendation Logic

### Matching Algorithm
```typescript
function getRecommendedExercises(
  athleteTags: string[],
  allExercises: Exercise[]
): Exercise[] {
  return allExercises
    .map(exercise => {
      // Count how many tags match
      const matchCount = exercise.tags.filter(tag =>
        athleteTags.includes(tag)
      ).length;

      return { exercise, matchCount };
    })
    .filter(item => item.matchCount > 0) // Only exercises with at least 1 match
    .sort((a, b) => b.matchCount - a.matchCount); // Sort by relevance
}
```

### Recommendation Tiers
- **Highly Recommended** (3+ matching tags): Green badge, top of list
- **Recommended** (2 matching tags): Blue badge, middle of list
- **Relevant** (1 matching tag): Gray badge, lower in list
- **Not Recommended** (0 matching tags): Hidden or at bottom

---

## UI Implementation

### Context: Building Workout for Specific Athlete

#### Add Exercise Dialog Changes:
```typescript
// When in athlete-specific context:
<AddExerciseDialog
  athleteId={currentAthleteId} // NEW: Pass athlete context
  onAdd={handleAddExercise}
  onClose={onClose}
/>

// Dialog shows:
// 1. Athlete info at top: "Building for: Jake Thompson (Pitcher, Velocity Focus)"
// 2. Exercises sorted by tag match
// 3. Visual badges showing match level
```

#### Example UI:
```
┌─────────────────────────────────────────────────┐
│ Building workout for: Jake Thompson             │
│ Tags: Pitcher, Velocity Focus, Shoulder Mobility│
└─────────────────────────────────────────────────┘

🟢 HIGHLY RECOMMENDED (3 matches)
  ✓ Weighted Ball Throws
    Tags: pitcher, velocity_focus, throwing
    Matches: pitcher, velocity_focus, throwing

🔵 RECOMMENDED (2 matches)
  ✓ Shoulder CARs
    Tags: pitcher, shoulder_mobility, warmup
    Matches: pitcher, shoulder_mobility

🔵 RECOMMENDED (2 matches)
  ✓ Long Toss
    Tags: pitcher, velocity_focus
    Matches: pitcher, velocity_focus

⚪ RELEVANT (1 match)
  ✓ Band Pull-Aparts
    Tags: shoulder_mobility, upper_body
    Matches: shoulder_mobility

────────────────────────────────────────────────
All Other Exercises (0 matches)
  • Back Squat
  • Bench Press
  etc...
```

---

## Implementation Phases

### Phase 1: Database Setup
1. Add `training_tags` to athletes table
2. Create athlete tag management UI
3. Ensure exercises have tags (already done)

### Phase 2: Context Detection
Determine when we're building for a specific athlete:
- **Workout Builder** → Check URL: `/workouts/[id]/for-athlete/[athleteId]`
- **Calendar View** → Building workout on athlete's calendar
- **Plan Assignment** → Assigning to specific athlete

### Phase 3: Recommendation Engine
- Query athlete tags
- Filter/sort exercises by match
- Display visual indicators

### Phase 4: Placeholder Resolution
When workout template has placeholders:
```typescript
// Template: "Upper Body Power" placeholder
// For Jake (pitcher, velocity_focus):
//   → Suggests: Medicine Ball Chest Pass (matches: velocity_focus)
//
// For Emma (catcher, blocking):
//   → Suggests: Landmine Press (matches: upper_body, blocking)
```

---

## Example Scenarios

### Scenario 1: Generic Workout Builder
```
User: Creates workout "Upper Body Day"
Context: No specific athlete
Result: All exercises shown, no filtering
Use Case: Template workout for entire team
```

### Scenario 2: Athlete-Specific Workout
```
User: Creates workout for Jake Thompson (pitcher, velocity_focus)
Context: athleteId = jake-123
Result: Exercises sorted by tag match, recommendations shown
Use Case: Personalized training for Jake's velocity program
```

### Scenario 3: Plan with Placeholders
```
User: Creates plan "Off-Season Velocity Program"
Placeholder: "Rotational Power Exercise"
Tags Required: ['velocity', 'rotation']

When assigned to Jake:
  → Recommends: Med Ball Rotational Throw (velocity, rotation, throwing)

When assigned to Emma:
  → Recommends: Landmine Rotation (velocity, rotation, core)
```

---

## Database Migrations Needed

### 1. Add Athlete Training Tags
```sql
-- File: ADD_ATHLETE_TRAINING_TAGS.sql

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS training_tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_athletes_training_tags
  ON athletes USING GIN (training_tags);

COMMENT ON COLUMN athletes.training_tags
  IS 'Training focus tags for this athlete (pitcher, velocity_focus, etc.) used for exercise recommendations';
```

### 2. Tag Matching Function (Optional - for Performance)
```sql
-- File: CREATE_TAG_MATCH_FUNCTION.sql

CREATE OR REPLACE FUNCTION count_tag_matches(
  athlete_tags text[],
  exercise_tags text[]
) RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM unnest(athlete_tags) AS tag
  WHERE tag = ANY(exercise_tags);
$$ LANGUAGE SQL IMMUTABLE;
```

---

## UI Components Needed

### 1. Athlete Tag Manager
**Location**: `/dashboard/athletes/[id]` (edit page)
**Purpose**: Assign tags to athlete

```typescript
<AthleteTagSelector
  athleteId={athlete.id}
  selectedTags={athlete.training_tags}
  availableTags={[
    'pitcher', 'catcher', 'infielder', 'outfielder',
    'velocity_focus', 'command_focus', 'power_hitter',
    'contact_hitter', 'speed_training', 'strength_focus',
    'mobility_work', 'injury_prevention', 'post_surgery'
  ]}
  onUpdate={handleUpdateTags}
/>
```

### 2. Exercise Recommendation Badge
**Location**: Add Exercise Dialog
**Purpose**: Show match level

```typescript
<RecommendationBadge matchCount={3} />
// Renders: 🟢 Highly Recommended (3 matches)
```

### 3. Tag Match Indicator
**Location**: Exercise list items
**Purpose**: Show which tags matched

```typescript
<TagMatchIndicator
  athleteTags={['pitcher', 'velocity_focus']}
  exerciseTags={['pitcher', 'velocity_focus', 'throwing']}
/>
// Renders: Matches: pitcher, velocity_focus
```

---

## API/Query Changes

### Get Exercises with Athlete Context
```typescript
async function getExercisesForAthlete(athleteId: string) {
  // 1. Get athlete tags
  const { data: athlete } = await supabase
    .from('athletes')
    .select('training_tags')
    .eq('id', athleteId)
    .single();

  // 2. Get all exercises
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_active', true);

  // 3. Calculate match scores
  const scored = exercises.map(ex => ({
    ...ex,
    matchCount: ex.tags.filter(t => athlete.training_tags.includes(t)).length,
    matchingTags: ex.tags.filter(t => athlete.training_tags.includes(t))
  }));

  // 4. Sort by relevance
  return scored.sort((a, b) => b.matchCount - a.matchCount);
}
```

---

## Configuration

### Tag Categories
Organize tags into categories for better UX:

```typescript
const TAG_CATEGORIES = {
  position: ['pitcher', 'catcher', 'infielder', 'outfielder'],
  focus: ['velocity_focus', 'command_focus', 'power', 'contact', 'speed'],
  phase: ['off_season', 'pre_season', 'in_season', 'post_season'],
  needs: ['mobility_work', 'strength_focus', 'injury_prevention', 'return_to_play']
};
```

### Recommendation Thresholds
```typescript
const RECOMMENDATION_LEVELS = {
  HIGHLY_RECOMMENDED: { minMatches: 3, color: 'green', icon: '🟢' },
  RECOMMENDED: { minMatches: 2, color: 'blue', icon: '🔵' },
  RELEVANT: { minMatches: 1, color: 'gray', icon: '⚪' },
  NOT_RECOMMENDED: { minMatches: 0, color: 'transparent', icon: '' }
};
```

---

## Future Enhancements

1. **AI-Powered Suggestions**: "Based on Jake's tags and recent performance, we suggest..."
2. **Auto-Tagging**: Suggest tags for athletes based on position/metrics
3. **Tag Analytics**: "Your pitchers most commonly use these exercises..."
4. **Smart Placeholders**: Placeholder that auto-resolves based on athlete tags
5. **Progression Tracking**: Track which exercises work best for athletes with certain tags

---

## Next Steps

1. ✅ Run athlete training tags migration
2. ✅ Create athlete tag selector UI
3. ✅ Update add exercise dialog to accept athlete context
4. ✅ Implement recommendation algorithm
5. ✅ Add visual indicators for matches
6. ✅ Test with real athlete data
