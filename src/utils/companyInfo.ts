export interface CompanyInfo {
  name: string;
  logo?: string | null;
  address: string;
  phone?: string;
  fax?: string;
  gsm?: string;
  email?: string;
}

const defaults: CompanyInfo = {
  name: "SFTLOCATION",
  address:
    "10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc",
  phone: "0522228704",
  fax: "05 22 47 17 80",
  gsm: "06 62 59 63 07",
  email: "bonatours308@gmail.com",
  logo: null,
};

export const getCompanyInfo = (): CompanyInfo => {
  const raw = (globalThis as any).__iloca_company_settings as any;

  const name = (typeof raw?.companyName === "string" && raw.companyName.trim()) ? raw.companyName.trim() : defaults.name;
  const logo = (typeof raw?.companyLogo === "string" ? raw.companyLogo : null) ?? null;
  const address = (typeof raw?.companyAddress === "string" && raw.companyAddress.trim()) ? raw.companyAddress.trim() : defaults.address;
  const phone = (typeof raw?.companyPhone === "string" && raw.companyPhone.trim()) ? raw.companyPhone.trim() : defaults.phone;
  const fax = (typeof raw?.companyFax === "string" && raw.companyFax.trim()) ? raw.companyFax.trim() : defaults.fax;
  const gsm = (typeof raw?.companyGsm === "string" && raw.companyGsm.trim()) ? raw.companyGsm.trim() : defaults.gsm;
  const email = (typeof raw?.companyEmail === "string" && raw.companyEmail.trim()) ? raw.companyEmail.trim() : defaults.email;
  return { name, logo, address, phone, fax, gsm, email };
};

export const getCompanyContactLines = () => {
  const { address, phone, fax, gsm, email } = getCompanyInfo();
  const linePhoneFax =
    (phone || fax)
      ? `${phone ? `Tél: ${phone}` : ""}${phone && fax ? " - " : ""}${fax ? `Fax: ${fax}` : ""}`
      : "";
  const lineGsm = gsm ? `GSM: ${gsm}` : "";
  const lineEmail = email ? `E-mail: ${email}` : "";
  return {
    addressLine: address,
    phoneFaxLine: linePhoneFax,
    gsmLine: lineGsm,
    emailLine: lineEmail,
  };
};

export const getCompanyDisplayName = () => getCompanyInfo().name || defaults.name;

export const getCompanySlug = () =>
  (getCompanyDisplayName() || "company")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const getCompanyLogoImage = () => {
  const { logo } = getCompanyInfo();
  if (!logo) return null as null | { data: string; format: "PNG" | "JPEG" };
  const lower = logo.slice(0, 50).toLowerCase();
  if (lower.startsWith("data:image/png")) return { data: logo, format: "PNG" as const };
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg"))
    return { data: logo, format: "JPEG" as const };
  return null as null | { data: string; format: "PNG" | "JPEG" };
};
