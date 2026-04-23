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

const safeRead = (key: string): string => {
  try {
    const v = localStorage.getItem(key);
    if (!v) return "";
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  } catch {
    return "";
  }
};

export const getCompanyInfo = (): CompanyInfo => {
  const name = safeRead("companyName") || defaults.name;
  const logo = safeRead("companyLogo") || null;
  const address = safeRead("companyAddress") || defaults.address;
  const phone = safeRead("companyPhone") || defaults.phone;
  const fax = safeRead("companyFax") || defaults.fax;
  const gsm = safeRead("companyGsm") || defaults.gsm;
  const email = safeRead("companyEmail") || defaults.email;
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
