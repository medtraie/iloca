
import { ReactNode } from "react";

interface ReportCardTitleProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const ReportCardTitle = ({ children, icon, className }: ReportCardTitleProps) => (
  <div className={`flex items-center gap-2 ${className || ""}`}>
    {icon && <span>{icon}</span>}
    {children}
  </div>
);

export default ReportCardTitle;
