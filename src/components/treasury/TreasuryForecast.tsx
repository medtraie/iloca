import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, FileText, Calendar } from "lucide-react";
import type { Payment } from "@/types/payment";
import type { MiscellaneousExpense } from "@/hooks/useMiscellaneousExpenses";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import { computeContractSummary } from "@/utils/contractMath";
import type { Contract } from "@/services/localStorageService";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { isPendingStatus } from "@/utils/chequeUtils";

interface TreasuryForecastProps {
  payments: Payment[];
  miscExpenses: MiscellaneousExpense[];
  contracts: any[];
}

interface ForecastThresholds {
  urgentCheckDays: number;
  highDebtAmount: number;
  urgentExpenseDays: number;
}

export const TreasuryForecast = ({ payments, miscExpenses, contracts }: TreasuryForecastProps) => {
  const [thresholds, setThresholds] = useLocalStorage<ForecastThresholds>("treasury:forecast-thresholds", {
    urgentCheckDays: 3,
    highDebtAmount: 10000,
    urgentExpenseDays: 7
  });
  const [isEditingThresholds, setIsEditingThresholds] = useState(false);
  const [draftThresholds, setDraftThresholds] = useState<ForecastThresholds>(thresholds);

  const checksToDeposit = useMemo(() => {
    return payments
      .filter(p => p.paymentMethod === 'Chèque' && isPendingStatus(p.checkDepositStatus) && p.checkDepositDate)
      .map(p => ({
        id: p.id,
        reference: p.checkReference || 'N/A',
        date: p.checkDepositDate!,
        amount: p.amount,
        customerName: p.customerName,
        daysUntil: differenceInDays(new Date(p.checkDepositDate!), new Date())
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [payments]);

  const unpaidContracts = useMemo(() => {
    return contracts
      .map(contract => {
        const summary = computeContractSummary(contract as Contract, { advanceMode: 'field' });
        return {
          id: contract.id,
          contractNumber: contract.contract_number,
          customerName: contract.customer_name,
          totalAmount: summary.total,
          remainingAmount: summary.reste,
          status: summary.statut
        };
      })
      .filter(c => c.remainingAmount > 0)
      .sort((a, b) => b.remainingAmount - a.remainingAmount);
  }, [contracts]);

  const upcomingExpenses = useMemo(() => {
    const fixedExpenseTypes = ['Salaire', 'Loyer', 'CNSS', 'Électricité'];
    
    return miscExpenses
      .filter(exp => fixedExpenseTypes.includes(exp.expense_type))
      .map(exp => ({
        id: exp.id,
        type: exp.expense_type,
        amount: exp.amount,
        date: exp.expense_date,
        daysUntil: differenceInDays(new Date(exp.expense_date), new Date())
      }))
      .filter(exp => exp.daysUntil >= -30) // Last 30 days and future
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [miscExpenses]);

  const forecastSummary = useMemo(() => {
    const urgentChecks = checksToDeposit.filter((check) => check.daysUntil <= thresholds.urgentCheckDays).length;
    const overdueChecks = checksToDeposit.filter((check) => check.daysUntil < 0).length;
    const highDebtContracts = unpaidContracts.filter((contract) => contract.remainingAmount >= thresholds.highDebtAmount).length;
    const urgentExpenses = upcomingExpenses.filter((expense) => expense.daysUntil <= thresholds.urgentExpenseDays).length;
    return {
      urgentChecks,
      overdueChecks,
      highDebtContracts,
      urgentExpenses
    };
  }, [checksToDeposit, unpaidContracts, upcomingExpenses, thresholds]);

  const applyThresholds = () => {
    const normalized: ForecastThresholds = {
      urgentCheckDays: Math.max(1, Number(draftThresholds.urgentCheckDays) || 3),
      highDebtAmount: Math.max(1000, Number(draftThresholds.highDebtAmount) || 10000),
      urgentExpenseDays: Math.max(1, Number(draftThresholds.urgentExpenseDays) || 7)
    };
    setThresholds(normalized);
    setDraftThresholds(normalized);
    setIsEditingThresholds(false);
  };

  const resetThresholds = () => {
    const defaults: ForecastThresholds = {
      urgentCheckDays: 3,
      highDebtAmount: 10000,
      urgentExpenseDays: 7
    };
    setThresholds(defaults);
    setDraftThresholds(defaults);
    setIsEditingThresholds(false);
  };

  const getCheckStatusColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'bg-red-100 text-red-800 border-red-200';
    if (daysUntil === 0) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (daysUntil <= thresholds.urgentCheckDays) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getCheckStatusText = (daysUntil: number) => {
    if (daysUntil < 0) return '🔴 En retard';
    if (daysUntil === 0) return '🟠 Aujourd\'hui';
    if (daysUntil <= thresholds.urgentCheckDays) return '🟡 Proche';
    return '🟢 À venir';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Forecast Thresholds</p>
            <p className="text-xs text-muted-foreground">
              Checks ≤ {thresholds.urgentCheckDays} days, Debt ≥ {thresholds.highDebtAmount.toLocaleString()} DH, Charges ≤ {thresholds.urgentExpenseDays} days
            </p>
          </div>
          <Button
            variant={isEditingThresholds ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setDraftThresholds(thresholds);
              setIsEditingThresholds((prev) => !prev);
            }}
          >
            {isEditingThresholds ? "Close" : "Edit thresholds"}
          </Button>
        </div>
        {isEditingThresholds && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Urgent check days</p>
              <Input
                type="number"
                min={1}
                value={draftThresholds.urgentCheckDays}
                onChange={(event) => setDraftThresholds((prev) => ({ ...prev, urgentCheckDays: Number(event.target.value) }))}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">High debt amount</p>
              <Input
                type="number"
                min={1000}
                step={500}
                value={draftThresholds.highDebtAmount}
                onChange={(event) => setDraftThresholds((prev) => ({ ...prev, highDebtAmount: Number(event.target.value) }))}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Urgent charge days</p>
              <Input
                type="number"
                min={1}
                value={draftThresholds.urgentExpenseDays}
                onChange={(event) => setDraftThresholds((prev) => ({ ...prev, urgentExpenseDays: Number(event.target.value) }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button className="w-full" size="sm" onClick={applyThresholds}>Apply</Button>
              <Button className="w-full" size="sm" variant="outline" onClick={resetThresholds}>Reset</Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`rounded-lg border p-3 ${forecastSummary.overdueChecks > 0 ? "bg-red-50" : "bg-card"}`}>
          <p className="text-xs text-muted-foreground">Chèques en retard</p>
          <p className={`text-lg font-semibold ${forecastSummary.overdueChecks > 0 ? "text-red-700" : "text-foreground"}`}>
            {forecastSummary.overdueChecks}
          </p>
        </div>
        <div className={`rounded-lg border p-3 ${forecastSummary.urgentChecks > 0 ? "bg-amber-50" : "bg-card"}`}>
          <p className="text-xs text-muted-foreground">Chèques urgents (≤{thresholds.urgentCheckDays}j)</p>
          <p className={`text-lg font-semibold ${forecastSummary.urgentChecks > 0 ? "text-amber-700" : "text-foreground"}`}>
            {forecastSummary.urgentChecks}
          </p>
        </div>
        <div className={`rounded-lg border p-3 ${forecastSummary.highDebtContracts > 0 ? "bg-orange-50" : "bg-card"}`}>
          <p className="text-xs text-muted-foreground">Clients à dette élevée</p>
          <p className={`text-lg font-semibold ${forecastSummary.highDebtContracts > 0 ? "text-orange-700" : "text-foreground"}`}>
            {forecastSummary.highDebtContracts}
          </p>
        </div>
        <div className={`rounded-lg border p-3 ${forecastSummary.urgentExpenses > 0 ? "bg-blue-50" : "bg-card"}`}>
          <p className="text-xs text-muted-foreground">Charges proches (≤{thresholds.urgentExpenseDays}j)</p>
          <p className={`text-lg font-semibold ${forecastSummary.urgentExpenses > 0 ? "text-blue-700" : "text-foreground"}`}>
            {forecastSummary.urgentExpenses}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="border bg-card/95 shadow-sm transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-purple-600" />
            Chèques à Encaisser
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checksToDeposit.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun chèque à encaisser
            </p>
          ) : (
            <div className="space-y-3">
              {checksToDeposit.slice(0, 5).map((check) => (
                <div key={check.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{check.reference}</p>
                      <p className="text-xs text-muted-foreground">{check.customerName}</p>
                    </div>
                    <Badge className={getCheckStatusColor(check.daysUntil)} variant="outline">
                      {getCheckStatusText(check.daysUntil)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {format(new Date(check.date), 'dd/MM/yyyy')}
                    </span>
                    <span className="font-semibold text-purple-600">
                      {check.amount.toLocaleString()} DH
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border bg-card/95 shadow-sm transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Factures Clients Impayées
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidContracts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune facture impayée
            </p>
          ) : (
            <div className="space-y-3">
              {unpaidContracts.slice(0, 5).map((contract) => (
                <div key={contract.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{contract.contractNumber}</p>
                      <p className="text-xs text-muted-foreground">{contract.customerName}</p>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      {contract.status === 'en attente' ? '⚠️ En attente' : '📉 Partiel'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total: {contract.totalAmount.toLocaleString()} DH
                    </span>
                    <span className="font-semibold text-orange-600">
                      Reste: {contract.remainingAmount.toLocaleString()} DH
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border bg-card/95 shadow-sm transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
            Charges Fixes à Venir
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune charge fixe prévue
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingExpenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{expense.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(expense.date), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      expense.daysUntil < 0 
                        ? 'bg-red-100 text-red-800' 
                        : expense.daysUntil <= thresholds.urgentExpenseDays 
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                    }>
                      {expense.daysUntil < 0 
                        ? `${Math.abs(expense.daysUntil)}j passé` 
                        : expense.daysUntil === 0 
                          ? 'Aujourd\'hui'
                          : `Dans ${expense.daysUntil}j`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="font-semibold text-red-600">
                      {expense.amount.toLocaleString()} DH
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
