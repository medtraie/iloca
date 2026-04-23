
import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface MetricCardProps {
  icon?: ReactNode;
  title: string;
  value: string | number;
  subline?: string;
  sublineClassName?: string;
  iconClassName?: string;
}

const MetricCard = ({
  icon,
  title,
  value,
  subline,
  sublineClassName,
  iconClassName
}: MetricCardProps) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subline && (
            <p className={`text-sm ${sublineClassName}`}>{subline}</p>
          )}
        </div>
        {icon && (
          <span className={iconClassName}>{icon}</span>
        )}
      </div>
    </CardContent>
  </Card>
);

export default MetricCard;
