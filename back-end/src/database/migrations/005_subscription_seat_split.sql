-- 005_subscription_seat_split.sql
--
-- SPOC_BILLING_ENFORCEMENT_DIAGNOSIS.md §5.1: seats_purchased was a single
-- combined student+faculty pool, which let an admin burn the whole thing
-- hiring only one role. Split into two caps, matching what the quote
-- actually priced (rate-card.ts bands students and faculty differently).
--
-- Same status as every migration in this set: schema parity, not the live
-- store — InMemoryDbService is what onboarding.service.ts actually reads and
-- writes. Additive, per the append-only convention: 003 is never edited.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS student_seats int;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS faculty_seats int;

-- Backfill any pre-existing row from its own quote's metrics — the split was
-- always implicit in quotes.metrics (student_count/faculty_count), just
-- never carried onto the subscription row itself.
UPDATE subscriptions s
SET student_seats = COALESCE(s.student_seats, (q.metrics->>'student_count')::int),
    faculty_seats = COALESCE(s.faculty_seats, (q.metrics->>'faculty_count')::int)
FROM quotes q
WHERE q.quote_id = s.quote_id
  AND (s.student_seats IS NULL OR s.faculty_seats IS NULL);

ALTER TABLE subscriptions ALTER COLUMN student_seats SET NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN faculty_seats SET NOT NULL;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS seats_purchased;
