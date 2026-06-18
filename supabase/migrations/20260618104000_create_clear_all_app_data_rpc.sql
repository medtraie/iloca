create or replace function public.clear_all_app_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n integer := 0;
  result jsonb := '{}'::jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  begin
    execute 'delete from public.payments where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('payments', n);

  begin
    execute 'delete from public.bank_transfers where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('bank_transfers', n);

  begin
    execute 'delete from public.audit_logs where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('audit_logs', n);

  begin
    execute 'delete from public.treasury_settings where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('treasury_settings', n);

  begin
    execute 'delete from public.miscellaneous_expenses where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('miscellaneous_expenses', n);

  begin
    execute 'delete from public.expense_audit_logs where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('expense_audit_logs', n);

  begin
    execute 'delete from public.expense_budgets where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('expense_budgets', n);

  begin
    execute 'delete from public.monthly_expenses where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('monthly_expenses', n);

  begin
    execute 'delete from public.expenses where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('expenses', n);

  begin
    execute 'delete from public.repairs where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('repairs', n);

  begin
    execute 'delete from public.fuel_logs where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('fuel_logs', n);

  begin
    execute 'delete from public.tracking_positions tp using public.vehicles v where tp.vehicle_id = v.id and v.user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('tracking_positions', n);

  begin
    execute 'delete from public.vehicle_documents vd using public.vehicles v where vd.vehicle_id = v.id and v.user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('vehicle_documents', n);

  begin
    execute 'delete from public.contracts where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('contracts', n);

  begin
    execute 'delete from public.invoices where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('invoices', n);

  begin
    execute 'delete from public.vehicles where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('vehicles', n);

  begin
    execute 'delete from public.clients where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('clients', n);

  begin
    execute 'delete from public.app_settings where user_id = $1' using uid;
    get diagnostics n = row_count;
  exception when undefined_table or undefined_column then
    n := 0;
  end;
  result := result || jsonb_build_object('app_settings', n);

  return result;
end;
$$;

grant execute on function public.clear_all_app_data() to authenticated;
