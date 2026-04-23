import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Contract {
  id: string;
  customer_name?: string;
  start_date?: string;
  end_date?: string;
  total_amount?: number;
  status?: string;
}

interface MonthlyRevenueSectionProps {
  contracts: Contract[];
}

const MonthlyRevenueSection = ({ contracts }: MonthlyRevenueSectionProps) => {
  const monthlyData = useMemo(() => {
    // Initialize data for 12 months
    const months = [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
      "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
    ];

    const data = months.map((month, index) => ({
      month,
      revenue: 0,
      monthIndex: index
    }));

    // Calculate revenue per month based on contract start dates
    contracts.forEach(contract => {
      if (contract.start_date && contract.total_amount) {
        try {
          const startDate = new Date(contract.start_date);
          const monthIndex = startDate.getMonth();
          const year = startDate.getFullYear();
          const currentYear = new Date().getFullYear();
          
          // Only include contracts from the current year
          if (year === currentYear) {
            data[monthIndex].revenue += contract.total_amount;
          }
        } catch (error) {
          console.error("Error parsing date:", contract.start_date);
        }
      }
    });

    return data;
  }, [contracts]);

  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
  const formattedMaxRevenue = Math.ceil(maxRevenue / 1000) * 1000; // Round up to nearest 1000

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border">
          <p className="font-medium">{label}</p>
          <p className="text-green-600">
            <span className="font-medium">{payload[0].value.toLocaleString()} MAD</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">
          Revenu Mensuel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                domain={[0, formattedMaxRevenue || 1000]}
                tickFormatter={(value) => `${value} MAD`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#16a34a" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {monthlyData.every(d => d.revenue === 0) && (
          <div className="text-center py-8 text-gray-500">
            Aucune donnée de revenu disponible pour l'année en cours
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyRevenueSection;