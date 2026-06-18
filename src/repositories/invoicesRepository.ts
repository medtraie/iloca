import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import type { Invoice } from "@/types/appData";

type InvoiceRow = Record<string, any>;

const requireSupabase = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(getSupabaseConfigError() || "Supabase non configure.");
  }
  return supabase;
};

const normalizeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapStatusFromDb = (status: unknown): Invoice["status"] => {
  if (status === "paid") return "paid";
  if (status === "overdue") return "overdue";
  return "pending";
};

const mapStatusToDb = (status: Invoice["status"]) => {
  if (status === "paid") return "paid";
  if (status === "overdue") return "overdue";
  return "sent";
};

const mapPaymentMethodToDb = (paymentMethod: string) => {
  const value = paymentMethod.trim().toLowerCase();
  if (value.includes("ch")) return "check";
  if (value.includes("vir")) return "transfer";
  if (value.includes("card") || value.includes("cb")) return "card";
  if (value.includes("esp") || value.includes("cash")) return "cash";
  return "other";
};

const mapPaymentMethodFromDb = (paymentMethod: unknown) => {
  switch (paymentMethod) {
    case "check":
      return "CHEQUE";
    case "transfer":
      return "VIREMENT";
    case "card":
      return "CARTE";
    case "cash":
      return "ESPECES";
    default:
      return "AUTRE";
  }
};

const mapInvoiceRow = (row: InvoiceRow): Invoice => ({
  id: String(row.id),
  invoiceNumber: String(row.invoice_number || ""),
  customerName: String(row.customer_name || ""),
  customerICE: String(row.customer_ice || ""),
  invoiceDate: String(row.invoice_date || ""),
  description: String(row.description || ""),
  totalHT: normalizeNumber(row.subtotal_ht),
  tva: normalizeNumber(row.tax_amount),
  totalTTC: normalizeNumber(row.total_ttc),
  paymentMethod: mapPaymentMethodFromDb(row.payment_method),
  status: mapStatusFromDb(row.status),
  created_at: String(row.created_at || new Date().toISOString()),
  updated_at: String(row.updated_at || new Date().toISOString()),
});

const buildInvoicePayload = (invoice: Partial<Invoice>) => {
  const totalHT = normalizeNumber(invoice.totalHT);
  const taxAmount = normalizeNumber(invoice.tva);
  const totalTTC = normalizeNumber(invoice.totalTTC || totalHT + taxAmount);
  return {
    invoice_number: invoice.invoiceNumber?.trim() || "",
    customer_name: invoice.customerName?.trim() || "",
    customer_ice: invoice.customerICE?.trim() || null,
    invoice_date: invoice.invoiceDate?.trim() || new Date().toISOString().slice(0, 10),
    description: invoice.description?.trim() || null,
    subtotal_ht: totalHT,
    tax_amount: taxAmount,
    tax_rate: totalHT > 0 ? Number(((taxAmount / totalHT) * 100).toFixed(2)) : 0,
    total_ttc: totalTTC,
    payment_method: mapPaymentMethodToDb(invoice.paymentMethod || ""),
    status: mapStatusToDb(invoice.status || "pending"),
  };
};

async function listInvoices(): Promise<Invoice[]> {
  const supabase = requireSupabase();
  // #region debug-point A:invoices-list-start
  fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"factures-create-error",runId:"pre-fix",hypothesisId:"H2",location:"invoicesRepository.ts:listInvoices",msg:"[DEBUG] listInvoices start",data:{},ts:Date.now()})}).catch(()=>{});
  // #endregion
  const { data, error } = await supabase.from("invoices").select("*").order("updated_at", { ascending: false });
  // #region debug-point B:invoices-list-result
  fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"factures-create-error",runId:"pre-fix",hypothesisId:"H2",location:"invoicesRepository.ts:listInvoices",msg:"[DEBUG] listInvoices result",data:{hasData:Boolean(data),count:Array.isArray(data)?data.length:null,errorCode:error?.code||null,errorMessage:error?.message||null,errorHint:error?.hint||null},ts:Date.now()})}).catch(()=>{});
  // #endregion
  if (error) throw error;
  return (data || []).map(mapInvoiceRow);
}

async function createInvoice(input: Omit<Invoice, "id" | "created_at" | "updated_at">): Promise<Invoice> {
  const supabase = requireSupabase();
  const payload = buildInvoicePayload(input);
  // #region debug-point C:invoices-create-payload
  fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"factures-create-error",runId:"pre-fix",hypothesisId:"H2",location:"invoicesRepository.ts:createInvoice",msg:"[DEBUG] createInvoice payload",data:{invoice_number:payload.invoice_number,invoice_date:payload.invoice_date,subtotal_ht:payload.subtotal_ht,total_ttc:payload.total_ttc,status:payload.status,payment_method:payload.payment_method},ts:Date.now()})}).catch(()=>{});
  // #endregion
  const { data, error } = await supabase.from("invoices").insert(payload).select("*").single();
  // #region debug-point D:invoices-create-result
  fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"factures-create-error",runId:"pre-fix",hypothesisId:"H2",location:"invoicesRepository.ts:createInvoice",msg:"[DEBUG] createInvoice result",data:{hasData:Boolean(data),errorCode:error?.code||null,errorMessage:error?.message||null,errorHint:error?.hint||null},ts:Date.now()})}).catch(()=>{});
  // #endregion
  if (error) throw error;
  return mapInvoiceRow(data);
}

async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("invoices")
    .update(buildInvoicePayload(updates))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapInvoiceRow(data);
}

async function deleteInvoice(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

async function replaceInvoices(invoices: Invoice[]): Promise<void> {
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase.from("invoices").delete().not("id", "is", null);
  if (deleteError) throw deleteError;
  if (!invoices.length) return;
  const payload = invoices.map((invoice) => ({
    id: invoice.id,
    ...buildInvoicePayload(invoice),
    created_at: invoice.created_at,
    updated_at: invoice.updated_at,
  }));
  const { error } = await supabase.from("invoices").insert(payload);
  if (error) throw error;
}

async function clearInvoices(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("invoices").delete().not("id", "is", null);
  if (error) throw error;
}

export const invoicesRepository = {
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  replaceInvoices,
  clearInvoices,
};
