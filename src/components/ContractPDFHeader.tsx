import { getCompanyContactLines, getCompanyInfo } from "@/utils/companyInfo";

interface ContractPDFHeaderProps {
  contractNumber: string;
}

const ContractPDFHeader = ({ contractNumber }: ContractPDFHeaderProps) => {
  const { name: companyName, logo: companyLogo } = getCompanyInfo();
  const { addressLine: lineAddress, phoneFaxLine: linePhoneFax, gsmLine: lineGsm, emailLine: lineEmail } =
    getCompanyContactLines();
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
