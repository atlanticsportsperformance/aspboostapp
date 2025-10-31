# Athlete View Types Architecture

## Overview

The athlete dashboard now supports different views based on the athlete's assigned `view_type_id`. This allows coaches to customize what each athlete sees based on their training focus (e.g., Two Way Performance, Pitching, Hitting, Strength & Conditioning).

## Database Schema

### `athlete_view_types` Table
```sql
- id: UUID (Primary Key)
- org_id: UUID (Foreign Key to organizations)
- name: VARCHAR (e.g., "Two Way Performance", "Pitching", "Hitting")
- description: TEXT
- display_order: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### `athletes` Table
```sql
- view_type_id: UUID (Foreign Key to athlete_view_types, nullable)
```

## Architecture

### 1. Main Router (`app/athlete-dashboard/page.tsx`)

This is the entry point for the athlete dashboard. It:
- Fetches the athlete's profile including `view_type_id`
- Fetches the associated view type details (name, description)
- Routes to the appropriate view component based on `view_type_id`
- Shows a badge indicating which view type is active

### 2. View Components (`components/dashboard/athlete-views/`)

Each view type has its own component:

```
components/dashboard/athlete-views/
├── DefaultAthleteView.tsx           # No view type assigned
├── TwoWayPerformanceView.tsx        # Two Way Performance focus
├── PitchingView.tsx                 # Pitching focus
├── HittingView.tsx                  # Hitting focus
└── StrengthConditioningView.tsx    # Strength & Conditioning focus
```

### 3. View Type Management

#### Staff/Coach Interface
- **Settings Tab**: Coaches can assign view types to athletes via the athlete settings tab
- **Admin Tab**: Super admins can create/edit view types

#### Athlete Interface
- Athletes see their assigned view automatically
- A badge at the top shows which view type they're using

## Implementation Guide

### Step 1: Create a New View Type Component

```tsx
// components/dashboard/athlete-views/MyCustomView.tsx
'use client';

interface MyCustomViewProps {
  athleteId: string;
  fullName: string;
}

export default function MyCustomView({ athleteId, fullName }: MyCustomViewProps) {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        {/* Your custom view content */}
      </div>
    </div>
  );
}
```

### Step 2: Add Routing Logic

Update `app/athlete-dashboard/page.tsx`:

```tsx
import MyCustomView from '@/components/dashboard/athlete-views/MyCustomView';

// Inside the component:
if (viewTypeName === 'My Custom View Name') {
  return <MyCustomView athleteId={athleteId} fullName={athleteName} />;
}
```

### Step 3: Create View Type in Database

Use the Admin interface to create a new view type with:
- Name: "My Custom View Name"
- Description: Clear description of what this view is for
- Display Order: Order in which it appears in dropdowns

### Step 4: Assign to Athletes

Coaches can assign the view type to athletes via:
1. Navigate to athlete profile
2. Go to Settings tab
3. Select view type from dropdown
4. Save

## Features by View Type

### Default View (No View Type)
- General purpose dashboard
- Force plate testing
- Workout tracking
- Performance metrics

### Two Way Performance View (Example)
- Pitching metrics
- Hitting metrics
- Force plate testing
- Velocity tracking
- Combined performance dashboard

### Pitching View (Example)
- Blast Motion pitching metrics
- Velocity trends
- Pitch count tracking
- Recovery status
- Force plate for lower body power

### Hitting View (Example)
- Blast Motion hitting metrics
- Exit velocity tracking
- Launch angle analysis
- Bat speed trends
- Force plate for rotational power

### Strength & Conditioning View (Example)
- Force plate testing focus
- CMJ, SJ, IMTP tests
- Strength percentiles
- Power output tracking
- Training load management

## Current Status

✅ **Completed**:
- Database schema exists
- View type assignment in athlete settings
- Main router with view type detection
- View type badge display
- DefaultAthleteView component created
- Architecture documentation

🚧 **In Progress**:
- Creating view-specific components

⏳ **To Do**:
- Implement all view-specific components
- Add feature-specific metrics for each view
- Test view switching
- Deploy and validate

## Testing

### Test View Type Assignment:
1. Go to `/dashboard/athletes/{id}` (coach view)
2. Click Settings tab
3. Select a view type
4. Save
5. Log in as that athlete
6. Verify correct view loads

### Test View Switching:
1. Assign different view types to test athletes
2. Log in as each athlete
3. Verify each sees their assigned view
4. Verify badge shows correct view type

## Future Enhancements

- [ ] Allow athletes to switch views (with coach approval)
- [ ] Add view-specific widgets/modules
- [ ] Custom metrics per view type
- [ ] View type templates
- [ ] Drag-and-drop dashboard customization
- [ ] View type permissions (hide/show certain features)

## Notes

- If an athlete has no `view_type_id`, they see the DefaultAthleteView
- View types are org-specific (each organization can create their own)
- Inactive view types don't appear in dropdowns
- The legacy `AthleteDashboardView` is kept as fallback for now
