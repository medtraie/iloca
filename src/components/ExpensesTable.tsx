
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, ExternalLink, Calendar, DollarSign, Car, WalletCards, Archive, Copy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Expense } from "@/types/expense";
import { Vehicle } from "@/hooks/useVehicles";
import { EnhancedTable } from "@/components/enhanced/EnhancedTable";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface ExpensesTableProps {
  expenses: Expense[];
  vehicles: Vehicle[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expenseId: string) => void;
  onArchive: (expenseId: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading: boolean;
}

const expenseTypeLabels = {
  'vignette': 'Vignette',
  'assurance': 'Assurance',
  'visite_technique': 'Visite technique',
  'gps': 'GPS',
  'credit': 'Crédit',
  'reparation': 'Réparation'
};

type ExpensesView = "all" | "financial" | "compliance";

const ExpensesTable = ({
  expenses,
  vehicles,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  selectedIds,
  onSelectionChange,
  loading
}: ExpensesTableProps) => {
  const [savedView, setSavedView] = useLocalStorage<ExpensesView>("expenses:table-view", "all");
  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : 'Non défini';
  };

  const getExpenseTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'vignette': 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      'assurance': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      'visite_technique': 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      'gps': 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
      'credit': 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      'reparation': 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
    };
    return colors[type] || 'bg-muted text-muted-foreground border-border/50';
  };

  const allSelected = expenses.length > 0 && selectedIds.length === expenses.length;

  const toggleSelection = (expenseId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...new Set([...selectedIds, expenseId])]);
      return;
    }
    onSelectionChange(selectedIds.filter(id => id !== expenseId));
  };

  const baseColumns = [
    {
      key: 'selection',
      label: '',
      sortable: false,
      render: (expense: Expense) => (
        <Checkbox
          checked={selectedIds.includes(expense.id)}
          onCheckedChange={(checked) => toggleSelection(expense.id, Boolean(checked))}
        />
      ),
      className: "w-[48px]"
    },
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      render: (expense: Expense) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted/50 border border-border/40 shrink-0">
            <Car className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-bold text-xs text-foreground truncate max-w-[200px]" title={getVehicleName(expense.vehicle_id)}>
            {getVehicleName(expense.vehicle_id)}
          </span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type de Charge',
      sortable: true,
      render: (expense: Expense) => (
        <Badge className={`${getExpenseTypeColor(expense.type)} font-bold text-xs px-2.5 py-0.5 rounded-xl border`}>
          {expenseTypeLabels[expense.type as keyof typeof expenseTypeLabels] || expense.type}
        </Badge>
      )
    },
    {
      key: 'total_cost',
      label: 'Coût Total',
      sortable: true,
      render: (expense: Expense) => (
        <div className="flex items-center gap-1.5 font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
          <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>{Number(expense.total_cost || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground font-bold">DH</span></span>
        </div>
      )
    },
    {
      key: 'monthly_cost',
      label: 'Coût Mensuel',
      sortable: true,
      render: (expense: Expense) => (
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
          <WalletCards className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>{Number(expense.monthly_cost || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">DH/m</span></span>
        </div>
      )
    },
    {
      key: 'start_date',
      label: 'Période Validité',
      sortable: true,
      render: (expense: Expense) => (
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground whitespace-nowrap">
            {format(new Date(expense.start_date), 'dd/MM/yyyy', { locale: fr })}
          </span>
          <span className="text-muted-foreground text-[10px]">→</span>
          <span className="font-medium text-foreground whitespace-nowrap">
            {format(new Date(expense.end_date), 'dd/MM/yyyy', { locale: fr })}
          </span>
        </div>
      )
    },
    {
      key: 'period_months',
      label: 'Durée',
      sortable: true,
      render: (expense: Expense) => (
        <span className="font-bold text-xs text-foreground px-2 py-0.5 rounded-md bg-muted/40 border border-border/40">
          {expense.period_months} mois
        </span>
      )
    },
    {
      key: 'document_url',
      label: 'Document',
      sortable: false,
      render: (expense: Expense) => (
        expense.document_url ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(expense.document_url, '_blank')}
            className="h-8 rounded-xl font-bold text-xs border-border/60 hover:bg-primary/10 hover:text-primary transition-colors"
            title="Voir le justificatif"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1 text-primary" />
            Reçu
          </Button>
        ) : (
          <span className="text-muted-foreground text-xs font-medium">—</span>
        )
      )
    }
  ];

  const columns = baseColumns.filter((column) => {
    if (savedView === "all") return true;
    if (savedView === "financial") {
      return ["selection", "vehicle_id", "type", "total_cost", "monthly_cost", "period_months"].includes(String(column.key));
    }
    return ["selection", "vehicle_id", "type", "start_date", "document_url", "period_months"].includes(String(column.key));
  });

  const renderActions = (expense: Expense) => (
    <div className="flex items-center gap-1 opacity-100 md:opacity-80 md:group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDuplicate(expense.id)}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-700"
        title="Dupliquer"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onArchive(expense.id)}
        className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-700"
        title="Archiver"
      >
        <Archive className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(expense)}
        className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-700"
        title="Modifier"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette dépense ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(expense.id)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 px-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onSelectionChange(Boolean(checked) ? expenses.map(e => e.id) : [])}
          />
          <span className="text-xs text-muted-foreground">
            {selectedIds.length} sélectionnée{selectedIds.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Vue</span>
          <Select value={savedView} onValueChange={(value: ExpensesView) => setSavedView(value)}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Complète</SelectItem>
              <SelectItem value="financial">Financière</SelectItem>
              <SelectItem value="compliance">Conformité</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <EnhancedTable
        data={expenses}
        columns={columns}
        title="Liste des dépenses"
        description={`${expenses.length} dépense${expenses.length > 1 ? 's' : ''} enregistrée${expenses.length > 1 ? 's' : ''}`}
        searchPlaceholder="Rechercher par véhicule, type, coût..."
        actions={renderActions}
        loading={loading}
        emptyMessage="Aucune dépense enregistrée. Commencez par ajouter votre première dépense."
        defaultItemsPerPage={25}
        itemsPerPageOptions={[10, 25, 50, 100]}
        tableHeightClass={expenses.length > 300 ? "h-[72vh] md:h-[720px]" : "h-[58vh] md:h-[640px]"}
      />
    </div>
  );
};

export default ExpensesTable;
