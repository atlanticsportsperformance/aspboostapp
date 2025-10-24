# Database Migrations

## Running Migrations

### Plan Tags Table Migration

To enable plan tags functionality, you need to create the `plan_tags` table in your Supabase database.

**Option 1: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `create_plan_tags_table.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the migration

**Option 2: Using Supabase CLI**

If you have the Supabase CLI installed and linked to your project:

```bash
npx supabase db push --include-all
```

**Option 3: Direct Database Connection**

If you have direct database access:

```bash
psql <your-database-url> -f migrations/create_plan_tags_table.sql
```

## What This Migration Does

The `create_plan_tags_table.sql` migration creates:

- **plan_tags table**: Stores available tags for categorizing training plans
  - `id` (uuid): Primary key
  - `name` (text): Unique tag name
  - `created_at` (timestamp): Creation timestamp
  - `updated_at` (timestamp): Last update timestamp

- **Row Level Security (RLS)**: Policies allowing authenticated users to:
  - Read all plan tags
  - Create new plan tags
  - Update existing plan tags
  - Delete plan tags

- **Indexes**: Index on `name` column for faster lookups

- **Triggers**: Automatic `updated_at` timestamp updates

## Verification

After running the migration, verify the table was created:

```sql
SELECT * FROM plan_tags;
```

You should see an empty table with columns: id, name, created_at, updated_at.

## Using Plan Tags

Once the migration is complete:

1. Navigate to **Dashboard → Training Plans**
2. Click the **"Manage Tags"** button in the header
3. Create your first plan tag (e.g., "beginner", "advanced", "off-season")
4. When creating/editing a plan, you can now select from these tags

Tags help organize and filter your training plans for easier management.
