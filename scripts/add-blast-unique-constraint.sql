-- Add unique constraint to prevent duplicate blast_id entries for the same athlete
-- This ensures that even if the sync is run multiple times or concurrently,
-- the same swing can never be inserted twice

-- First, check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'blast_swings_athlete_blast_id_unique'
    ) THEN
        -- Add unique constraint on (athlete_id, blast_id)
        ALTER TABLE blast_swings
        ADD CONSTRAINT blast_swings_athlete_blast_id_unique
        UNIQUE (athlete_id, blast_id);

        RAISE NOTICE 'Added unique constraint: blast_swings_athlete_blast_id_unique';
    ELSE
        RAISE NOTICE 'Unique constraint already exists: blast_swings_athlete_blast_id_unique';
    END IF;
END $$;

-- Create index on blast_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_blast_swings_blast_id ON blast_swings(blast_id);

-- Verify constraint was added
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'blast_swings'::regclass
  AND conname = 'blast_swings_athlete_blast_id_unique';
