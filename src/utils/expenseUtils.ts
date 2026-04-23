
import { useToast } from '@/hooks/use-toast';

export const useExpenseToasts = () => {
  const { toast } = useToast();

  return {
    showError: (message: string) => {
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive"
      });
    },

    showSuccess: (message: string) => {
      toast({
        title: "Succès",
        description: message
      });
    }
  };
};
