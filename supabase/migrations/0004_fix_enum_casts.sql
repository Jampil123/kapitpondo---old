-- =====================================================================
-- KapitPondo — Migration 0004
-- Fixes: PL/pgSQL does not implicitly cast string literals to custom
-- enum types inside function bodies. Adds explicit ::type casts.
-- Affected functions: record_loan_repayment
-- =====================================================================

drop function if exists public.record_loan_repayment(uuid, numeric, uuid, uuid, text, text, text);

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
  if v_loan.status not in ('active'::loan_status, 'approved'::loan_status) then
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
    'loan_repayment'::ledger_entry_type, 'credit'::ledger_direction, p_amount,
    'loan', v_loan.id, p_approver_id
  ) returning * into v_ledger;

  insert into loan_payments (
    loan_id, amount, principal_portion, interest_portion,
    status, payment_method, proof_url, external_reference,
    recorded_by, approved_by, ledger_entry_id, paid_date
  ) values (
    p_loan_id, p_amount, v_principal, v_interest,
    'paid'::loan_payment_status, v_pm, p_proof_url, p_external_reference,
    p_recorded_by, p_approver_id, v_ledger.id, current_date
  );

  update loans set
    outstanding_balance = greatest(outstanding_balance - v_principal, 0),
    status              = case
                            when outstanding_balance - v_principal <= 0 then 'paid'::loan_status
                            else 'active'::loan_status
                          end,
    updated_at          = now()
  where id = p_loan_id;

  return v_ledger;
end;
$$;

-- =====================================================================
-- End of 0004_fix_enum_casts.sql
-- =====================================================================
