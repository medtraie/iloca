import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import type { Invoice } from "@/types/appData";

type InvoiceRow = Record<string, any>;

const STORAGE_KEY_LOCAL_INVOICES = "iloca:invoices:local";

function getLocalInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_INVOICES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalInvoices(invoices: Invoice[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_INVOICES, JSON.stringify(invoices));
  } catch (e) {
    console.warn("Could not save local invoices:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

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
  const localList = getLocalInvoices();
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase.from("invoices").select("*").order("updated_at", { ascending: false });
    if (!error && data) {
      const remoteList = data.map(mapInvoiceRow);
      const remoteIds = new Set(remoteList.map((i) => i.id));
      const combined = [...remoteList, ...localList.filter((i) => !remoteIds.has(i.id))];
      saveLocalInvoices(combined);
      return combined;
    }
  } catch (err) {
    console.warn("Error loading invoices from Supabase, using local cache:", err);
  }
  return localList;
}

async function createInvoice(input: Omit<Invoice, "id" | "created_at" | "updated_at">): Promise<Invoice> {
  const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
  let activeUserId: string | null = null;
  if (activeUserStr) {
    try {
      activeUserId = JSON.parse(activeUserStr)?.id || null;
    } catch {}
  }

  const now = new Date().toISOString();
  const fallbackInvoice: Invoice = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`,
    ...input,
    created_at: now,
    updated_at: now,
  };

  try {
    const supabase = requireSupabase();
    const { data: authData } = await supabase.auth.getUser();
    const candidateUserId = authData.user?.id || activeUserId;
    const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

    const payload: Record<string, any> = { ...buildInvoicePayload(input) };
    if (userId) payload.user_id = userId;

    const { data, error } = await supabase.from("invoices").insert(payload).select("*").single();
    if (!error && data) {
      const saved = mapInvoiceRow(data);
      const local = getLocalInvoices().filter((i) => i.id !== saved.id);
      saveLocalInvoices([saved, ...local]);
      return saved;
    }
  } catch (err) {
    console.warn("Supabase invoice insert exception (storing locally):", err);
  }

  const currentLocal = getLocalInvoices().filter((i) => i.id !== fallbackInvoice.id);
  saveLocalInvoices([fallbackInvoice, ...currentLocal]);
  return fallbackInvoice;
}

async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  let updatedInvoice: Invoice | null = null;
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("invoices")
      .update(buildInvoicePayload(updates))
      .eq("id", id)
      .select("*")
      .single();
    if (!error && data) {
      updatedInvoice = mapInvoiceRow(data);
    }
  } catch (err) {
    console.warn("Supabase invoice update exception:", err);
  }

  const local = getLocalInvoices();
  const existing = local.find((i) => i.id === id);
  const now = new Date().toISOString();
  const merged: Invoice = updatedInvoice || {
    ...(existing || { id, invoiceNumber: "", customerName: "", totalHT: 0, tva: 0, totalTTC: 0, paymentMethod: "AUTRE", status: "pending", created_at: now, updated_at: now }),
    ...updates,
    updated_at: now,
  };

  const nextLocal = local.map((i) => (i.id === id ? merged : i));
  if (!existing && !updatedInvoice) {
    nextLocal.push(merged);
  }
  saveLocalInvoices(nextLocal);
  return merged;
}

async function deleteInvoice(id: string): Promise<void> {
  try {
    const supabase = requireSupabase();
    await supabase.from("invoices").delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase invoice delete exception:", err);
  }
  const local = getLocalInvoices().filter((i) => i.id !== id);
  saveLocalInvoices(local);
}

async function replaceInvoices(invoices: Invoice[]): Promise<void> {
  saveLocalInvoices(invoices);
  try {
    const supabase = requireSupabase();
    const { error: deleteError } = await supabase.from("invoices").delete().not("id", "is", null);
    if (deleteError) return;
    if (!invoices.length) return;
    const payload = invoices.map((invoice) => ({
      id: invoice.id,
      ...buildInvoicePayload(invoice),
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
    }));
    await supabase.from("invoices").insert(payload);
  } catch (err) {
    console.warn("Supabase replaceInvoices exception:", err);
  }
}

async function clearInvoices(): Promise<void> {
  saveLocalInvoices([]);
  try {
    const supabase = requireSupabase();
    await supabase.from("invoices").delete().not("id", "is", null);
  } catch (err) {
    console.warn("Supabase clearInvoices exception:", err);
  }
}

export const invoicesRepository = {
  listInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  replaceInvoices,
  clearInvoices,
};

