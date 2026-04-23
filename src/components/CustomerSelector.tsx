
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, UserPlus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import CustomerFormDialog from "./CustomerFormDialog";

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
}

const CustomerSelector = ({ selectedCustomer, onCustomerSelect }: CustomerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const { customers, loading, addCustomer } = useCustomers();

  const handleCustomerCreate = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    const newCustomer = await addCustomer(customerData);
    if (newCustomer) {
      onCustomerSelect(newCustomer);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 px-4 rounded-xl border-2 hover:border-primary/50 transition-all font-medium bg-background/50"
          >
            <div className="flex items-center gap-2">
              <User className={cn("h-4 w-4", selectedCustomer ? "text-primary" : "text-muted-foreground")} />
              <span className={cn(selectedCustomer ? "text-foreground" : "text-muted-foreground")}>
                {selectedCustomer 
                  ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name}`.trim()
                  : "Choisir un client..."}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 border-none shadow-2xl rounded-[var(--radius)] overflow-hidden bg-card" align="start">
          <Command className="bg-transparent">
            <div className="p-3 border-b-2 border-muted/30">
              <CommandInput placeholder="Rechercher un client..." className="h-10 border-none focus:ring-0 font-medium" />
            </div>
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="p-4 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">Aucun client trouvé</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setShowCustomerDialog(true);
                    setOpen(false);
                  }}
                  className="m-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-black uppercase tracking-widest text-[10px] cursor-pointer transition-colors flex items-center justify-center h-10"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter un nouveau client
                </CommandItem>
                <div className="px-2 pb-2 space-y-1">
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => {
                        onCustomerSelect(customer);
                        setOpen(false);
                      }}
                      className="rounded-xl px-3 py-3 cursor-pointer transition-all hover:bg-muted group"
                    >
                      <div className="flex items-center w-full">
                        <Check
                          className={cn(
                            "mr-3 h-4 w-4 text-primary shrink-0",
                            selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="font-bold text-sm truncate">{`${customer.first_name || ''} ${customer.last_name}`.trim()}</span>
                          {customer.phone && (
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider opacity-60">{customer.phone}</span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CustomerFormDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        onSave={handleCustomerCreate}
      />
    </>
  );
};

export default CustomerSelector;
