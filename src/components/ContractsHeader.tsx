
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Home, FileText } from "lucide-react";

const ContractsHeader = () => {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-card-blue-bg rounded-lg">
              <FileText className="h-6 w-6 text-card-blue" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Gestion des Contrats</h1>
              <p className="text-muted-foreground">Affichage et gestion de tous les contrats de location et signature numérique</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractsHeader;
