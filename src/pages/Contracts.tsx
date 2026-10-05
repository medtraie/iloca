import React, { useState, useMemo } from "react";
import ContractsSearchBar from "@/components/ContractsSearchBar";
import ContractsStats from "@/components/ContractsStats";
import ContractsTable from "@/components/ContractsTable";
import ContractDetailsDialog from "@/components/ContractDetailsDialog";
import ContractEditDialog from "@/components/ContractEditDialog";
import NewContractDialog from "@/components/NewContractDialog";
import PaymentStatusFilter from "@/components/PaymentStatusFilter";
import { ContractsKanban } from "@/components/contracts/ContractsKanban";
import { ContractMobileCard } from "@/components/contracts/ContractMobileCard";
import { ContractsOperationsDrawer } from "@/components/contracts/ContractsOperationsDrawer";
import { useContractsPageLogic } from "@/hooks/useContractsPageLogic";
import { usePayments } from "@/hooks/usePayments";
import { usePDFGeneration } from "@/hooks/usePDFGeneration";
import { buildPdfDataFromContract } from "@/utils/contractShareUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCcw,
  Plus,
  Table2,
  Columns3,
  Smartphone,
  Sparkles,
  Car,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { computeContractSummary } from "@/utils/contractMath";

type ViewMode = "table" | "kanban" | "cards";

const contractStatusOptions = [
  { label: "Tous les statuts", value: "all" },
  { label: "En circulation", value: "ouvert" },
  { label: "Clôturés", value: "ferme" },
];

const Contracts: React.FC = () => {
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const isMobile = useIsMobile();
  const { generatePDF } = usePDFGeneration();

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
    setIsDetailsOpen,
    isDetailsOpen,
    isEditOpen,
    setIsEditOpen,
    signatureLoading,
    getPaymentSummary
  } = useContractsPageLogic();

  const { payments } = usePayments();

  // Handle PDF generation from card/kanban/table
  const handleDownloadPDF = async (contract: any) => {
    try {
      const pdfData = buildPdfDataFromContract(contract);
      await generatePDF(pdfData, `Contrat_${contract.contract_number}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
  };

  // Quick stats computed for mobile operations drawer
  const drawerStats = useMemo(() => {
    let overdue = 0;
    let active = 0;
    contracts.forEach((c) => {
      const summary = computeContractSummary(c, { advanceMode: "field" });
      if (c.status === "ouvert") {
        active++;
        if ((summary.overdueDays || 0) > 0) overdue++;
      }
    });
    return {
      total: contracts.length,
      active,
      overdue,
      returningToday: 0,
    };
  }, [contracts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            Chargement du parc de contrats 2026...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 space-y-6 pb-24">
      {/* 2026 Fleet Operations Cockpit Header */}
      <motion.div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-card via-card/90 to-background border border-border/60 shadow-xs relative overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
              Fleet Operations & Rental Lifecycle 2026
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
            Centre des <span className="text-primary">Contrats & Locations</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-1">
            Supervisez le cycle complet de vos locations, prolongations et règlements في مكان واحد.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10 flex-wrap">
          {/* View mode switcher */}
          <div className="bg-muted/40 p-1 rounded-2xl border border-border/50 flex items-center gap-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue Tableau Haute Densité"
            >
              <Table2 className="h-4 w-4" />
              <span>Tableau</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Pipeline Cycle de Vie Kanban"
            >
              <Columns3 className="h-4 w-4" />
              <span>Pipeline</span>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "cards"
                  ? "bg-card text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Cartes Tactiles Mobiles"
            >
              <Smartphone className="h-4 w-4" />
              <span>Cartes</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={() => window.location.reload()}
            className="rounded-2xl h-11 px-4 font-bold border-border/60 hover:bg-muted hidden lg:flex"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>

          <Button
            onClick={() => setIsNewContractOpen(true)}
            className="rounded-2xl h-11 px-5 font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouveau Contrat
          </Button>
        </div>
      </motion.div>

      {/* Telemetry Section */}
      <ContractsStats
        contracts={contracts}
        onFilterSelect={(filterKey) => {
          if (filterKey === "all" || filterKey === "ouvert" || filterKey === "ferme") {
            setStatusFilter(filterKey as any);
          }
        }}
      />

      {/* Modern Filter Strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div className="bg-card p-4 rounded-2xl sm:rounded-3xl border border-border/50 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Statut du Contrat
            </span>
            <span className="text-xs font-bold text-primary">
              {filteredContracts.length} contrat{filteredContracts.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {contractStatusOptions.map((opt) => (
              <button
                key={opt.value}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setStatusFilter(opt.value as any)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl sm:rounded-3xl border border-border/50 shadow-xs flex items-center">
          <PaymentStatusFilter
            financialStatusFilter={financialStatusFilter}
            setFinancialStatusFilter={setFinancialStatusFilter}
          />
        </div>
      </motion.div>

      {/* Search Bar */}
      <div className="bg-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-border/50 shadow-xs">
        <ContractsSearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddContract={handleAddContract}
        />
      </div>

      {/* View Rendering based on active view mode */}
      <AnimatePresence mode="wait">
        {viewMode === "kanban" ? (
          <motion.div
            key="kanban-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <ContractsKanban
              contracts={filteredContracts}
              onViewDetails={handleViewDetails}
              onEditContract={handleEditContract}
              onDeleteContract={handleDeleteContract}
              onSendForSignature={handleSendForSignature}
              onDownloadPDF={handleDownloadPDF}
              signatureLoading={signatureLoading}
              getPaymentSummary={getPaymentSummary}
            />
          </motion.div>
        ) : viewMode === "cards" ? (
          <motion.div
            key="cards-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredContracts.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-card rounded-3xl border border-dashed">
                <p className="text-sm font-bold text-muted-foreground">Aucun contrat correspondant aux critères.</p>
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <ContractMobileCard
                  key={contract.id}
                  contract={contract}
                  onViewDetails={handleViewDetails}
                  onEditContract={handleEditContract}
                  onDeleteContract={handleDeleteContract}
                  onSendForSignature={handleSendForSignature}
                  onDownloadPDF={handleDownloadPDF}
                  signatureLoading={signatureLoading}
                  paymentSummary={getPaymentSummary ? getPaymentSummary(contract.id) : undefined}
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="table-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border border-border/50 shadow-xs rounded-3xl overflow-hidden bg-card">
              <CardContent className="p-0">
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
        )}
      </AnimatePresence>

      {/* Floating Action Center (FAB) for Mobile / Android */}
      <div className="fixed bottom-20 right-5 z-40 lg:hidden">
        <Button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center p-0 hover:scale-105 active:scale-95 transition-transform"
          title="Actions Rapides Flotte"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      {/* Android Operations Bottom Sheet */}
      <ContractsOperationsDrawer
        open={isMobileDrawerOpen}
        onOpenChange={setIsMobileDrawerOpen}
        onNewContract={() => setIsNewContractOpen(true)}
        onFilterChange={(status) => setStatusFilter(status)}
        onQuickSearchFocus={() => {
          const searchInput = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }}
        stats={drawerStats}
      />

      {/* Standard Dialogs */}
      <ContractDetailsDialog
        contract={selectedContract}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        contracts={contracts}
        payments={payments}
      />
      <ContractEditDialog
        contract={selectedContract}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSave={handleSaveContract}
        contracts={contracts}
        payments={payments}
      />
      <NewContractDialog
        onAddContract={handleAddContract}
        open={isNewContractOpen}
        onOpenChange={setIsNewContractOpen}
      />
    </div>
  );
};

export default Contracts;
