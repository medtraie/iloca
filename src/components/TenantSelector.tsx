import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTenants, type Tenant } from "@/hooks/useTenants";
import TenantFormDialog from "@/components/TenantFormDialog";

interface TenantSelectorProps {
  selectedTenant: Tenant | null;
  onTenantSelect: (tenant: Tenant | null) => void;
}

export const TenantSelector = ({ selectedTenant, onTenantSelect }: TenantSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [showTenantDialog, setShowTenantDialog] = useState(false);
  const { tenants } = useTenants();

  const handleTenantCreate = async (tenant: Tenant) => {
    onTenantSelect(tenant);
    setShowTenantDialog(false);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedTenant 
              ? `${selectedTenant.prenom} ${selectedTenant.nom}`
              : "Choisir un locataire..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-background border shadow-lg z-50">
          <Command>
            <CommandInput placeholder="Rechercher un locataire..." />
            <CommandList>
              <CommandEmpty>Aucun locataire trouvé.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setShowTenantDialog(true);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un nouveau locataire
                </CommandItem>
                {tenants.map((tenant) => (
                  <CommandItem
                    key={tenant.id}
                    value={`${tenant.prenom} ${tenant.nom} ${tenant.telephone}`}
                    onSelect={() => {
                      onTenantSelect(selectedTenant?.id === tenant.id ? null : tenant);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedTenant?.id === tenant.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{tenant.prenom} {tenant.nom}</span>
                      {tenant.telephone && (
                        <span className="text-sm text-muted-foreground">{tenant.telephone}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <TenantFormDialog
        isOpen={showTenantDialog}
        onClose={() => setShowTenantDialog(false)}
        onSubmit={(tenantData) => {
          // Convert the form data to a Tenant object with id and timestamps
          const newTenant = {
            ...tenantData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0]
          } as Tenant;
          
          handleTenantCreate(newTenant);
          return true;
        }}
      />
    </>
  );
};