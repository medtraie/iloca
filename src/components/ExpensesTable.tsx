
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
    const colors = {
      'vignette': 'bg-blue-100 text-blue-800 border-blue-200',
      'assurance': 'bg-green-100 text-green-800 border-green-200',
      'visite_technique': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'gps': 'bg-purple-100 text-purple-800 border-purple-200',
      'credit': 'bg-red-100 text-red-800 border-red-200',
      'reparation': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
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
          <Car className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{getVehicleName(expense.vehicle_id)}</span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type de Charge',
      sortable: true,
      render: (expense: Expense) => (
        <Badge className={`${getExpenseTypeColor(expense.type)} font-medium`}>
          {expenseTypeLabels[expense.type as keyof typeof expenseTypeLabels]}
        </Badge>
      )
    },
    {
      key: 'total_cost',
      label: 'Coût Total',
      sortable: true,
      render: (expense: Expense) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-semibold text-green-700">
            {expense.total_cost.toLocaleString()} DH
          </span>
        </div>
      )
    },
    {
      key: 'monthly_cost',
      label: 'Coût Mensuel',
      sortable: true,
      render: (expense: Expense) => (
        <div className="flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-blue-700">
            {expense.monthly_cost.toLocaleString()} DH
          </span>
        </div>
      )
    },
    {
      key: 'start_date',
      label: 'Période',
      sortable: true,
      render: (expense: Expense) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">
            <div className="text-foreground">
              {format(new Date(expense.start_date), 'dd/MM/yyyy', { locale: fr })}
            </div>
            <div className="text-muted-foreground">à</div>
            <div className="text-foreground">
              {format(new Date(expense.end_date), 'dd/MM/yyyy', { locale: fr })}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'period_months',
      label: 'Durée',
      sortable: true,
      render: (expense: Expense) => (
        <span className="text-foreground">{expense.period_months} mois</span>
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
            className="h-8 hover:bg-blue-50 hover:text-blue-700"
            title="Voir le document"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">Aucun</span>
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
