import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, Coins, Wrench, Sparkles, Plus, RefreshCcw, BarChart3, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RepairFormDialog from "@/components/RepairFormDialog";
import RepairDetailsDialog from "@/components/RepairDetailsDialog";
import RepairStatsCards from "@/components/RepairStatsCards";
import RepairFilters from "@/components/RepairFilters";
import RepairTable from "@/components/RepairTable";
import RepairAnalytics from "@/components/repairs/RepairAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { useRepairFilters } from "@/hooks/useRepairFilters";
import { useRepairStats } from "@/hooks/useRepairStats";
import { Repair, RepairFormData } from "@/types/repair";
import { useVehicles } from "@/hooks/useVehicles";
import { useRepairs } from "@/hooks/useRepairs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion } from "framer-motion";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const Repairs = () => {
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [filterFinancialStatus, setFilterFinancialStatus] = useState("all");
  const [filterOperationalStatus, setFilterOperationalStatus] = useState("all");
  const [filterDelayBucket, setFilterDelayBucket] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [activeSavedView, setActiveSavedView] = useLocalStorage<string>("repairs:saved-view", "custom");
  
  const { toast } = useToast();
  
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { repairs, loading: repairsLoading, addRepair, updateRepair, deleteRepair, reactivateVehicle, addRepairPayment, markRepairAsSettled } = useRepairs();
  const filteredRepairs = useRepairFilters(
    repairs,
    searchTerm,
    filterType,
    filterDateRange,
    filterFinancialStatus,
    filterOperationalStatus,
    filterDelayBucket
  );
  const stats = useRepairStats(repairs);

  const displayedRepairs = useMemo(() => {
    if (activeSavedView === "retard30") {
      return filteredRepairs.filter((repair) => {
        if ((repair.dette || 0) <= 0) return false;
        const baseDate = new Date(repair.dueDate || repair.dateReparation);
        const diffDays = Math.floor((Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 30;
      });
    }
    if (activeSavedView === "detteHaute") {
      return filteredRepairs.filter((repair) => (repair.dette || 0) >= 5000);
    }
    return filteredRepairs;
  }, [activeSavedView, filteredRepairs]);

  const applySavedView = (viewId: string) => {
    setActiveSavedView(viewId);
    if (viewId === "custom") {
      return;
    }
    if (viewId === "retard30") {
      setSearchTerm("");
      setFilterType("all");
      setFilterDateRange("all");
      setFilterFinancialStatus("all");
      setFilterOperationalStatus("all");
      setFilterDelayBucket("all");
      return;
    }
    if (viewId === "detteHaute") {
      setSearchTerm("");
      setFilterType("all");
      setFilterDateRange("all");
      setFilterFinancialStatus("partial");
      setFilterOperationalStatus("all");
      setFilterDelayBucket("all");
      return;
    }
    if (viewId === "ceMois") {
      setSearchTerm("");
      setFilterType("all");
      setFilterDateRange("thisMonth");
      setFilterFinancialStatus("all");
      setFilterOperationalStatus("all");
      setFilterDelayBucket("all");
      return;
    }
  };

  const handleSaveRepair = (formData: RepairFormData, file: File | null) => {
    if (editingRepair) {
      updateRepair(editingRepair.id, formData, file).then(() => {
        toast({
          title: "Mis à jour",
          description: "La réparation a été mise à jour avec succès"
        });
      });
    } else {
      addRepair(formData, file);
    }
    setIsFormOpen(false);
    setEditingRepair(null);
  };
  
  const handleAddClick = () => {
    setEditingRepair(null);
    setIsFormOpen(true);
  };

  const handleEditRepair = (repair: Repair) => {
    setEditingRepair(repair);
    setIsFormOpen(true);
  };

  const handleDeleteRepair = (repair: Repair) => {
    const paymentCount = repair.payments?.length || 0;
    const hasAttachment = !!repair.pieceJointe;
    if (paymentCount > 0 || hasAttachment) {
      const message = `Ce dossier contient ${paymentCount} paiement(s)${hasAttachment ? " et une pièce jointe" : ""}. Confirmez la suppression definitiva.`;
      if (!window.confirm(message)) return;
    }
    deleteRepair(repair.id);
  };

  const handleViewDetails = (repair: Repair) => {
    setSelectedRepair(repair);
    setIsDetailsOpen(true);
  };

  const handleReactivateVehicle = (repair: Repair) => {
    if (window.confirm(`Êtes-vous sûr de vouloir réactiver le véhicule ${repair.vehicleInfo.marque} ${repair.vehicleInfo.modele} ? Il sera marqué comme disponible.`)) {
      reactivateVehicle(repair.vehicleId);
    }
  };

  const handleQuickPayment = async (repair: Repair) => {
    const defaultAmount = Math.max(0, repair.dette || 0);
    const amountInput = window.prompt("Montant du paiement (DH)", defaultAmount.toString());
    if (!amountInput) return;
    const amount = parseFloat(amountInput);
    if (Number.isNaN(amount) || amount <= 0) {
      toast({ title: "Valeur invalide", description: "Montant non valide.", variant: "destructive" });
      return;
    }
    await addRepairPayment(repair.id, {
      amount,
      date: new Date().toISOString().split("T")[0],
      method: repair.paymentMethod,
      note: "Paiement rapide"
    });
  };

  const handleQuickSettle = async (repair: Repair) => {
    await markRepairAsSettled(repair.id);
  };

  if (vehiclesLoading || repairsLoading) {
    return <LoadingSpinner message="Chargement des données d'atelier..." />;
  }

  return (
    <div className="w-full p-2 sm:p-4 lg:p-6 space-y-6 transition-all min-h-screen pb-24">
      {/* 2026 Enterprise Cockpit Header */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-card via-card/90 to-background border border-border/60 shadow-xs relative overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
              Atelier Flotte & Maintenance Aéro-Grade 2026
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
            Gestion de l'<span className="text-primary">Atelier & Réparations</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-1">
            Supervision technique, gestion des pannes, réactivation immédiate et suivi des coûts garages.
          </p>
        </div>
        <div className="flex items-center gap-3 z-10">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-2xl h-11 px-4 font-bold border-border/60 hover:bg-muted hidden sm:flex"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button
            onClick={handleAddClick}
            className="rounded-2xl h-11 px-5 font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouvelle réparation
          </Button>
        </div>
      </motion.div>

      {/* 2026 Ambient Telemetry Cards */}
      <RepairStatsCards {...stats} />

      {/* Main Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/50">
            <TabsTrigger
              value="list"
              className="rounded-xl font-bold text-xs px-4 py-2 flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <List className="h-4 w-4" />
              Registre des Réparations
            </TabsTrigger>

            <TabsTrigger
              value="analytics"
              className="rounded-xl font-bold text-xs px-4 py-2 flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <BarChart3 className="h-4 w-4" />
              Analyses & Graphiques Flotte
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0 space-y-6 focus-visible:ring-0">
          <RepairFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            filterDateRange={filterDateRange}
            setFilterDateRange={setFilterDateRange}
            filterFinancialStatus={filterFinancialStatus}
            setFilterFinancialStatus={setFilterFinancialStatus}
            filterOperationalStatus={filterOperationalStatus}
            setFilterOperationalStatus={setFilterOperationalStatus}
            filterDelayBucket={filterDelayBucket}
            setFilterDelayBucket={setFilterDelayBucket}
            activeSavedView={activeSavedView}
            onApplySavedView={applySavedView}
            onAddRepair={handleAddClick}
          />

          <RepairTable
            filteredRepairs={displayedRepairs}
            onViewDetails={handleViewDetails}
            onEditRepair={handleEditRepair}
            onDeleteRepair={handleDeleteRepair}
            onReactivateVehicle={handleReactivateVehicle}
            onAddPayment={handleQuickPayment}
            onMarkAsSettled={handleQuickSettle}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 focus-visible:ring-0">
          <RepairAnalytics repairs={repairs} />
        </TabsContent>
      </Tabs>

      <RepairFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveRepair}
        repair={editingRepair}
        vehicles={vehicles}
      />

      <RepairDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        repair={selectedRepair}
        onEdit={handleEditRepair}
      />

      {/* Floating Action Button (FAB) for Mobile / Android */}
      <div className="fixed bottom-20 right-5 z-40 lg:hidden">
        <Button
          onClick={handleAddClick}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center p-0 hover:scale-105 active:scale-95 transition-transform"
          title="Nouvelle réparation"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
};

export default Repairs;
