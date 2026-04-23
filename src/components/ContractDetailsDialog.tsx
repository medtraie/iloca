
import EnhancedContractFormDialog from "./EnhancedContractFormDialog";
import { Contract } from "@/hooks/useContracts";
import { useContractSignatures } from "@/hooks/useContractSignatures";
import { Signature } from "lucide-react";

interface ContractDetailsDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts?: any[];
}

const ContractDetailsDialog = ({ contract, open, onOpenChange, contracts = [] }: ContractDetailsDialogProps) => {
  // Récupération des signatures liées au contrat
  const { signatures, loading } = useContractSignatures(contract?.id);

  return (
    <div>
      <EnhancedContractFormDialog
        contract={contract}
        open={open}
        onOpenChange={onOpenChange}
        mode="view"
        contracts={contracts}
      />
      {/* Affichage des signatures en bas des détails */}
      {open && contract && (
        <div className="px-6 pb-6">
          <div className="border-t mt-4 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Signature className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-lg">Signatures Électroniques Associées</span>
            </div>
            {loading ? (
              <div className="text-gray-500 text-sm">Chargement des signatures...</div>
            ) : signatures.length === 0 ? (
              <div className="text-gray-400 text-sm">Aucune signature électronique associée à ce contrat.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {signatures.map(sig => (
                  <div key={sig.id} className="border rounded-lg p-3 bg-blue-50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-blue-800">Nom: {sig.signer_name}</span>
                        <span className="text-sm text-blue-700">Email: {sig.signer_email}</span>
                        <span className="text-sm text-blue-600">
                          Type: {sig.signature_type === "delivery" ? "Livraison" : 
                                 sig.signature_type === "return" ? "Retour" : 
                                 sig.signature_type}
                        </span>
                        <span className="text-sm text-gray-500">
                          Date de signature: {sig.signature_date ? 
                            new Date(sig.signature_date).toLocaleString("fr-FR") : "-"}
                        </span>
                      </div>
                      {sig.signature_data && (
                        <div className="flex-shrink-0">
                          <img
                            src={sig.signature_data}
                            alt={`Signature de ${sig.signer_name}`}
                            className="w-44 h-20 border rounded-md bg-card object-contain shadow"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDetailsDialog;
