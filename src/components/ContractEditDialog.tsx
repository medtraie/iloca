
import EnhancedContractFormDialog from "./EnhancedContractFormDialog";
import { Contract } from "@/hooks/useContracts";

interface ContractEditDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedContract: Contract) => void;
  contracts?: any[];
}

const ContractEditDialog = ({ contract, open, onOpenChange, onSave, contracts = [] }: ContractEditDialogProps) => {
  return (
    <EnhancedContractFormDialog
      contract={contract}
      open={open}
      onOpenChange={onOpenChange}
      onSave={onSave}
      mode="edit"
      contracts={contracts}
    />
  );
};

export default ContractEditDialog;
