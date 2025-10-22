# ASP Boost+ Custom Features & Requirements

## Organization Structure
- Single organization: Atlantic Sports Performance
- No org switcher needed
- All data belongs to one org_id

## Coach/Athlete Visibility Rules

### Requirement
Coaches should only see athletes they're assigned to coach, not all athletes in the organization.

### Implementation (Built in Database)
✅ Already implemented via `staff_team_assignments` table

**How it works:**
1. Coaches are assigned to specific teams via `staff_team_assignments`
2. Athletes belong to teams via `team_members`
3. Coaches can only see athletes on their assigned teams

**Example:**
- Coach Tom is assigned to "17U Showcase" team
- Jake Thompson is on "17U Showcase" team
- ✅ Coach Tom can see Jake
- ❌ Coach Tom cannot see athletes on "College Prep" team

### Database Schema