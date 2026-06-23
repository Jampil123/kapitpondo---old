-- =====================================================================
-- KapitPondo — Initial Database Schema (PostgreSQL / Supabase)
-- Migration: 0001_initial_schema.sql
--
-- Design principles:
--   * Money is stored as numeric(14,2) — exact, never floating point.
--   * Two-layer model:
--       - Claim tables (contributions, loan_payments, expenses, ...)
--         carry the approval workflow, proof, recorder and approver.
--       - ledger_entries is the APPEND-ONLY ledger. Rows are created
--         only when a claim is approved, and can never be updated or
--         deleted (enforced by trigger). Corrections = reversing entries.
--   * Segregation of duties: recorder may never equal approver
--     (enforced by CHECK constraints on claim tables).
--   * Row Level Security policies are added in the NEXT migration.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- =====================================================================
-- 1. ENUM TYPES
-- =====================================================================
create type member_verification_status as enum ('unverified','pending','verified','rejected');
create type group_status               as enum ('active','archived');
create type membership_role            as enum ('owner','treasurer','auditor','member');
create type membership_status          as enum ('pending','active','suspended','exited');
create type cycle_status               as enum ('draft','active','closed');
create type account_type               as enum ('savings','share_capital');
create type ledger_direction           as enum ('credit','debit');  -- credit = into fund/member; debit = out
create type ledger_entry_type          as enum ('contribution','loan_disbursement','loan_repayment','distribution','expense','penalty','fee','adjustment','reversal');
create type payment_method             as enum ('paymongo','gcash','cash','bank_transfer','other');
create type contribution_status        as enum ('pending','submitted','approved','rejected');
create type loan_status                as enum ('pending','approved','active','paid','rejected','defaulted');
create type loan_payment_status        as enum ('scheduled','submitted','approved','paid','late','partial');
create type distribution_status        as enum ('draft','previewed','finalized');
create type expense_status             as enum ('submitted','approved','rejected');

-- =====================================================================
-- 2. SHARED TRIGGER FUNCTIONS
-- =====================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create or replace function prevent_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'ledger_entries is append-only; create a reversing entry instead of editing or deleting';
end; $$;

-- =====================================================================
-- 3. CORE TABLES
-- =====================================================================

