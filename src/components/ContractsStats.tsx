
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedStatsCard } from "@/components/AnimatedStatsCard";
import { FileText, Clock, CheckCircle, DollarSign, AlertTriangle, Calendar, CreditCard } from "lucide-react";
import { Contract } from "@/hooks/useContracts";
import { computeContractSummary } from "@/utils/contractMath";

interface ContractsStatsProps {
  contracts: Contract[];
}

const ContractsStats = ({ contracts }: ContractsStatsProps) => {
  const totalContracts = contracts.length;
  
  // Calculs pour le statut général
  const ouvertContracts = contracts.filter(c => 
    c.status === 'ouvert' || c.status === 'draft' || c.status === 'sent' || c.status === 'signed'
  ).length;
  const fermeContracts = contracts.filter(c => 
    c.status === 'ferme' || c.status === 'completed'
  ).length;

  // Calculs pour l'état financier
  const payeContracts = contracts.filter(c => {
    const summary = computeContractSummary(c, { advanceMode: 'field' });
    return summary.statut === 'payé';
  }).length;
  
  const enAttenteContracts = contracts.filter(c => {
    const summary = computeContractSummary(c, { advanceMode: 'field' });
    return summary.statut === 'en attente';
  }).length;
  
  const impayeContracts = contracts.filter(c => {
    const summary = computeContractSummary(c, { advanceMode: 'field' });
    return c.status === 'ouvert' && summary.overdueDays > 0;
  }).length;
  
  const prolongeContracts = contracts.filter(c => {
    const summary = computeContractSummary(c, { advanceMode: 'field' });
    return summary.extensionDays > 0;
  }).length;

  const generalStats = [
    {
      title: "Total des Contrats",
      value: totalContracts,
      total: totalContracts,
      icon: FileText,
      color: "bg-card-blue",
      bgColor: "bg-card-blue-bg",
      textColor: "text-card-blue",
      delay: 0
    },
    {
      title: "Ouvert",
      value: ouvertContracts,
      total: totalContracts,
      icon: Clock,
      color: "bg-card-orange",
      bgColor: "bg-card-orange-bg",
      textColor: "text-card-orange",
      delay: 200
    },
    {
      title: "Fermé",
      value: fermeContracts,
      total: totalContracts,
      icon: CheckCircle,
      color: "bg-card-green",
      bgColor: "bg-card-green-bg",
      textColor: "text-card-green",
      delay: 400
    }
  ];

  const financialStats = [
    {
      title: "Payé",
      value: payeContracts,
      total: totalContracts,
      icon: CreditCard,
      color: "bg-card-green",
      bgColor: "bg-card-green-bg",
      textColor: "text-card-green",
      delay: 0
    },
    {
      title: "En attente",
      value: enAttenteContracts,
      total: totalContracts,
      icon: Calendar,
      color: "bg-card-orange",
      bgColor: "bg-card-orange-bg",
      textColor: "text-card-orange",
      delay: 200
    },
    {
      title: "Impayé",
      value: impayeContracts,
      total: totalContracts,
      icon: AlertTriangle,
      color: "bg-card-red",
      bgColor: "bg-card-red-bg",
      textColor: "text-card-red",
      delay: 400
    },
    {
      title: "Prolongé",
      value: prolongeContracts,
      total: totalContracts,
      icon: DollarSign,
      color: "bg-card-blue",
      bgColor: "bg-card-blue-bg",
      textColor: "text-card-blue",
      delay: 600
    }
  ];

  return (
    <div className="space-y-10 mb-10">
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-5 w-1 bg-accent rounded-full" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Statut des Contrats</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {generalStats.map((stat) => (
            <AnimatedStatsCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              total={stat.total}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
              textColor={stat.textColor}
              delay={stat.delay}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-5 w-1 bg-accent rounded-full" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">État Financier</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {financialStats.map((stat) => (
            <AnimatedStatsCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              total={stat.total}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
              textColor={stat.textColor}
              delay={stat.delay}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContractsStats;
