-- =====================================================================
-- KapitPondo — Migration 0002
-- Adds:
--   1. PostgREST GRANT statements so anon/authenticated/service_role
--      can read & write the public schema tables.
--   2. `heads` column on memberships (needed for distributions).
--   3. Trigger: auto-create a member row when an auth user signs up.
--   4. All SQL functions (RPCs) called by the Express backend.
-- =====================================================================

-- =====================================================================
-- 1. GRANT TABLE ACCESS TO ALL POSTGREST ROLES
-- =====================================================================
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select
  on all sequences in schema public
  to anon, authenticated, service_role;

-- Future tables automatically get these grants
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

-- =====================================================================
-- 2. ADD `heads` COLUMN TO MEMBERSHIPS
-- =====================================================================
alter table memberships
  add column if not exists heads integer not null default 1
    check (heads >= 1);

-- =====================================================================
-- 3. TRIGGER: AUTO-CREATE MEMBER ROW ON AUTH USER SIGNUP
--    Runs in the auth schema; linked via a function in public.
-- =====================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.members (auth_id, email, full_name, verification_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'unverified'
  )
  on conflict (auth_id) do nothing;  -- idempotent
  return new;
end;
$$;

-- Install the trigger on auth.users (Supabase allows this from migrations)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =====================================================================
-- 4. SQL FUNCTIONS (RPCs)
-- =====================================================================

-- ── 4.1 group_available_cash ────────────────────────────────────────
-- Returns the net cash position of a group from the ledger.
drop function if exists group_available_cash(uuid);
create or replace function group_available_cash(p_group_id uuid)
returns numeric(14,2)
language sql
security definer
stable
as $$
  select coalesce(
    sum(case when direction = 'credit' then amount else -amount end),
    0
  )::numeric(14,2)
  from ledger_entries
  where group_id = p_group_id;
$$;

-- ── 4.2 create_group_with_owner ─────────────────────────────────────
-- Creates a group and inserts the owner's active membership atomically.
drop function if exists create_group_with_owner(text, text, uuid, text);
drop function if exists create_group_with_owner(text, text, text, uuid);
create or replace function create_group_with_owner(
  p_name             text,
  p_fund_code        text,
  p_owner_member_id  uuid,
  p_description      text default null
)
returns groups
language plpgsql
security definer
as $$
declare
  v_group groups;
begin
  insert into groups (name, fund_code, description, owner_id)
  values (p_name, p_fund_code, p_description, p_owner_member_id)
  returning * into v_group;

  insert into memberships (member_id, group_id, role, status, joined_at)
  values (p_owner_member_id, v_group.id, 'owner', 'active', now());

  return v_group;
end;
$$;

-- ── 4.3 approve_contribution ────────────────────────────────────────
-- Approves a contribution; posts a credit ledger entry; returns it.
drop function if exists approve_contribution(uuid, uuid);
create or replace function approve_contribution(
  p_contribution_id uuid,
  p_approver_id     uuid
)
returns ledger_entries
language plpgsql
security definer
as $$
declare
  v_contrib contributions;
  v_ledger  ledger_entries;
begin
  select * into v_contrib from contributions where id = p_contribution_id;
  if not found then
    raise exception 'Contribution not found';
  end if;

  if v_contrib.recorded_by = p_approver_id then
    raise exception 'You cannot approve a contribution you recorded';
  end if;

  insert into ledger_entries (
    group_id, membership_id, cycle_id,
    entry_type, direction, amount,
    source_type, source_id, posted_by
  ) values (
    v_contrib.group_id, v_contrib.membership_id, v_contrib.cycle_id,
    'contribution', 'credit', v_contrib.amount,
    'contribution', v_contrib.id, p_approver_id
  ) returning * into v_ledger;

  update contributions set
    status          = 'approved',
    approved_by     = p_approver_id,
    paid_date       = current_date,
    ledger_entry_id = v_ledger.id,
    updated_at      = now()
  where id = p_contribution_id;

  return v_ledger;
