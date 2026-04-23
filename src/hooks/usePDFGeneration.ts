
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useCallback } from 'react';

export interface ContractPDFData {
  contractNumber: string;
  customerLastName: string;
  customerFirstName: string;
  customerAddressMorocco: string;
  customerPhone: string;
  customerAddressForeign: string;
  customerCin: string;
  customerCinDelivered: string;
  customerCinImageUrl?: string;
  customerLicenseNumber: string;
  customerLicenseDelivered: string;
  customerLicenseImageUrl?: string;
  customerPassportNumber: string;
  customerPassportDelivered: string;
  customerBirthDate: string;
  secondDriverLastName: string;
  secondDriverFirstName: string;
  secondDriverAddressMorocco: string;
  secondDriverPhone: string;
  secondDriverAddressForeign: string;
  secondDriverCin: string;
  secondDriverCinDelivered: string;
  secondDriverLicenseNumber: string;
  secondDriverLicenseDelivered: string;
  secondDriverPassportNumber: string;
  secondDriverPassportDelivered: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleRegistration: string;
  vehicleYear: string;
  vehicleKmDepart: string;
  deliveryLocation: string;
  deliveryDateTime: string;
  rentalDays: string;
  emergencyEquipmentDelivery: string;
  observationsDelivery: string;
  deliveryFuelLevel: number; // CRITICAL: Interactive fuel level
  deliveryDamages?: Array<{id: string; x: number; y: number}>; // CRITICAL: Interactive damage points
  returnDateTime: string;
  returnLocation: string;
  extensionUntil: string;
  vehicleKmReturn: string;
  extendedDays: string;
  emergencyEquipmentReturn: string;
  observationsReturn: string;
  returnFuelLevel: number; // CRITICAL: Interactive fuel level
  returnDamages?: Array<{id: string; x: number; y: number}>; // CRITICAL: Interactive damage points
  dailyPrice: string;
  rentalDuration: string;
  totalPrice: number;
  advance: string;
  remaining: number;
  paymentMethod: string;
  deliveryDate: string;
  returnDate: string;
  
  // Signatures - Electronic signatures
  delivery_agent_signature?: string;
  delivery_tenant_signature?: string; 
  return_agent_signature?: string;
  return_tenant_signature?: string;
}

export const usePDFGeneration = () => {
  // Helper: format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return '';
    }
  };

  // Helper: ensure field is not undefined/null
  const safeField = (value: any) => (value ?? '') as string;

  // Helper: convert signature data (base64 image) to validated image src
  const convertSignatureToImage = async (signatureData: string): Promise<string> => {
    if (!signatureData || signatureData.trim() === '') {
      console.log('[convertSignatureToImage] No signature data provided');
      return '';
    }

    if (signatureData.startsWith('data:image/')) {
      console.log('[convertSignatureToImage] Signature is already base64 image');
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          console.log('[convertSignatureToImage] Base64 image validated successfully');
          resolve(signatureData);
        };
        img.onerror = () => {
          console.error('[convertSignatureToImage] Invalid base64 image data');
          resolve('');
        };
        img.src = signatureData;
      });
    }

    console.log('[convertSignatureToImage] Signature data is not a base64 image, returning empty');
    return '';
  };

  // Helper: render signature box content
  const renderSignatureBox = (signatureImg: string, fallbackText: string, altText: string) => {
    if (signatureImg && signatureImg.length > 100) {
      return `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
          <img 
            src="${signatureImg}" 
            style="max-width: 95%; max-height: 95%; object-fit: contain; border: none;" 
            alt="${altText}"
            onError="this.style.display='none'; this.parentElement.innerHTML='${fallbackText}';"
          />
        </div>
      `;
    } else {
      return `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 7pt; line-height: 1.1; text-align: center;">
          ${fallbackText}
        </div>
      `;
    }
  };

  // Styles (used by both print and blob)
  const getHtmlStyles = () => `
    <style>
      @page {
        size: A4;
        margin: 5mm;
      }
      /* Root wrapper to be used both in print window body and blob container */
      .pdf-root { 
        font-family: Arial, sans-serif; 
        margin: 0; 
        padding: 0; 
        font-size: 10pt;
        line-height: 1.2;
        color: #000;
        height: 297mm;
        width: 210mm;
        box-sizing: border-box;
      }
      body { 
        font-family: Arial, sans-serif; 
        margin: 0; 
        padding: 0; 
        font-size: 10pt;
        line-height: 1.2;
        color: #000;
        height: 297mm;
        width: 210mm;
        box-sizing: border-box;
      }
      .container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      /* Header Section */
      .header { 
        min-height: 30mm;
        height: auto;
        margin-bottom: 3mm;
      }
      .company-info { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start; 
        margin-bottom: 3mm; 
      }
      .company-name { 
        font-size: 14pt; 
        font-weight: bold; 
        letter-spacing: 1px; 
      }
      .company-subtitle { 
        font-size: 10pt; 
        letter-spacing: 0.5px; 
        margin-top: 1mm; 
      }
      .contact-info { 
        text-align: right; 
        font-size: 8pt; 
        line-height: 1.1; 
      }
      .center-text { 
        text-align: center; 
        margin-top: 2mm;
        margin-bottom: 3mm; 
      }
      .contract-title { 
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: black;
        color: white;
        padding: 2mm 8mm; 
        font-size: 12pt; 
        font-weight: bold; 
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .contract-number { 
        text-align: right; 
        font-size: 10pt; 
        font-weight: bold; 
        margin-top: 2mm; 
      }
      /* Locataire Section - 7.5cm */
      .locataire-section {
        height: auto;
        min-height: 75mm;
        margin-bottom: 2mm;
      }
      /* Vehicle Section - 10cm */
      .vehicle-section {
        height: 100mm;
        margin-bottom: 2mm;
      }
      /* Facturation Section - 4.5cm */
      .facturation-section {
        height: 45mm;
        margin-bottom: 2mm;
      }
      /* Signatures Section - 4.5cm */
      .signatures-section {
        height: 45mm;
      }
      .section-header { 
        background-color: black; 
        color: white; 
        padding: 2mm 1.5mm; 
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold; 
        margin-bottom: 2.5mm;
        font-size: 10pt;
        line-height: 1.3;
        text-transform: uppercase;
      }
      .subsection-title { 
        font-weight: bold; 
        text-align: center; 
        border-bottom: 1px solid black; 
        padding-bottom: 1.2mm; 
        margin-bottom: 2mm;
        font-size: 9pt;
        line-height: 1.3;
      }
      .grid { 
        display: grid; 
        gap: 2mm; 
        margin-bottom: 2mm; 
      }
      .grid-2 { 
        grid-template-columns: 1fr 1fr; 
      }
      .grid-3 { 
        grid-template-columns: 1fr 1fr 1fr; 
      }
      .grid-5 { 
        grid-template-columns: repeat(5, 1fr); 
      }
      .field { 
        margin-bottom: 0.5mm; 
        font-size: 8pt;
        min-height: 12pt;
        display: flex;
        align-items: center;
      }
      .field strong { 
        font-weight: bold; 
      }
      .field-value {
        border-bottom: 1px solid #ccc;
        min-height: 10pt;
        padding: 1px 2px;
        flex-grow: 1;
        margin-left: 2mm;
      }
      .compact-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1mm;
        font-size: 8pt;
      }
      .fuel-gauge { 
        display: flex; 
        align-items: center; 
        gap: 2mm; 
        margin: 1mm 0;
        font-size: 7pt;
      }
      .fuel-bar { 
        width: 25mm; 
        height: 3mm; 
        border: 1px solid black; 
        position: relative; 
      }
      .fuel-fill { 
        height: 100%; 
        background-color: black; 
      }
      .vehicle-diagram { 
        border: 1px solid black; 
        padding: 1mm; 
        text-align: center; 
        height: 25mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      .vehicle-diagram-title {
        font-size: 7pt;
        margin-bottom: 1mm;
        font-weight: bold;
      }
      .vehicle-diagram img {
        max-width: 40mm;
        max-height: 20mm;
        object-fit: contain;
      }
      .signature-box { 
        border: 1px solid black; 
        height: 15mm; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 7pt; 
        text-align: center; 
        line-height: 1.1;
      }
      .terms-box { 
        background-color: #f8f9fa; 
        border-left: 2px solid #007bff; 
        padding: 2mm; 
        margin: 2mm 0;
        font-size: 8pt;
      }
      @media print {
        body { margin: 0; padding: 2mm; font-size: 9pt; }
        .no-print { display: none; }
        @page { margin: 3mm; }
      }
    </style>
  `;

  // Inner HTML builder (without html/head/body wrappers)
  const getHtmlInnerContent = (
    data: ContractPDFData,
    signatures: {
      deliveryAgentImg: string;
      deliveryTenantImg: string;
      returnAgentImg: string;
      returnTenantImg: string;
    },
    opts?: { vehicleDiagramDataUrl?: string }
  ) => {
    const readValue = (key: string): string => {
      try {
        const v = localStorage.getItem(key);
        if (!v) return '';
        try { return JSON.parse(v); } catch { return v; }
      } catch { return ''; }
    };
    const companyName = readValue('companyName') || 'SFTLOCATION';
    const companyLogo = readValue('companyLogo');
    const companyAddress = readValue('companyAddress');
    const companyPhone = readValue('companyPhone');
    const companyFax = readValue('companyFax');
    const companyGsm = readValue('companyGsm');
    const companyEmail = readValue('companyEmail');
    const lineAddress = companyAddress || '10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc';
    const linePhoneFax = (companyPhone || companyFax)
      ? `${companyPhone ? `Tél: ${companyPhone}` : ''}${companyPhone && companyFax ? ' - ' : ''}${companyFax ? `Fax: ${companyFax}` : ''}`
      : 'Tél: 0522228704 - Fax: 05 22 47 17 80';
    const lineGsm = companyGsm ? `GSM: ${companyGsm}` : 'GSM: 06 62 59 63 07';
    const lineEmail = companyEmail ? `E-mail: ${companyEmail}` : 'E-mail: bonatours308@gmail.com';
    const diagramSrc = opts?.vehicleDiagramDataUrl || '/lovable-uploads/b28228b7-89d0-46f1-88ae-39cdf67d2bde.png';
    return `
    <div class="pdf-root">
      <div class="container">
        <!-- Header Section -->
        <div class="header">
          <div class="company-info">
            <div>
              <div style="display:flex; align-items:center; gap:4mm;">
                ${companyLogo ? `<img src="${companyLogo}" style="max-height: 15mm; max-width: 20mm; object-fit: contain;" alt="Logo" />` : ``}
                <div class="company-name">${companyName}</div>
              </div>
              <div class="company-subtitle">LOCATION DE VOITURES</div>
            </div>
            <div class="contact-info">
              <div>${lineAddress}</div>
              <div>${linePhoneFax}</div>
              <div>${lineGsm}</div>
              <div>${lineEmail}</div>
            </div>
          </div>
          <div class="center-text">
            <div style="font-size: 9pt; font-weight: 600; margin-bottom: 1mm;">Courte et longue durée 7/7</div>
            <div class="contract-title">CONTRAT DE LOCATION</div>
            <div class="contract-number">N° : ${safeField(data.contractNumber)}</div>
          </div>
        </div>

        <!-- Locataire Section -->
        <div class="locataire-section">
          <div class="section-header">LOCATAIRE</div>
          <div class="grid grid-2">
            <div>
              <div class="subsection-title">Locataire</div>
              <div class="compact-grid">
                <div class="field"><strong>Nom:</strong><span class="field-value">${safeField(data.customerLastName)}</span></div>
                <div class="field"><strong>Prénom:</strong><span class="field-value">${safeField(data.customerFirstName)}</span></div>
                <div class="field"><strong>Tél:</strong><span class="field-value">${safeField(data.customerPhone)}</span></div>
                <div class="field"><strong>C.I.N. N°:</strong><span class="field-value">${safeField(data.customerCin)}</span></div>
                <div class="field"><strong>Délivré le:</strong><span class="field-value">${formatDate(data.customerCinDelivered)}</span></div>
                <div class="field"><strong>Permis N°:</strong><span class="field-value">${safeField(data.customerLicenseNumber)}</span></div>
                <div class="field"><strong>Délivré le:</strong><span class="field-value">${formatDate(data.customerLicenseDelivered)}</span></div>
                <div class="field"><strong>Passeport N°:</strong><span class="field-value">${safeField(data.customerPassportNumber)}</span></div>
                <div class="field"><strong>Délivré le:</strong><span class="field-value">${formatDate(data.customerPassportDelivered)}</span></div>
              </div>
              <div class="field"><strong>Adresse au Maroc:</strong><span class="field-value">${safeField(data.customerAddressMorocco)}</span></div>
              <div class="field"><strong>Adresse à l'Étranger:</strong><span class="field-value">${safeField(data.customerAddressForeign)}</span></div>
              <div class="field"><strong>Date de Naissance:</strong><span class="field-value">${formatDate(data.customerBirthDate)}</span></div>
            </div>
            <div>
              <div class="subsection-title">2ème Conducteur</div>
              <div class="compact-grid">
                <div class="field"><strong>Nom:</strong><span class="field-value">${safeField(data.secondDriverLastName)}</span></div>
                <div class="field"><strong>Prénom:</strong><span class="field-value">${safeField(data.secondDriverFirstName)}</span></div>
                <div class="field"><strong>Tél:</strong><span class="field-value">${safeField(data.secondDriverPhone)}</span></div>
                <div class="field"><strong>C.I.N. N°:</strong><span class="field-value">${safeField(data.secondDriverCin)}</span></div>
                <div class="field"><strong>Délivré le:</strong><span class="field-value">${formatDate(data.secondDriverCinDelivered)}</span></div>
                <div class="field"><strong>Permis N°:</strong><span class="field-value">${safeField(data.secondDriverLicenseNumber)}</span></div>
                <div class="field"><strong>Délivré le:</strong><span class="field-value">${formatDate(data.secondDriverLicenseDelivered)}</span></div>
                <div class="field"><strong>Passeport N°:</strong><span class="field-value">${safeField(data.secondDriverPassportNumber)}</span></div>
                <div class="field"><strong>Délivré le:</strong><span class="field-value">${formatDate(data.secondDriverPassportDelivered)}</span></div>
              </div>
              <div class="field"><strong>Adresse au Maroc:</strong><span class="field-value">${safeField(data.secondDriverAddressMorocco)}</span></div>
              <div class="field"><strong>Adresse à l'Étranger:</strong><span class="field-value">${safeField(data.secondDriverAddressForeign)}</span></div>
            </div>
          </div>
        </div>

        <!-- Vehicle Section -->
        <div class="vehicle-section">
          <div class="section-header">VÉHICULE</div>
          <div class="grid grid-2">
            <div>
              <div class="subsection-title">Livraison du Véhicule</div>
              <div class="compact-grid">
                <div class="field"><strong>Marque:</strong><span class="field-value">${safeField(data.vehicleBrand)}</span></div>
                <div class="field"><strong>Modèle:</strong><span class="field-value">${safeField(data.vehicleModel)}</span></div>
                <div class="field"><strong>Immatricule:</strong><span class="field-value">${safeField(data.vehicleRegistration)}</span></div>
                <div class="field"><strong>Année:</strong><span class="field-value">${safeField(data.vehicleYear)}</span></div>
                <div class="field"><strong>Km Départ:</strong><span class="field-value">${safeField(data.vehicleKmDepart)}</span></div>
                <div class="field"><strong>Lieu:</strong><span class="field-value">${safeField(data.deliveryLocation)}</span></div>
                <div class="field"><strong>Date et Heure:</strong><span class="field-value">${formatDate(data.deliveryDateTime)}</span></div>
                <div class="field"><strong>Nombre de Jour:</strong><span class="field-value">${safeField(data.rentalDays)}</span></div>
              </div>
              
              <div class="vehicle-diagram" style="margin-top: 2mm;">
                <div class="vehicle-diagram-title">État du Véhicule - Livraison</div>
                <div style="position: relative; display: inline-block;">
                  <img src="${diagramSrc}" alt="État du véhicule" style="width: 40mm; height: 20mm;" />
                  ${data.deliveryDamages ? data.deliveryDamages.map((damage) => 
                    `<div style="position: absolute; left: ${damage.x}%; top: ${damage.y}%; width: 2mm; height: 2mm; background-color: red; border: 1px solid white; border-radius: 50%; transform: translate(-50%, -50%);"></div>`
                  ).join('') : ''}
                </div>
              </div>
              
              <div class="fuel-gauge" style="margin-top: 2mm;">
                <span>Carburant:</span>
                <div class="fuel-bar">
                  <div class="fuel-fill" style="width: ${data.deliveryFuelLevel || 0}%"></div>
                </div>
                <span>${data.deliveryFuelLevel || 0}%</span>
              </div>
              <div class="field" style="font-size: 7pt; margin-top: 2mm;"><strong>Accessoires:</strong><span class="field-value">${safeField(data.emergencyEquipmentDelivery)}</span></div>
              <div class="field" style="font-size: 7pt;"><strong>Observations:</strong><span class="field-value">${safeField(data.observationsDelivery)}</span></div>
            </div>
            <div>
              <div class="subsection-title">Reprise du Véhicule</div>
              <div class="compact-grid">
                <div class="field"><strong>Date:</strong><span class="field-value">${formatDate(data.returnDateTime)}</span></div>
                <div class="field"><strong>Lieu:</strong><span class="field-value">${safeField(data.returnLocation)}</span></div>
                <div class="field"><strong>Prolongation:</strong><span class="field-value">${formatDate(data.extensionUntil)}</span></div>
                <div class="field"><strong>Km Retour:</strong><span class="field-value">${safeField(data.vehicleKmReturn)}</span></div>
                <div class="field"><strong>Jours Prolongés:</strong><span class="field-value">${safeField(data.extendedDays)}</span></div>
              </div>
              
              <div class="vehicle-diagram" style="margin-top: 2mm;">
                <div class="vehicle-diagram-title">État du Véhicule - Retour</div>
                <div style="position: relative; display: inline-block;">
                  <img src="${diagramSrc}" alt="État du véhicule" style="width: 40mm; height: 20mm;" />
                  ${data.returnDamages ? data.returnDamages.map((damage) => 
                    `<div style="position: absolute; left: ${damage.x}%; top: ${damage.y}%; width: 2mm; height: 2mm; background-color: red; border: 1px solid white; border-radius: 50%; transform: translate(-50%, -50%);"></div>`
                  ).join('') : ''}
                </div>
              </div>
              
              <div class="fuel-gauge" style="margin-top: 2mm;">
                <span>Carburant:</span>
                <div class="fuel-bar">
                  <div class="fuel-fill" style="width: ${data.returnFuelLevel || 0}%"></div>
                </div>
                <span>${data.returnFuelLevel || 0}%</span>
              </div>
              <div class="field" style="font-size: 7pt; margin-top: 2mm;"><strong>Accessoires:</strong><span class="field-value">${safeField(data.emergencyEquipmentReturn)}</span></div>
              <div class="field" style="font-size: 7pt;"><strong>Observations:</strong><span class="field-value">${safeField(data.observationsReturn)}</span></div>
            </div>
          </div>
        </div>

        <!-- Facturation Section -->
        <div class="facturation-section">
          <div class="section-header">FACTURATION</div>
          <div class="grid grid-5" style="margin-bottom: 2mm;">
            <div class="field"><strong>Prix/Jour:</strong><br><span class="field-value">${safeField(data.dailyPrice)} DH</span></div>
            <div class="field"><strong>Durée:</strong><br><span class="field-value">${safeField(data.rentalDuration)} jour(s)</span></div>
            <div class="field"><strong>Prix total:</strong><br><span class="field-value">${data.totalPrice || 0} DH</span></div>
            <div class="field"><strong>Avance:</strong><br><span class="field-value">${safeField(data.advance)} DH</span></div>
            <div class="field"><strong>Reste:</strong><br><span class="field-value">${data.remaining || 0} DH</span></div>
          </div>
          <div class="field"><strong>Mode de Règlement:</strong><span class="field-value">${safeField(data.paymentMethod)}</span></div>
          
          <div class="terms-box">
            <p><strong>Le locataire du véhicule ${companyName}</strong> reconnaît avoir lu et accepté les conditions générales stipulées au verso du présent contrat, il est le seul responsable en cas de violation de code de la route marocaine.</p>
          </div>
        </div>

        <!-- Signatures Section -->
        <div class="signatures-section">
          <div class="grid grid-2">
            <div>
              <div class="subsection-title">Signatures à la livraison</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2mm;">
                <div>
                  <div style="margin-bottom: 1mm; font-size: 8pt;">Date: <span class="field-value">${formatDate(data.deliveryDate)}</span></div>
                  <div class="signature-box" style="height: 20mm; position: relative;">
                    ${renderSignatureBox(signatures.deliveryAgentImg, 'Lu et approuvé<br>Signature agent<br>livraison', 'Signature agent livraison')}
                  </div>
                </div>
                <div>
                  <div style="margin-bottom: 1mm; font-size: 8pt;">Date: <span class="field-value">${formatDate(data.deliveryDate)}</span></div>
                  <div class="signature-box" style="height: 20mm; position: relative;">
                    ${renderSignatureBox(signatures.deliveryTenantImg, 'Lu et approuvé<br>Signature locataire<br>livraison', 'Signature locataire livraison')}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div class="subsection-title">Signatures au retour</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2mm;">
                <div>
                  <div style="margin-bottom: 1mm; font-size: 8pt;">Date: <span class="field-value">${formatDate(data.returnDate)}</span></div>
                  <div class="signature-box" style="height: 20mm; position: relative;">
                    ${renderSignatureBox(signatures.returnAgentImg, 'Lu et approuvé<br>Signature agent<br>retour', 'Signature agent retour')}
                  </div>
                </div>
                <div>
                  <div style="margin-bottom: 1mm; font-size: 8pt;">Date: <span class="field-value">${formatDate(data.returnDate)}</span></div>
                  <div class="signature-box" style="height: 20mm; position: relative;">
                    ${renderSignatureBox(signatures.returnTenantImg, 'Lu et approuvé<br>Signature locataire<br>retour', 'Signature locataire retour')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  const fetchAsDataUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const generatePDF = useCallback(async (data: ContractPDFData, filename: string = 'contract.pdf') => {
    try {
      // Convert signatures for embedding
      const [deliveryAgentImg, deliveryTenantImg, returnAgentImg, returnTenantImg] = await Promise.all([
        convertSignatureToImage(data.delivery_agent_signature || ''),
        convertSignatureToImage(data.delivery_tenant_signature || ''),
        convertSignatureToImage(data.return_agent_signature || ''),
        convertSignatureToImage(data.return_tenant_signature || ''),
      ]);

      // Create a hidden container for the HTML content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm'; // A4 width
      container.style.height = '297mm'; // A4 height
      document.body.appendChild(container);

      // Preload vehicle diagram as data URL to avoid CORS/404 issues
      const diagramUrl = await fetchAsDataUrl('/lovable-uploads/b28228b7-89d0-46f1-88ae-39cdf67d2bde.png');

      // Inject styles and inner content
      const htmlInner = `${getHtmlStyles()}${getHtmlInnerContent(
        data, 
        { deliveryAgentImg, deliveryTenantImg, returnAgentImg, returnTenantImg },
        { vehicleDiagramDataUrl: diagramUrl || undefined }
      )}`;
      container.innerHTML = htmlInner;

      // Wait for images to load
      const images = Array.from(container.getElementsByTagName('img'));
      const promises = images.map(img => new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      }));
      await Promise.all(promises);

      // Generate canvas from the container
      const canvas = await html2canvas(container, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
      });

      // Remove the container from the DOM
      document.body.removeChild(container);

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Trigger download using the provided filename (desktop browsers)
      try {
        pdf.save(filename);
      } catch (e) {
        // In environments where auto-download is not permitted, ignore
      }

      // Also return the Blob so it can be shared via Web Share API on mobile
      return pdf.output('blob');

    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  }, []);

  const generatePDFBlob = useCallback(async (data: ContractPDFData): Promise<Blob | null> => {
    try {
      // Convert signatures for embedding
      const [deliveryAgentImg, deliveryTenantImg, returnAgentImg, returnTenantImg] = await Promise.all([
        convertSignatureToImage(data.delivery_agent_signature || ''),
        convertSignatureToImage(data.delivery_tenant_signature || ''),
        convertSignatureToImage(data.return_agent_signature || ''),
        convertSignatureToImage(data.return_tenant_signature || ''),
      ]);

      // Create a hidden container for the HTML content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.height = '297mm';
      document.body.appendChild(container);

      // Preload vehicle diagram as data URL to avoid CORS/404 issues
      const diagramUrl = await fetchAsDataUrl('/lovable-uploads/b28228b7-89d0-46f1-88ae-39cdf67d2bde.png');

      // Inject styles and inner content
      const htmlInner = `${getHtmlStyles()}${getHtmlInnerContent(
        data, 
        { deliveryAgentImg, deliveryTenantImg, returnAgentImg, returnTenantImg },
        { vehicleDiagramDataUrl: diagramUrl || undefined }
      )}`;
      container.innerHTML = htmlInner;

      // Wait for images to load
      const images = Array.from(container.getElementsByTagName('img'));
      const promises = images.map(img => new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      }));
      await Promise.all(promises);

      // Generate canvas from the container
      const canvas = await html2canvas(container, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
      });

      // Remove the container from the DOM
      document.body.removeChild(container);

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      return pdf.output('blob');

    } catch (error) {
      console.error('Error generating PDF blob:', error);
      return null;
    }
  }, []);

  return { generatePDF, generatePDFBlob };
};
