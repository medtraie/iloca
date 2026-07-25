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
  const { data, error } = await supabase.from("invoices").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInvoiceRow);
}

async function createInvoice(input: Omit<Invoice, "id" | "created_at" | "updated_at">): Promise<Invoice> {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const payload = { ...buildInvoicePayload(input), user_id: user?.id };
  const { data, error } = await supabase.from("invoices").insert(payload).select("*").single();
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
