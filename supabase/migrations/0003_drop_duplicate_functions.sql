-- =====================================================================
-- KapitPondo — Migration 0003
-- Drops duplicate/overloaded SQL functions left behind by partial
-- migration runs. Ensures only the canonical text-parameter versions
-- survive so PostgREST can unambiguously resolve RPC calls.
-- =====================================================================

-- Remove any version of record_loan_repayment that uses the payment_method
-- enum type for p_payment_method (the canonical version uses text).
drop function if exists public.record_loan_repayment(
  uuid, numeric, uuid, uuid, public.payment_method, text, text
);

-- Safety: also drop any other possible overloads of functions below
-- so that CREATE OR REPLACE in a later migration can always succeed.
drop function if exists public.group_available_cash(uuid);
drop function if exists public.group_summary(uuid);
drop function if exists public.platform_overview();
drop function if exists public.groups_overview();
drop function if exists public.membership_balance(uuid);

-- Recreate them now (idempotent redeploy).

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

  v_interest  := least(round(v_loan.outstanding_balance * v_loan.interest_rate, 2), p_amount);
  v_principal := least(p_amount - v_interest, v_loan.outstanding_balance);

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
    coalesce(sum(case when l.entry_type = 'contribution'      and l.direction = 'credit' then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.entry_type = 'loan_disbursement' and l.direction = 'debit'  then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.entry_type = 'loan_repayment'    and l.direction = 'credit' then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.entry_type = 'expense'           and l.direction = 'debit'  then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.entry_type = 'distribution'      and l.direction = 'debit'  then l.amount else 0 end), 0)::numeric(14,2),
    coalesce(sum(case when l.direction = 'credit' then l.amount else -l.amount end), 0)::numeric(14,2),
    (select count(*) from memberships m where m.group_id = p_group_id and m.status = 'active'),
    (select count(*) from loans ln where ln.group_id = p_group_id and ln.status = 'pending')
  from ledger_entries l
  where l.group_id = p_group_id;
end;
$$;

create or replace function platform_overview()
returns table (
  total_members             bigint,
  verified_members          bigint,
  total_groups              bigint,
  active_cycles             bigint,
  total_contributions       numeric(14,2),
  total_loans_disbursed     numeric(14,2),
  total_outstanding_balance numeric(14,2)
)
language sql
security definer
stable
as $$
  select
    (select count(*) from members)                                                                      as total_members,
    (select count(*) from members where verification_status = 'verified')                               as verified_members,
    (select count(*) from groups  where status = 'active')                                              as total_groups,
    (select count(*) from cycles  where status = 'active')                                              as active_cycles,
    (select coalesce(sum(amount), 0) from ledger_entries where entry_type = 'contribution'    and direction = 'credit')::numeric(14,2),
    (select coalesce(sum(amount), 0) from ledger_entries where entry_type = 'loan_disbursement' and direction = 'debit')::numeric(14,2),
    (select coalesce(sum(outstanding_balance), 0) from loans where status in ('active', 'approved'))::numeric(14,2);
$$;

create or replace function groups_overview()
returns table (
  group_id       uuid,
  group_name     text,
  fund_code      text,
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

-- =====================================================================
-- End of 0003_drop_duplicate_functions.sql
-- =====================================================================
