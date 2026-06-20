-- Remove legacy duplicated "Avance initiale" rows from payments.
-- The contract.advance_payment field is now the single source of truth for the initial advance.

with duplicated_initial_advance_payments as (
  select p.id
  from public.payments p
  join public.contracts c
    on c.id = p.contract_id
   and c.user_id = p.user_id
  where p.contract_id is not null
    and lower(btrim(coalesce(p.notes, ''))) = 'avance initiale'
    and coalesce(c.advance_payment, 0) > 0
    and p.amount = c.advance_payment
)
delete from public.payments p
using duplicated_initial_advance_payments d
where p.id = d.id;

create unique index if not exists ux_payments_single_initial_advance_per_contract
on public.payments (contract_id)
where contract_id is not null
  and lower(btrim(coalesce(notes, ''))) = 'avance initiale';