end;
$$;

-- ── 4.4 approve_and_disburse_loan ───────────────────────────────────
-- Validates liquidity, sets interest rate, and posts a debit entry.
drop function if exists approve_and_disburse_loan(uuid, uuid, numeric);
create or replace function approve_and_disburse_loan(
  p_loan_id      uuid,
  p_approver_id  uuid,
  p_interest_rate numeric
)
returns ledger_entries
language plpgsql
security definer
as $$
declare
  v_loan   loans;
  v_ledger ledger_entries;
  v_cash   numeric(14,2);
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then raise exception 'Loan not found'; end if;
  if v_loan.status <> 'pending' then raise exception 'Loan is not pending'; end if;

  select group_available_cash(v_loan.group_id) into v_cash;
  if v_cash < v_loan.principal then
    raise exception 'Insufficient liquidity: available cash (%) is less than loan principal (%)',
      v_cash, v_loan.principal;
  end if;

  insert into ledger_entries (
    group_id, membership_id,
    entry_type, direction, amount,
    source_type, source_id, posted_by
  ) values (
    v_loan.group_id, v_loan.membership_id,
    'loan_disbursement', 'debit', v_loan.principal,
    'loan', v_loan.id, p_approver_id
  ) returning * into v_ledger;

  update loans set
    status                    = 'active',
    interest_rate             = p_interest_rate,
    outstanding_balance       = principal,
    approved_by               = p_approver_id,
    approved_at               = now(),
    disbursed_ledger_entry_id = v_ledger.id,
    disbursed_at              = now(),
    updated_at                = now()
  where id = p_loan_id;

  return v_ledger;
end;
$$;

-- ── 4.5 record_loan_repayment ────────────────────────────────────────
-- Records a loan payment; posts a credit entry; updates outstanding balance.
drop function if exists record_loan_repayment(uuid, numeric, uuid, uuid, text, text, text);
create or replace function record_loan_repayment(
  p_loan_id            uuid,
  p_amount             numeric,
  p_recorded_by        uuid,
  p_approver_id        uuid,
  p_payment_method     text    default null,
  p_proof_url          text    default null,
  p_external_reference text    default null
)
returns ledger_entries
language plpgsql
security definer
as $$
declare
  v_loan      loans;
  v_ledger    ledger_entries;
  v_interest  numeric(14,2);
  v_principal numeric(14,2);
  v_pm        payment_method;
begin
  if p_recorded_by = p_approver_id then
    raise exception 'Approver cannot be the same person as the recorder';
  end if;

  select * into v_loan from loans where id = p_loan_id;
  if not found then raise exception 'Loan not found'; end if;
  if v_loan.status not in ('active', 'approved') then
    raise exception 'Loan is not active (status: %)', v_loan.status;
  end if;

  -- Simple interest-first split
  v_interest  := least(round(v_loan.outstanding_balance * v_loan.interest_rate, 2), p_amount);
  v_principal := least(p_amount - v_interest, v_loan.outstanding_balance);

  -- Cast payment method only if provided
  if p_payment_method is not null then
    v_pm := p_payment_method::payment_method;
  end if;

  insert into ledger_entries (
    group_id, membership_id,
    entry_type, direction, amount,
    source_type, source_id, posted_by
  ) values (
    v_loan.group_id, v_loan.membership_id,
    'loan_repayment', 'credit', p_amount,
    'loan', v_loan.id, p_approver_id
  ) returning * into v_ledger;

  insert into loan_payments (
    loan_id, amount, principal_portion, interest_portion,
    status, payment_method, proof_url, external_reference,
    recorded_by, approved_by, ledger_entry_id, paid_date
  ) values (
    p_loan_id, p_amount, v_principal, v_interest,
    'paid', v_pm, p_proof_url, p_external_reference,
    p_recorded_by, p_approver_id, v_ledger.id, current_date
  );

  update loans set
    outstanding_balance = greatest(outstanding_balance - v_principal, 0),
    status              = case
                            when outstanding_balance - v_principal <= 0 then 'paid'
                            else 'active'
                          end,
    updated_at          = now()
  where id = p_loan_id;

  return v_ledger;
