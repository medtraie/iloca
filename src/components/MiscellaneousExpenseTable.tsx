import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Search, Trash2, Edit } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMiscellaneousExpenses, MiscellaneousExpense } from "@/hooks/useMiscellaneousExpenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MiscellaneousExpensePDFExport from "@/components/MiscellaneousExpensePDFExport";

interface MiscellaneousExpenseTableProps {
  expenses: MiscellaneousExpense[];
}

const MiscellaneousExpenseTable = ({ expenses }: MiscellaneousExpenseTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const { deleteExpense } = useMiscellaneousExpenses();

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Espèces': return 'bg-green-100 text-green-800';
      case 'Virement': return 'bg-blue-100 text-blue-800';
      case 'Chèque': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filterExpensesByDate = (expenses: MiscellaneousExpense[]) => {
    if (dateFilter === "all") return expenses;
    
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (dateFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case "custom":
        if (!customDateRange?.from) return expenses;
        startDate = customDateRange.from;
        endDate = customDateRange.to || customDateRange.from;
        break;
      default:
        return expenses;
    }

    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.expense_date);
      return isWithinInterval(expenseDate, { start: startDate, end: endDate });
    });
  };

  const filteredExpenses = filterExpensesByDate(expenses).filter(expense => {
    const searchLower = searchTerm.toLowerCase();
    const expenseType = expense.custom_expense_type || expense.expense_type;
    return (
      expenseType.toLowerCase().includes(searchLower) ||
      expense.notes?.toLowerCase().includes(searchLower) ||
      expense.payment_method.toLowerCase().includes(searchLower)
    );
  });

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) {
      await deleteExpense(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Dépenses Diverses</span>
            <Badge variant="outline" className="text-lg px-3 py-1">
              Total: {totalAmount.toLocaleString()} MAD
            </Badge>
          </div>
          <MiscellaneousExpensePDFExport expenses={expenses} />
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par type, note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
              <SelectItem value="custom">Période personnalisée</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      `${format(customDateRange.from, "dd/MM/yy")} - ${format(customDateRange.to, "dd/MM/yy")}`
                    ) : (
                      format(customDateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    "Choisir une période"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={(range) => {
                    setCustomDateRange(range);
                    if (range?.from && range?.to) {
                      setShowDatePicker(false);
                    }
                  }}
                  numberOfMonths={2}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucune dépense diverse trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {format(parseISO(expense.expense_date), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {expense.custom_expense_type || expense.expense_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-red-600">
                          -{expense.amount.toLocaleString()} MAD
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentMethodColor(expense.payment_method)}>
                          {expense.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-gray-600 truncate">
                          {expense.notes || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MiscellaneousExpenseTable;