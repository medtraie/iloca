
interface ContractPDFHeaderProps {
  contractNumber: string;
}

const ContractPDFHeader = ({ contractNumber }: ContractPDFHeaderProps) => {
  const readValue = (key: string): string => {
    try {
      const v = localStorage.getItem(key);
      if (!v) return '';
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    } catch {
      return '';
    }
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
  return (
    <div className="mb-8">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 flex items-center gap-3">
          {companyLogo && (
            <img src={companyLogo} alt="Logo" className="h-12 w-12 object-contain" />
          )}
          <div>
            <div className="text-2xl font-bold tracking-wider">
              {companyName}
            </div>
            <div className="text-lg tracking-wide mt-1">
              LOCATION DE VOITURES
            </div>
          </div>
        </div>
        <div className="text-sm text-right leading-relaxed">
          <div>{lineAddress}</div>
          <div>{linePhoneFax}</div>
          <div>{lineGsm}</div>
          <div>{lineEmail}</div>
        </div>
      </div>
      <div className="text-center mb-4">
        <div className="text-lg font-semibold mb-2">
          Courte et longue durée 7/7
        </div>
      </div>
      <div className="flex items-center justify-center relative mb-6">
        <div className="border-2 border-black px-8 py-2">
          <span className="text-xl font-bold tracking-wider">
            CONTRAT DE LOCATION
          </span>
        </div>
        <div className="absolute right-0 text-lg font-bold">
          N° : {contractNumber}
        </div>
      </div>
    </div>
  );
};

export default ContractPDFHeader;
