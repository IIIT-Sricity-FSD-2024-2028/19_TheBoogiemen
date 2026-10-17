-- 003_billing_pricing_schema.sql
--
-- Self-service SPOC onboarding: draft sessions, quotes, subscriptions and
-- mock payments. See ONBOARDING_PIPELINE_PLAN.md for the full design.
--
-- Additive only, per the append-only convention 001/002 already established.
-- Same status as every other table in this set: schema parity, not the live
-- store — this flow's actual read/write path is InMemoryDbService, matching
-- the rest of the app (0 of 176+ existing call sites use Postgres yet).
--
-- Table order below is CREATE-order, which is FK-dependency order, not the
-- pipeline's chronological order: onboarding_sessions -> quotes ->
-- subscriptions -> payments, because payments.subscription_id references
-- subscriptions, which must exist first even though a subscription is not
-- created until fulfillment, after the first payment attempt begins.

-- ── Draft sessions ───────────────────────────────────────────────────────────
--
-- Everything collected before an account is real: email, a bcrypt hash of the
-- chosen password, name, and college details. Addressed by a short-lived
-- signed cookie (bp_onboarding) distinct from the real session cookie — see
-- onboarding-cookie.ts. No users/colleges row exists until fulfillment
-- (payments.status = 'captured'); until then this table is the only record
-- of the prospect.

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  session_id     text PRIMARY KEY,
  email          text NOT NULL,
  -- Cleared to NULL once fulfilled — the users row created at that point
  -- owns the only live copy, so a completed draft has no reason to keep one.
  password_hash  text NOT NULL,
  first_name     text,
  last_name      text,
  phone          text,
  college_name   text NOT NULL,
  city           text,
  state          text,
  type           text CHECK (type IN ('government', 'private', 'deemed')),
  status         text NOT NULL DEFAULT 'details'
                 CHECK (status IN ('details', 'quoted', 'accepted', 'completed', 'expired')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL
);

-- ── Quotes ───────────────────────────────────────────────────────────────────
--
-- One pricing engine serves both this flow and a future renewal flow for an
-- existing SPOC — session_id for a prospect who has no college yet,
-- college_id for an existing SPOC requesting a fresh quote later. Never
-- both, never neither (enforced below).

CREATE TABLE IF NOT EXISTS quotes (
  quote_id        text PRIMARY KEY,
  session_id      text REFERENCES onboarding_sessions(session_id),
  college_id      text REFERENCES colleges(college_id),
  -- Inputs: student_count, faculty_count, modules[], term_years.
  metrics         jsonb NOT NULL,
  -- Every priced line from the rate card — "why this number" has an answer
  -- without recomputing it, and a support ticket never needs to guess.
  breakdown       jsonb NOT NULL,
  pricing_version text NOT NULL,
  status          text NOT NULL DEFAULT 'quoted'
                  CHECK (status IN ('quoted', 'accepted', 'expired', 'cancelled')),
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK ((session_id IS NULL) <> (college_id IS NULL))
);

CREATE INDEX IF NOT EXISTS quotes_session_id_idx ON quotes(session_id);
CREATE INDEX IF NOT EXISTS quotes_college_id_idx ON quotes(college_id);

-- ── Subscriptions ────────────────────────────────────────────────────────────
--
-- Created exactly once, at fulfillment (payments.status -> 'captured').
-- suspended/expired and their enforcement (a SubscriptionGuard checking this
-- column on every SPOC/academic route) are explicitly not built in this
-- pass — the column exists so that work is additive later, not a schema
-- change on top of a schema change.

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id  text PRIMARY KEY,
  college_id       text NOT NULL REFERENCES colleges(college_id),
  quote_id         text NOT NULL REFERENCES quotes(quote_id),
  seats_purchased  int NOT NULL,
  modules          jsonb NOT NULL,
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'suspended', 'expired', 'cancelled')),
  starts_on        date NOT NULL,
  ends_on          date NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Payments ─────────────────────────────────────────────────────────────────
--
-- One row per payment attempt. gateway defaults to 'mock' because that is
-- the only implementation this pass builds (see mock.gateway.ts) — the
-- column exists so a real gateway is a new value here, not a new column.

CREATE TABLE IF NOT EXISTS payments (
  payment_id       text PRIMARY KEY,
  quote_id         text NOT NULL REFERENCES quotes(quote_id),
  -- NULL until fulfillment backfills it — a payment exists before the
  -- subscription it will fund does.
  subscription_id  text REFERENCES subscriptions(subscription_id),
  gateway          text NOT NULL DEFAULT 'mock',
  gateway_order_id text NOT NULL,
  amount_paise     bigint NOT NULL,
  status           text NOT NULL DEFAULT 'created'
                   CHECK (status IN ('created', 'captured', 'failed')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_quote_id_idx ON payments(quote_id);
