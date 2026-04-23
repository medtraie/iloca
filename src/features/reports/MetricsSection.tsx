
import { Calendar, DollarSign, TrendingUp, Car } from "lucide-react";
import MetricCard from "./MetricCard";

interface MetricsSectionProps {
  stats: {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    upcomingContracts: number;
    overdueContracts: number;
    extendedContracts: number;
    paidContracts: number;
    pendingContracts: number;
    totalRevenue: number;
    totalExpenses: number;
    totalDaysRented: number;
    overdueRevenue: number;
    netProfit: number;
  }
}

const MetricsSection = ({ stats }: MetricsSectionProps) => (
  <div className="space-y-8">
    {/* Main Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Contrats ce mois"
        value={stats.totalContracts}
        subline={`${stats.activeContracts} actifs`}
        sublineClassName="text-blue-600"
        icon={<Calendar className="h-8 w-8 text-blue-600" />}
      />
      <MetricCard
        title="Jours loués totaux"
        value={stats.totalDaysRented}
        subline="Ce mois"
        sublineClassName="text-green-600"
        icon={<Car className="h-8 w-8 text-green-600" />}
      />
      <MetricCard
        title="Revenu total"
        value={`${stats.totalRevenue.toLocaleString()} DH`}
        subline={`+${stats.overdueRevenue.toLocaleString()} DH (retards)`}
        sublineClassName="text-red-600"
        icon={<DollarSign className="h-8 w-8 text-green-600" />}
      />
      <MetricCard
        title="Charges mensuelles"
        value={`${stats.totalExpenses.toLocaleString()} DH`}
        subline="Maintenance + Vignettes"
        sublineClassName="text-orange-600"
        icon={<TrendingUp className="h-8 w-8 text-orange-600" />}
      />
    </div>

    {/* Financial Status Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Contrats impayés"
        value={stats.overdueContracts}
        subline="En retard"
        sublineClassName="text-red-600"
        icon={<Calendar className="h-8 w-8 text-red-600" />}
      />
      <MetricCard
        title="Contrats prolongés"
        value={stats.extendedContracts}
        subline="Extensions actives"
        sublineClassName="text-blue-600"
        icon={<Calendar className="h-8 w-8 text-blue-600" />}
      />
      <MetricCard
        title="Contrats payés"
        value={stats.paidContracts}
        subline="À jour"
        sublineClassName="text-green-600"
        icon={<DollarSign className="h-8 w-8 text-green-600" />}
      />
      <MetricCard
        title="En attente"
        value={stats.pendingContracts}
        subline="À traiter"
        sublineClassName="text-orange-600"
        icon={<TrendingUp className="h-8 w-8 text-orange-600" />}
      />
    </div>
  </div>
);

export default MetricsSection;