end;
$$;

-- ── 4.6 approve_expense ─────────────────────────────────────────────
-- Approves an expense; posts a debit entry; returns it.
drop function if exists approve_expense(uuid, uuid);
create or replace function approve_expense(
  p_expense_id  uuid,
  p_approver_id uuid
)
returns ledger_entries
language plpgsql
security definer
as $$
declare
  v_expense expenses;
  v_ledger  ledger_entries;
  v_cash    numeric(14,2);
begin
  select * into v_expense from expenses where id = p_expense_id;
  if not found then raise exception 'Expense not found'; end if;

  if v_expense.recorded_by = p_approver_id then
    raise exception 'You cannot approve an expense you recorded';
  end if;

  select group_available_cash(v_expense.group_id) into v_cash;
  if v_cash < v_expense.amount then
    raise exception 'Insufficient fund balance to cover this expense';
  end if;

  insert into ledger_entries (
    group_id,
    entry_type, direction, amount,
    source_type, source_id, posted_by
  ) values (
    v_expense.group_id,
    'expense', 'debit', v_expense.amount,
    'expense', v_expense.id, p_approver_id
  ) returning * into v_ledger;

  update expenses set
    status          = 'approved',
    approved_by     = p_approver_id,
    ledger_entry_id = v_ledger.id,
    updated_at      = now()
  where id = p_expense_id;

  return v_ledger;
end;
$$;

-- ── 4.7 preview_distribution ────────────────────────────────────────
-- Calculates per-member allocations (proportional to heads) without
-- moving any money. Returns the new distributions row.
drop function if exists preview_distribution(uuid, text, uuid);
create or replace function preview_distribution(
  p_group_id    uuid,
  p_period      text,
  p_declared_by uuid
)
returns distributions
language plpgsql
security definer
as $$
declare
  v_available    numeric(14,2);
  v_total_heads  integer;
  v_dist         distributions;
  v_mship        memberships;
  v_share        numeric(14,2);
begin
  select group_available_cash(p_group_id) into v_available;
  if v_available <= 0 then
    raise exception 'Nothing to distribute: available cash is %', v_available;
  end if;

  select coalesce(sum(heads), 0) into v_total_heads
  from memberships
  where group_id = p_group_id and status = 'active';

  if v_total_heads = 0 then
    raise exception 'No active members with heads assigned in this group';
  end if;

  insert into distributions (group_id, period, total_amount, status, declared_by)
  values (p_group_id, p_period, v_available, 'previewed', p_declared_by)
  returning * into v_dist;

  for v_mship in
    select * from memberships where group_id = p_group_id and status = 'active'
  loop
    v_share := round((v_available * v_mship.heads::numeric / v_total_heads), 2);
    insert into distribution_allocations (distribution_id, membership_id, amount)
    values (v_dist.id, v_mship.id, v_share);
  end loop;

  return v_dist;
end;
$$;

-- ── 4.8 finalize_distribution ───────────────────────────────────────
-- Posts a debit ledger entry per allocation, driving available_cash to 0.
drop function if exists finalize_distribution(uuid, uuid);
create or replace function finalize_distribution(
  p_distribution_id uuid,
  p_finalized_by    uuid
)
returns distributions
language plpgsql
security definer
as $$
declare
  v_dist      distributions;
  v_alloc     distribution_allocations;
  v_ledger    ledger_entries;
  v_curr_cash numeric(14,2);
