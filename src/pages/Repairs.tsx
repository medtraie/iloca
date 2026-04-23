
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Coins, Wrench, LineChart as LineChartIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import RepairFormDialog from "@/components/RepairFormDialog";
import RepairDetailsDialog from "@/components/RepairDetailsDialog";
import RepairStatsCards from "@/components/RepairStatsCards";
import RepairFilters from "@/components/RepairFilters";
import RepairTable from "@/components/RepairTable";
import { Card, CardContent } from "@/components/ui/card";
import { useRepairFilters } from "@/hooks/useRepairFilters";
import { useRepairStats } from "@/hooks/useRepairStats";
import { Repair, RepairFormData } from "@/types/repair";
import { useVehicles } from "@/hooks/useVehicles";
import { useRepairs } from "@/hooks/useRepairs";
import LoadingSpinner from "@/components/LoadingSpinner";
import { motion } from "framer-motion";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const Repairs = () => {
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
  const monthlyRecoveryRate = useMemo(() => {
    const now = new Date();
    const currentMonthRepairs = repairs.filter((repair) => {
      const d = new Date(repair.dateReparation);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalCost = currentMonthRepairs.reduce((sum, repair) => sum + (repair.cout || 0), 0);
    const totalPaid = currentMonthRepairs.reduce((sum, repair) => sum + (repair.paye || 0), 0);
    return totalCost > 0 ? (totalPaid / totalCost) * 100 : 0;
  }, [repairs]);

  const averageSettlementDays = useMemo(() => {
    const settled = repairs.filter((repair) => (repair.dette || 0) <= 0);
    if (settled.length === 0) return 0;
    const total = settled.reduce((sum, repair) => {
      const closeDate = (repair.payments && repair.payments.length > 0)
        ? new Date(repair.payments[repair.payments.length - 1].date)
        : new Date(repair.updated_at);
      const openDate = new Date(repair.dateReparation);
      const days = Math.max(0, Math.floor((closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);
    return total / settled.length;
  }, [repairs]);

  const topVehiclesInMaintenance = useMemo(() => {
    const countMap = new Map<string, number>();
    repairs.forEach((repair) => {
      const key = `${repair.vehicleInfo.marque} ${repair.vehicleInfo.modele}`;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    });
    const sorted = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 3);
  }, [repairs]);

  const evolutionData = useMemo(() => {
    const monthly = new Map<string, { label: string; cout: number; dette: number }>();
    repairs.forEach((repair) => {
      const date = new Date(repair.dateReparation);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      const current = monthly.get(key) || { label, cout: 0, dette: 0 };
      current.cout += repair.cout || 0;
      current.dette += repair.dette || 0;
      monthly.set(key, current);
    });
    return Array.from(monthly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value);
  }, [repairs]);

  const smartAlerts = useMemo(() => {
    const debtAlerts = repairs.filter((repair) => {
      if ((repair.dette || 0) <= 0) return false;
      const baseDate = new Date(repair.dueDate || repair.dateReparation);
      const diffDays = Math.floor((Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 30;
    });
    const highCostAlerts = repairs.filter((repair) => (repair.cout || 0) >= 10000);
    const slaAlerts = repairs.filter((repair) => {
      const target = repair.slaTargetDays || 0;
      if (target <= 0) return false;
      const diffDays = Math.floor((Date.now() - new Date(repair.dateReparation).getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > target && (repair.dette || 0) > 0;
    });
    return { debtAlerts, highCostAlerts, slaAlerts };
  }, [repairs]);

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
  const visibleDebt = displayedRepairs.reduce((sum, repair) => sum + (repair.dette || 0), 0);
  const visiblePaid = displayedRepairs.reduce((sum, repair) => sum + (repair.paye || 0), 0);
  const visibleCoverage = visiblePaid + visibleDebt > 0 ? (visiblePaid / (visiblePaid + visibleDebt)) * 100 : 0;
  const openDebtCases = displayedRepairs.filter((repair) => (repair.dette || 0) > 0).length;

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
  }

  const handleEditRepair = (repair: Repair) => {
    setEditingRepair(repair);
    setIsFormOpen(true);
  };

  const handleDeleteRepair = (repair: Repair) => {
    const paymentCount = repair.payments?.length || 0;
    const hasAttachment = !!repair.pieceJointe;
    if (paymentCount > 0 || hasAttachment) {
      const message = `Ce dossier contient ${paymentCount} paiement(s)${hasAttachment ? " et une pièce jointe" : ""}. Confirmez la suppression définitive.`;
      if (!window.confirm(message)) return;
    }
    deleteRepair(repair.id);
  };

  const handleViewDetails = (repair: Repair) => {
    setSelectedRepair(repair);
    setIsDetailsOpen(true);
  };

  const handleReactivateVehicle = (repair: Repair) => {
    if (window.confirm(`Êtes-vous sûr de vouloir réactiver le véhicule ${repair.vehicleInfo.marque} ${repair.vehicleInfo.modele} ? Il sera marqué comme disponible mais tous les enregistrements de maintenance seront conservés.`)) {
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
    return <LoadingSpinner message="Chargement des données..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Atelier & Réparations
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-1">
              Gestion des <span className="text-primary">Réparations</span>
            </h1>
            <p className="text-muted-foreground font-medium">
              Enregistrement et suivi précis de toutes les opérations de maintenance et réparation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" className="rounded-[var(--radius)]">
                Retour à l'accueil
              </Button>
            </Link>
            <Button
              onClick={handleAddClick}
              className="rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              + Nouvelle réparation
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="grid gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <RepairStatsCards {...stats} />
        </motion.div>

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

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.07 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Vue active</p>
                  <p className="text-2xl font-black text-foreground mt-1">{displayedRepairs.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">intervention{displayedRepairs.length > 1 ? "s" : ""} affichée{displayedRepairs.length > 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
                  <Wrench className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Dette visible</p>
                  <p className="text-2xl font-black text-amber-700 mt-1">{Math.round(visibleDebt).toLocaleString()} DH</p>
                  <p className="text-sm text-muted-foreground mt-1">{openDebtCases} dossier{openDebtCases > 1 ? "s" : ""} à traiter</p>
                </div>
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Couverture paiement</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{visibleCoverage.toFixed(0)}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Encaissements visibles {Math.round(visiblePaid).toLocaleString()} DH</p>
                </div>
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                  {visibleCoverage >= 80 ? <CheckCircle2 className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.09 }}
        >
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Taux de recouvrement mensuel</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{monthlyRecoveryRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Temps moyen de règlement</p>
              <p className="text-2xl font-black text-purple-700 mt-1">{averageSettlementDays.toFixed(1)} jours</p>
            </CardContent>
          </Card>
          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Top véhicules en maintenance</p>
              <div className="mt-2 space-y-1 text-sm">
                {topVehiclesInMaintenance.length === 0 && <p className="text-muted-foreground">Aucune donnée</p>}
                {topVehiclesInMaintenance.map(([name, count]) => (
                  <p key={name} className="font-medium text-indigo-700">{name} · {count}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Card className="border border-border/40">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-primary" />
              Évolution coût / dette mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cout" stroke="#2563eb" name="Coût" strokeWidth={2} />
                  <Line type="monotone" dataKey="dette" stroke="#dc2626" name="Dette" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest">Alertes dette &gt; 30 jours</p>
              <p className="mt-1 text-2xl font-black text-red-700">{smartAlerts.debtAlerts.length}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/40">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest">Alertes coût élevé</p>
              <p className="mt-1 text-2xl font-black text-orange-700">{smartAlerts.highCostAlerts.length}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest">Alertes SLA dépassé</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{smartAlerts.slaAlerts.length}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <RepairTable
            filteredRepairs={displayedRepairs}
            onViewDetails={handleViewDetails}
            onEditRepair={handleEditRepair}
            onDeleteRepair={handleDeleteRepair}
            onReactivateVehicle={handleReactivateVehicle}
            onAddPayment={handleQuickPayment}
            onMarkAsSettled={handleQuickSettle}
          />
        </motion.div>

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
      </div>
    </div>
  );
};

export default Repairs;
