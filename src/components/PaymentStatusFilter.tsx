import { PAYMENT_STATUS_OPTIONS, FinancialStatus } from "@/utils/contractFinancialStatus";

interface PaymentStatusFilterProps {
  financialStatusFilter: "all" | FinancialStatus;
  setFinancialStatusFilter: (status: "all" | FinancialStatus) => void;
}

const PaymentStatusFilter = ({ 
  financialStatusFilter, 
  setFinancialStatusFilter 
}: PaymentStatusFilterProps) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">État financier</span>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
        {PAYMENT_STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`px-4 py-2 rounded-full border text-xs sm:text-sm font-medium transition-colors snap-start shrink-0
              ${financialStatusFilter === opt.value
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-card text-primary border-primary/20 hover:bg-accent"
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

export default PaymentStatusFilter;