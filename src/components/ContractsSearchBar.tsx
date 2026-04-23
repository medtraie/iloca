
import React, { useState } from "react";
import { Plus } from "lucide-react";
import NewContractDialog from "@/components/NewContractDialog";
import { EnhancedSearchBar, FilterOption, ActiveFilter } from "@/components/enhanced/EnhancedSearchBar";

interface ContractsSearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onAddContract: (newContractData: any) => void;
}

const ContractsSearchBar = ({ searchTerm, setSearchTerm, onAddContract }: ContractsSearchBarProps) => {
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  
  // Filtres disponibles pour les contrats
  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Statut du contrat',
      options: [
        { value: 'ouvert', label: 'Ouvert' },
        { value: 'ferme', label: 'Fermé' },
        { value: 'draft', label: 'Brouillon' }
      ]
    },
    {
      key: 'financial_status',
      label: 'État financier',
      options: [
        { value: 'paid', label: 'Payé' },
        { value: 'pending', label: 'En attente' },
        { value: 'overdue', label: 'En retard' }
      ]
    }
  ];

  return (
    <div className="mb-6">
      <EnhancedSearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Rechercher par client, véhicule, numéro de contrat..."
        filters={filterOptions}
        primaryAction={{
          label: "Nouveau contrat",
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => setIsNewContractOpen(true)
        }}
      />
      
      <NewContractDialog 
        onAddContract={onAddContract}
        open={isNewContractOpen}
        onOpenChange={setIsNewContractOpen}
      />
    </div>
  );
};

export default ContractsSearchBar;