-- 3.1 Members — platform-level user account (1:1 with Supabase auth)  [M1]
create table members (
  id                  uuid primary key default gen_random_uuid(),
  auth_id             uuid unique references auth.users(id) on delete cascade,
  full_name           text not null,
  email               text,
  phone               text,
  is_system_admin     boolean not null default false,
  verification_status member_verification_status not null default 'unverified',
  id_document_url     text,
  verified_by         uuid references members(id),
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 3.2 Groups — a cooperative fund  [M2]
create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  fund_code   text unique not null,
  description text,
  owner_id    uuid not null references members(id),
  status      group_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3.3 Memberships — member belongs to a group, with a role  [M3]
create table memberships (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  group_id    uuid not null references groups(id) on delete cascade,
  role        membership_role not null default 'member',
  status      membership_status not null default 'pending',
  joined_at   timestamptz,
  approved_by uuid references members(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (member_id, group_id)
);

-- 3.4 Cycles — a group's contribution cycle  [M4]
create table cycles (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references groups(id) on delete cascade,
  name                text not null,
  contribution_amount numeric(14,2) not null check (contribution_amount >= 0),
  frequency           text not null default 'monthly',
  penalty_amount      numeric(14,2) not null default 0,
  penalty_type        text not null default 'fixed',   -- 'fixed' or 'percent'
  start_date          date not null,
  end_date            date,
  status              cycle_status not null default 'draft',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- Enforce the "one active cycle per group" rule
create unique index one_active_cycle_per_group
  on cycles (group_id) where status = 'active';

-- 3.5 Accounts — cached per-membership balances (derived from the ledger)
create table accounts (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships(id) on delete cascade,
  account_type  account_type not null default 'savings',
  balance       numeric(14,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (membership_id, account_type)
);

-- =====================================================================
-- 4. THE LEDGER (append-only)  [M7]
-- =====================================================================
create table ledger_entries (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references groups(id),
  membership_id     uuid references memberships(id),  -- null for group-level entries (e.g. expenses)
  cycle_id          uuid references cycles(id),
  entry_type        ledger_entry_type not null,
  direction         ledger_direction not null,
  amount            numeric(14,2) not null check (amount > 0),
  source_type       text,    -- 'contribution' | 'loan' | 'loan_payment' | 'distribution' | 'expense'
  source_id         uuid,    -- id of the originating claim row
  reverses_entry_id uuid references ledger_entries(id),
  description       text,
  posted_by         uuid not null references members(id),
  posted_at         timestamptz not null default now()
);

-- Make the ledger strictly append-only
create trigger ledger_no_update before update on ledger_entries
  for each row execute function prevent_ledger_mutation();
create trigger ledger_no_delete before delete on ledger_entries
  for each row execute function prevent_ledger_mutation();

-- =====================================================================
-- 5. CONTRIBUTIONS  [M5]
-- =====================================================================
create table contributions (
  id                uuid primary key default gen_random_uuid(),
  membership_id     uuid not null references memberships(id) on delete cascade,
  cycle_id          uuid not null references cycles(id) on delete cascade,
  group_id          uuid not null references groups(id),
  amount            numeric(14,2) not null check (amount >= 0),
  due_date          date,
  paid_date         date,
  is_late           boolean not null default false,
  penalty_applied   numeric(14,2) not null default 0,
  status            contribution_status not null default 'pending',
  payment_method    payment_method,
  proof_url         text,
  external_reference text,
  recorded_by       uuid references members(id),
  approved_by       uuid references members(id),
  ledger_entry_id   uuid references ledger_entries(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Segregation of duties: recorder may not approve their own record
  constraint contrib_segregation
    check (approved_by is null or recorded_by is null or approved_by <> recorded_by)
);

-- =====================================================================
-- 6. LENDING  [M6]
-- =====================================================================
create table loans (
  id                        uuid primary key default gen_random_uuid(),
  membership_id             uuid not null references memberships(id) on delete cascade,
  group_id                  uuid not null references groups(id),
  principal                 numeric(14,2) not null check (principal > 0),
  interest_rate             numeric(6,4) not null default 0,   -- 0.0300 = 3%
  term_months               int not null check (term_months > 0),
  purpose                   text,
  status                    loan_status not null default 'pending',
  outstanding_balance       numeric(14,2) not null default 0,
  applied_at                timestamptz not null default now(),
  approved_by               uuid references members(id),
  approved_at               timestamptz,
  disbursed_ledger_entry_id uuid references ledger_entries(id),
  disbursed_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table loan_payments (
  id                 uuid primary key default gen_random_uuid(),
  loan_id            uuid not null references loans(id) on delete cascade,
  amount             numeric(14,2) not null check (amount > 0),
  principal_portion  numeric(14,2) not null default 0,
  interest_portion   numeric(14,2) not null default 0,
  due_date           date,
  paid_date          date,
  status             loan_payment_status not null default 'scheduled',
  payment_method     payment_method,
  proof_url          text,
  external_reference text,
  recorded_by        uuid references members(id),
  approved_by        uuid references members(id),
  ledger_entry_id    uuid references ledger_entries(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint loanpay_segregation
    check (approved_by is null or recorded_by is null or approved_by <> recorded_by)
);

-- =====================================================================
-- 7. DISTRIBUTIONS / DIVIDENDS  [M9]
-- =====================================================================
create table distributions (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  cycle_id     uuid references cycles(id),
  period       text not null,
  total_amount numeric(14,2) not null default 0,
  rate         numeric(6,4),
  status       distribution_status not null default 'draft',
  declared_by  uuid references members(id),
  finalized_by uuid references members(id),
  finalized_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table distribution_allocations (
  id              uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references distributions(id) on delete cascade,
  membership_id   uuid not null references memberships(id) on delete cascade,
  amount          numeric(14,2) not null default 0,
  ledger_entry_id uuid references ledger_entries(id),
  created_at      timestamptz not null default now(),
  unique (distribution_id, membership_id)
);

-- =====================================================================
-- 8. EXPENSES  [M7]
-- =====================================================================
create table expenses (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references groups(id) on delete cascade,
  amount          numeric(14,2) not null check (amount > 0),
  category        text,
  description     text,
  status          expense_status not null default 'submitted',
  proof_url       text,
  recorded_by     uuid references members(id),
  approved_by     uuid references members(id),
  ledger_entry_id uuid references ledger_entries(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint expense_segregation
    check (approved_by is null or recorded_by is null or approved_by <> recorded_by)
);

-- =====================================================================
-- 9. CROSS-CUTTING: AUDIT LOG & NOTIFICATIONS  [M10 + cross-cutting]
-- =====================================================================
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references members(id),
  group_id    uuid references groups(id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz not null default now()
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid references members(id) on delete cascade,
  group_id      uuid references groups(id) on delete cascade,
  type          text not null,
  title         text,
  message       text,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- =====================================================================
-- 10. updated_at TRIGGERS
-- =====================================================================
create trigger trg_members_updated      before update on members      for each row execute function set_updated_at();
create trigger trg_groups_updated       before update on groups       for each row execute function set_updated_at();
create trigger trg_memberships_updated  before update on memberships  for each row execute function set_updated_at();
create trigger trg_cycles_updated       before update on cycles       for each row execute function set_updated_at();
create trigger trg_accounts_updated     before update on accounts     for each row execute function set_updated_at();
create trigger trg_contributions_updated before update on contributions for each row execute function set_updated_at();
create trigger trg_loans_updated        before update on loans        for each row execute function set_updated_at();
create trigger trg_loan_payments_updated before update on loan_payments for each row execute function set_updated_at();
create trigger trg_distributions_updated before update on distributions for each row execute function set_updated_at();
create trigger trg_expenses_updated     before update on expenses     for each row execute function set_updated_at();

-- =====================================================================
-- 11. INDEXES (foreign keys + common filters)
-- =====================================================================
create index idx_memberships_member        on memberships (member_id);
create index idx_memberships_group         on memberships (group_id);
create index idx_cycles_group              on cycles (group_id);
create index idx_accounts_membership       on accounts (membership_id);
create index idx_ledger_group              on ledger_entries (group_id);
create index idx_ledger_membership         on ledger_entries (membership_id);
create index idx_ledger_source             on ledger_entries (source_type, source_id);
create index idx_contributions_membership  on contributions (membership_id);
create index idx_contributions_cycle       on contributions (cycle_id);
create index idx_contributions_status      on contributions (status);
create index idx_loans_membership          on loans (membership_id);
create index idx_loans_status              on loans (status);
create index idx_loan_payments_loan        on loan_payments (loan_id);
create index idx_dist_alloc_distribution   on distribution_allocations (distribution_id);
create index idx_dist_alloc_membership     on distribution_allocations (membership_id);
create index idx_expenses_group            on expenses (group_id);
create index idx_audit_group               on audit_log (group_id);
create index idx_notifications_member      on notifications (member_id);

-- =====================================================================
-- End of 0001_initial_schema.sql
-- Next migration: 0002_row_level_security.sql  (RLS policies per role)
-- =====================================================================