begin
  select * into v_dist from distributions where id = p_distribution_id;
  if not found then raise exception 'Distribution not found'; end if;
  if v_dist.status <> 'previewed' then
    raise exception 'Distribution is not in previewed status (current: %)', v_dist.status;
  end if;

  select group_available_cash(v_dist.group_id) into v_curr_cash;
  if abs(v_curr_cash - v_dist.total_amount) > 0.01 then
    raise exception 'Fund changed since preview: current=%, preview=%',
      v_curr_cash, v_dist.total_amount;
  end if;

  for v_alloc in
    select * from distribution_allocations where distribution_id = p_distribution_id
  loop
    insert into ledger_entries (
      group_id, membership_id,
      entry_type, direction, amount,
      source_type, source_id, posted_by
    ) values (
      v_dist.group_id, v_alloc.membership_id,
      'distribution', 'debit', v_alloc.amount,
      'distribution', v_dist.id, p_finalized_by
    ) returning * into v_ledger;

    update distribution_allocations
    set ledger_entry_id = v_ledger.id
    where id = v_alloc.id;
  end loop;

  update distributions set
    status       = 'finalized',
    finalized_by = p_finalized_by,
    finalized_at = now(),
    updated_at   = now()
  where id = p_distribution_id
  returning * into v_dist;

  return v_dist;
end;
$$;

-- ── 4.9 membership_balance ───────────────────────────────────────────
-- Net credits minus debits for a single membership.
drop function if exists membership_balance(uuid);
create or replace function membership_balance(p_membership_id uuid)
returns numeric(14,2)
language sql
security definer
stable
as $$
  select coalesce(
    sum(case when direction = 'credit' then amount else -amount end),
    0
  )::numeric(14,2)
  from ledger_entries
  where membership_id = p_membership_id;
$$;

