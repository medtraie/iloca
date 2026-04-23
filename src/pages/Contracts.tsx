
import ContractsHeader from "@/components/ContractsHeader";
import ContractsSearchBar from "@/components/ContractsSearchBar";
import ContractsStats from "@/components/ContractsStats";
import ContractsTable from "@/components/ContractsTable";
import ContractDetailsDialog from "@/components/ContractDetailsDialog";
import ContractEditDialog from "@/components/ContractEditDialog";
import PaymentStatusFilter from "@/components/PaymentStatusFilter";
import { useContractsPageLogic } from "@/hooks/useContractsPageLogic";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractMigrationButton } from "@/components/ContractMigrationButton";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

// Options de statut des contrats simplifiées
const contractStatusOptions = [
  { label: "Tous", value: "all" },
  { label: "Ouvert", value: "ouvert" },
  { label: "Fermé", value: "ferme" },
];

const Contracts = () => {
  const {
    contracts,
    loading,
    filteredContracts,
    statusFilter,
    setStatusFilter,
    financialStatusFilter,
    setFinancialStatusFilter,
    searchTerm,
    setSearchTerm,
    handleAddContract,
    handleDeleteContract,
    handleViewDetails,
    handleEditContract,
    handleSaveContract,
    handleSendForSignature,
    selectedContract,
    setSelectedContract,
    isDetailsOpen,
    setIsDetailsOpen,
    isEditOpen,
    setIsEditOpen,
    signatureLoading,
    getPaymentSummary,
  } = useContractsPageLogic();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 text-accent animate-spin" />
          <p className="text-muted-foreground font-medium">Chargement des contrats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-1">
            Gestion des <span className="text-accent">Contrats</span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Suivi des locations et status financier
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="lg"
            onClick={() => window.location.reload()}
            className="rounded-xl h-12 px-6 font-bold shadow-sm hover:scale-105 transition-transform hidden md:flex"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button 
            onClick={handleAddContract}
            className="rounded-xl h-12 px-6 font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 hover:scale-105 transition-transform"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Contrat
          </Button>
        </div>
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="bg-card p-6 rounded-[2rem] border border-border/50 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Statut général</span>
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {contractStatusOptions.map(opt => (
              <button
                key={opt.value}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                  ${statusFilter === opt.value
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }
                `}
                onClick={() => setStatusFilter(opt.value as any)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-[2rem] border border-border/50 shadow-sm">
          <PaymentStatusFilter 
            financialStatusFilter={financialStatusFilter}
            setFinancialStatusFilter={setFinancialStatusFilter}
          />
        </div>
      </motion.div>

      {/* Search and Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-6"
      >
        <div className="bg-card p-4 rounded-[2rem] border border-border/50 shadow-sm">
          <ContractsSearchBar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onAddContract={handleAddContract}
          />
        </div>
        
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-bold">Aperçu Statistique</h2>
          <ContractMigrationButton />
        </div>

        <ContractsStats contracts={contracts} />
        
        <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Liste des contrats</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractsTable 
              contracts={filteredContracts}
              onViewDetails={handleViewDetails}
              onEditContract={handleEditContract}
              onDeleteContract={handleDeleteContract}
              onSendForSignature={handleSendForSignature}
              signatureLoading={signatureLoading}
              getPaymentSummary={getPaymentSummary}
            />
          </CardContent>
        </Card>
      </motion.div>

      <ContractDetailsDialog
        contract={selectedContract}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        contracts={contracts}
      />
      <ContractEditDialog
        contract={selectedContract}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSave={handleSaveContract}
        contracts={contracts}
      />
    </div>
  );
};

export default Contracts;
