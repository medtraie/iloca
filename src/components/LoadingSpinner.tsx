
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

const LoadingSpinner = ({ message = "Chargement en cours...", className = "h-64" }: LoadingSpinnerProps) => {
  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadingSpinner;
