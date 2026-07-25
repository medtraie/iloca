import { getSupabaseClient } from "@/services/supabaseService";

export interface BankTransfer {
  id: string;
  date: string;
  type: 'cash' | 'check' | 'bank_to_cash';
  amount: number;
  fees: number;
  netAmount: number;
  reference?: string;
  clientName?: string;
  contractNumber?: string;
  checkDate?: string;
  checkDepositDate?: string;
  createdAt?: string;
}

export const bankTransfersRepository = {
  async getAll(): Promise<BankTransfer[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("bank_transfers").select("*").order("date", { ascending: false });
    if (error) throw error;
    
    return data.map(row => ({
      id: row.id,
      date: row.date,
      type: row.type,
      amount: row.amount,
      fees: row.fees,
      netAmount: row.net_amount,
      reference: row.reference,
      clientName: row.client_name,
      contractNumber: row.contract_number,
      checkDate: row.check_date,
      checkDepositDate: row.check_deposit_date,
      createdAt: row.created_at,
    })) as BankTransfer[];
  },

  async create(transfer: Omit<BankTransfer, "id" | "createdAt">): Promise<BankTransfer> {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("bank_transfers")
      .insert([{
        user_id: user?.id,
        date: transfer.date,
        type: transfer.type,
        amount: transfer.amount,
        fees: transfer.fees,
        net_amount: transfer.netAmount,
        reference: transfer.reference,
        client_name: transfer.clientName,
        contract_number: transfer.contractNumber,
        check_date: transfer.checkDate,
        check_deposit_date: transfer.checkDepositDate,
      }])
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      date: data.date,
      type: data.type,
      amount: data.amount,
      fees: data.fees,
      netAmount: data.net_amount,
      reference: data.reference,
      clientName: data.client_name,
      contractNumber: data.contract_number,
      checkDate: data.check_date,
      checkDepositDate: data.check_deposit_date,
      createdAt: data.created_at,
    } as BankTransfer;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("bank_transfers").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};
