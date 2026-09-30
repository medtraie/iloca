import { Contract } from "@/hooks/useContracts";
import { ContractPDFData } from "@/hooks/usePDFGeneration";
import { getCompanyDisplayName } from "@/utils/companyInfo";

export const buildPdfDataFromContract = (contract: Contract): ContractPDFData => {
  const cd = contract.contract_data || {};

  return {
    contractNumber: contract.contract_number,
    customerLastName: cd.customerLastName || "",
    customerFirstName: cd.customerFirstName || "",
    customerAddressMorocco: cd.customerAddressMorocco || "",
    customerPhone: cd.customerPhone || contract.customer_phone || "",
    customerAddressForeign: cd.customerAddressForeign || "",
    customerCin: cd.customerCin || "",
    customerCinDelivered: cd.customerCinDelivered || "",
    customerCinImageUrl: cd.customerCinImageUrl,
    customerLicenseNumber: cd.customerLicenseNumber || "",
    customerLicenseDelivered: cd.customerLicenseDelivered || "",
    customerLicenseImageUrl: cd.customerLicenseImageUrl,
    customerPassportNumber: cd.customerPassportNumber || "",
    customerPassportDelivered: cd.customerPassportDelivered || "",
    customerBirthDate: cd.customerBirthDate || "",
    secondDriverLastName: cd.secondDriverLastName || "",
    secondDriverFirstName: cd.secondDriverFirstName || "",
    secondDriverAddressMorocco: cd.secondDriverAddressMorocco || "",
    secondDriverPhone: cd.secondDriverPhone || "",
    secondDriverAddressForeign: cd.secondDriverAddressForeign || "",
    secondDriverCin: cd.secondDriverCin || "",
    secondDriverCinDelivered: cd.secondDriverCinDelivered || "",
    secondDriverLicenseNumber: cd.secondDriverLicenseNumber || "",
    secondDriverLicenseDelivered: cd.secondDriverLicenseDelivered || "",
    secondDriverPassportNumber: cd.secondDriverPassportNumber || "",
    secondDriverPassportDelivered: cd.secondDriverPassportDelivered || "",
    vehicleBrand: cd.vehicleBrand || "",
    vehicleModel: cd.vehicleModel || "",
    vehicleRegistration: cd.vehicleRegistration || "",
    vehicleYear: cd.vehicleYear || "",
    vehicleKmDepart: cd.vehicleKmDepart || "",
    deliveryLocation: cd.deliveryLocation || "",
    deliveryDateTime: cd.deliveryDateTime || contract.start_date,
    rentalDays: cd.rentalDays || cd.rentalDuration || "",
    emergencyEquipmentDelivery: cd.emergencyEquipmentDelivery || "",
    observationsDelivery: cd.observationsDelivery || "",
    deliveryFuelLevel: cd.delivery_fuel_level ?? contract.delivery_fuel_level ?? 0,
    deliveryDamages: cd.delivery_damages || contract.delivery_damages || [],
    returnDateTime: cd.returnDateTime || contract.end_date,
    returnLocation: cd.returnLocation || "",
    extensionUntil: cd.extensionUntil || "",
    vehicleKmReturn: cd.vehicleKmReturn || "",
    extendedDays: cd.extendedDays || "",
    emergencyEquipmentReturn: cd.emergencyEquipmentReturn || "",
    observationsReturn: cd.observationsReturn || "",
    returnFuelLevel: cd.return_fuel_level ?? contract.return_fuel_level ?? 0,
    returnDamages: cd.return_damages || contract.return_damages || [],
    dailyPrice: cd.dailyPrice || String(contract.daily_rate || ""),
    rentalDuration: cd.rentalDuration || cd.rentalDays || "",
    totalPrice: Number(contract.total_amount ?? cd.totalPrice ?? 0),
    advance: cd.advance || String(contract.advance_payment ?? ""),
    remaining: Number(contract.remaining_amount ?? cd.remaining ?? 0),
    paymentMethod: cd.paymentMethod || contract.payment_method || "",
    deliveryDate: cd.deliveryDate || (cd.deliveryDateTime ? cd.deliveryDateTime.split("T")[0] : ""),
    returnDate: cd.returnDate || (cd.returnDateTime ? cd.returnDateTime.split("T")[0] : ""),
    delivery_agent_signature: cd.delivery_agent_signature || "",
    delivery_tenant_signature: cd.delivery_tenant_signature || "",
    return_agent_signature: cd.return_agent_signature || "",
    return_tenant_signature: cd.return_tenant_signature || "",
  };
};

export const generateContractShareMessage = (contract: Contract): string => {
  const company = getCompanyDisplayName();
  const start = new Date(contract.start_date).toLocaleDateString("fr-FR");
  const end = new Date(contract.end_date).toLocaleDateString("fr-FR");
  const vehicle = contract.vehicle || "Véhicule";
  const client = contract.customer_name || "Client";
  const num = contract.contract_number;
  const total = contract.total_amount ? `${contract.total_amount.toLocaleString()} MAD` : "N/A";
  const advance = contract.advance_payment ? `${contract.advance_payment.toLocaleString()} MAD` : "0 MAD";
  const reste = (contract.remaining_amount !== undefined && contract.remaining_amount !== null)
    ? `${contract.remaining_amount.toLocaleString()} MAD`
    : "0 MAD";

  return `🚗 *${company}* — Résumé de Location
📄 *Contrat N°:* #${num}
👤 *Locataire:* ${client}
🚘 *Véhicule:* ${vehicle}
📅 *Période:* Du ${start} au ${end}
💰 *Total:* ${total} | *Avance:* ${advance} | *Reste:* ${reste}

Merci pour votre confiance ! Pour toute question, nous restons à votre entière disposition.`;
};

export const openWhatsAppContract = (contract: Contract) => {
  const text = generateContractShareMessage(contract);
  const rawPhone = contract.customer_phone || "";
  let sanitized = rawPhone.replace(/[^\d]/g, "");
  if (sanitized.startsWith("0")) {
    sanitized = "212" + sanitized.slice(1);
  }
  const base = sanitized ? `https://wa.me/${sanitized}` : "https://api.whatsapp.com/send";
  window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank");
};
