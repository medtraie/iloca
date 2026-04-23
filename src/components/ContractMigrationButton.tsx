import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { migrateAllContracts } from '@/utils/contractMath';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ContractMigrationButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Début de la migration des contrats...");
      const migratedContracts = migrateAllContracts();
      
      console.log(`✅ Migration terminée : ${migratedContracts.length} contrats recalculés`);
      
      toast({
        title: "✅ Migration réussie",
        description: `${migratedContracts.length} contrats ont été recalculés et corrigés. Les calculs sont maintenant unifiés.`,
        variant: "default"
      });
      
      setMigrated(true);
      
      // Recharger la page pour voir les changements
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      toast({
        title: "❌ Erreur de migration",
        description: "Une erreur est survenue lors de la migration des contrats. Consultez la console pour plus de détails.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (migrated) {
    return (
      <Button disabled className="gap-2 bg-green-600 text-white">
        <CheckCircle className="h-4 w-4" />
        Migration terminée - Rechargement...
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline"
          className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          <RefreshCw className="h-4 w-4" />
          Corriger les calculs incohérents
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Correction des calculs de contrats
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Cette opération va <strong>recalculer et corriger</strong> tous les contrats existants pour éliminer les incohérences entre :
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Les durées affichées (problème inclusif/exclusif)</li>
              <li>Les totaux et montants restants</li>
              <li>Les calculs d'avance et de paiements</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              ⚠️ <strong>Sauvegarde automatique :</strong> Les données actuelles seront sauvegardées avant modification.
            </p>
            <p className="text-sm font-medium text-orange-700">
              La page se rechargera automatiquement après la correction.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleMigration}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Correction en cours...
              </>
            ) : (
              'Corriger maintenant'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};