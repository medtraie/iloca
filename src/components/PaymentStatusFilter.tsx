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
      <span className="text-sm font-medium text-gray-700">État financier</span>
      <div className="flex gap-2 flex-wrap">
        {PAYMENT_STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors
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