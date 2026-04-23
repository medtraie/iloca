import { FINANCIAL_STATUS_OPTIONS, FinancialStatus } from "@/utils/contractFinancialStatus";

interface FinancialStatusFilterProps {
  financialStatusFilter: "all" | FinancialStatus;
  setFinancialStatusFilter: (status: "all" | FinancialStatus) => void;
}

const FinancialStatusFilter = ({ 
  financialStatusFilter, 
  setFinancialStatusFilter 
}: FinancialStatusFilterProps) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">État financier</span>
      <div className="flex gap-2 flex-wrap">
        {FINANCIAL_STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors
              ${financialStatusFilter === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
              }
            `}
            onClick={() => setFinancialStatusFilter(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FinancialStatusFilter;