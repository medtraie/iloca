
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface ReportCardProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

const ReportCard = ({ header, children, className }: ReportCardProps) => (
  <Card className={className}>
    {header}
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

export default ReportCard;