-- ── 4.10 group_summary ───────────────────────────────────────────────
-- Financial snapshot row for a group (used by reporting).
drop function if exists group_summary(uuid);
create or replace function group_summary(p_group_id uuid)
returns table (
  total_contributions      numeric(14,2),
  total_loan_disbursements numeric(14,2),
  total_loan_repayments    numeric(14,2),
  total_expenses           numeric(14,2),
  total_distributions      numeric(14,2),
  available_cash           numeric(14,2),
  active_members           bigint,
  pending_loans            bigint
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    coalesce(sum(case when l.entry_type = 'contribution'     and l.direction = 'credit' then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.entry_type = 'loan_disbursement' and l.direction = 'debit'  then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.entry_type = 'loan_repayment'   and l.direction = 'credit' then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.entry_type = 'expense'          and l.direction = 'debit'  then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.entry_type = 'distribution'     and l.direction = 'debit'  then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.direction = 'credit' then l.amount else -l.amount end), 0)::numeric(14,2),
    (select count(*) from memberships m where m.group_id = p_group_id and m.status = 'active'),
    (select count(*) from loans ln where ln.group_id = p_group_id and ln.status = 'pending')
  from ledger_entries l
  where l.group_id = p_group_id;
end;
$$;

-- ── 4.11 platform_overview ───────────────────────────────────────────
-- Headline numbers for the system-admin monitoring dashboard.
drop function if exists platform_overview();
create or replace function platform_overview()
returns table (
  total_members            bigint,
  verified_members         bigint,
  total_groups             bigint,
  active_cycles            bigint,
  total_contributions      numeric(14,2),
  total_loans_disbursed    numeric(14,2),
  total_outstanding_balance numeric(14,2)
)
language sql
security definer
stable
as $$
  select
    (select count(*) from members)                                                               as total_members,
    (select count(*) from members   where verification_status = 'verified')                      as verified_members,
    (select count(*) from groups    where status = 'active')                                     as total_groups,
    (select count(*) from cycles    where status = 'active')                                     as active_cycles,
    (select coalesce(sum(amount), 0) from ledger_entries where entry_type = 'contribution'    and direction = 'credit')::numeric(14,2) as total_contributions,
    (select coalesce(sum(amount), 0) from ledger_entries where entry_type = 'loan_disbursement' and direction = 'debit')::numeric(14,2) as total_loans_disbursed,
    (select coalesce(sum(outstanding_balance), 0) from loans where status in ('active', 'approved'))::numeric(14,2) as total_outstanding_balance;
$$;

-- ── 4.12 groups_overview ─────────────────────────────────────────────
-- Per-group health table for the admin monitoring panel.
drop function if exists groups_overview();
create or replace function groups_overview()
returns table (
  group_id     uuid,
  group_name   text,
  fund_code    text,
  active_members bigint,
  available_cash numeric(14,2),
  active_loans   bigint
)
language sql
security definer
stable
as $$
  select
    g.id,
    g.name,
    g.fund_code,
    (select count(*) from memberships m where m.group_id = g.id and m.status = 'active'),
    group_available_cash(g.id),
    (select count(*) from loans l where l.group_id = g.id and l.status in ('active', 'approved'))
  from groups g
  where g.status = 'active'
  order by g.created_at;
$$;

-- ── 4.13 post_adjustment ─────────────────────────────────────────────
-- Posts a manual adjustment to the ledger.
drop function if exists post_adjustment(uuid, text, numeric, text, uuid, uuid);
drop function if exists post_adjustment(uuid, uuid, text, numeric, text, uuid);
create or replace function post_adjustment(
  p_group_id      uuid,
  p_direction     text,
  p_amount        numeric,
  p_reason        text,
  p_posted_by     uuid,
  p_membership_id uuid    default null
)
returns ledger_entries
language plpgsql
security definer
as $$
declare
  v_ledger ledger_entries;
begin
  insert into ledger_entries (
    group_id, membership_id,
    entry_type, direction, amount,
    description, posted_by
  ) values (
    p_group_id, p_membership_id,
    'adjustment', p_direction::ledger_direction, p_amount,
    p_reason, p_posted_by
  ) returning * into v_ledger;
  return v_ledger;
end;
$$;

-- ── 4.14 reverse_ledger_entry ────────────────────────────────────────
-- Creates a counter-entry to reverse an existing ledger entry.
drop function if exists reverse_ledger_entry(uuid, text, uuid);
create or replace function reverse_ledger_entry(
  p_entry_id  uuid,
  p_reason    text,
  p_posted_by uuid
)
returns ledger_entries
language plpgsql
security definer
as $$
declare
  v_entry    ledger_entries;
  v_reversal ledger_entries;
  v_rev_dir  ledger_direction;
begin
  select * into v_entry from ledger_entries where id = p_entry_id;
  if not found then raise exception 'Ledger entry not found'; end if;

  if exists (select 1 from ledger_entries where reverses_entry_id = p_entry_id) then
    raise exception 'This entry has already been reversed';
  end if;

  if v_entry.entry_type = 'reversal' then
    raise exception 'Cannot reverse a reversal entry';
  end if;

  v_rev_dir := case when v_entry.direction = 'credit' then 'debit' else 'credit' end;

  insert into ledger_entries (
    group_id, membership_id, cycle_id,
    entry_type, direction, amount,
    source_type, source_id, reverses_entry_id,
    description, posted_by
  ) values (
    v_entry.group_id, v_entry.membership_id, v_entry.cycle_id,
    'reversal', v_rev_dir, v_entry.amount,
    v_entry.source_type, v_entry.source_id, p_entry_id,
    p_reason, p_posted_by
  ) returning * into v_reversal;

  return v_reversal;
end;
$$;

-- ── 4.15 close_cycle ─────────────────────────────────────────────────
-- Closes an active cycle; returns the updated row.
drop function if exists close_cycle(uuid);
create or replace function close_cycle(p_cycle_id uuid)
returns cycles
language plpgsql
security definer
as $$
declare
  v_cycle cycles;
begin
  update cycles
  set status = 'closed', updated_at = now()
  where id = p_cycle_id and status = 'active'
  returning * into v_cycle;

  if not found then
    raise exception 'Cycle not found or not in active status';
  end if;

  return v_cycle;
end;
$$;

-- =====================================================================
-- End of 0002_grants_functions_trigger.sql
-- =====================================================================
