-- RosterDNA Analytics Cleanup Script
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- https://supabase.com/dashboard/project/lodivrxjbdblrhlvbmdh/sql

-- Step 1: See what we're about to delete
SELECT 'BEFORE CLEANUP' as status, count(*) as total_events FROM analytics_events;

-- Step 2: Delete page_duration events > 30 minutes (1800 seconds) — idle tabs
DELETE FROM analytics_events
WHERE event = 'page_duration'
  AND (properties->>'seconds')::int > 1800;

-- Step 3: Delete page_duration events < 2 seconds — bots/accidental
DELETE FROM analytics_events
WHERE event = 'page_duration'
  AND (properties->>'seconds')::int < 2;

-- Step 4: Delete duplicate events (keep the first, delete later ones)
-- Duplicates = same event, session_id, path, within 3 seconds of each other
DELETE FROM analytics_events
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      event,
      session_id,
      properties->>'path' as path,
      timestamp,
      LAG(timestamp) OVER (
        PARTITION BY event, session_id, properties->>'path' 
        ORDER BY timestamp
      ) as prev_timestamp
    FROM analytics_events
  ) sub
  WHERE prev_timestamp IS NOT NULL
    AND EXTRACT(EPOCH FROM (timestamp::timestamptz - prev_timestamp::timestamptz)) < 3
);

-- Step 5: Verify results
SELECT 'AFTER CLEANUP' as status, count(*) as total_events FROM analytics_events;

SELECT event, count(*) as cnt 
FROM analytics_events 
GROUP BY event 
ORDER BY cnt DESC;
