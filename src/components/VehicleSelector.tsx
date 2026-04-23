
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, Car, CarFront } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVehicles, Vehicle } from "@/hooks/useVehicles";
import VehicleFormDialog from "./VehicleFormDialog";

interface VehicleSelectorProps {
  selectedVehicle: Vehicle | null;
  onVehicleSelect: (vehicle: Vehicle | null) => void;
}

const VehicleSelector = ({ selectedVehicle, onVehicleSelect }: VehicleSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const { vehicles, loading, addVehicle } = useVehicles();

  const handleVehicleCreate = async (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
    const newVehicle = await addVehicle(vehicleData);
    if (newVehicle) {
      onVehicleSelect(newVehicle);
    }
  };

  const getVehicleDisplayName = (vehicle: Vehicle) => {
    const parts = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean);
    return parts.join(' ');
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
              <Car className={cn("h-4 w-4", selectedVehicle ? "text-primary" : "text-muted-foreground")} />
              <span className={cn(selectedVehicle ? "text-foreground" : "text-muted-foreground")}>
                {selectedVehicle 
                  ? getVehicleDisplayName(selectedVehicle)
                  : "Choisir un véhicule..."}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 border-none shadow-2xl rounded-[var(--radius)] overflow-hidden bg-card" align="start">
          <Command className="bg-transparent">
            <div className="p-3 border-b-2 border-muted/30">
              <CommandInput placeholder="Rechercher un véhicule..." className="h-10 border-none focus:ring-0 font-medium" />
            </div>
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="p-4 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">Aucun véhicule trouvé</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setShowVehicleDialog(true);
                    setOpen(false);
                  }}
                  className="m-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-black uppercase tracking-widest text-[10px] cursor-pointer transition-colors flex items-center justify-center h-10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un nouveau véhicule
                </CommandItem>
                <div className="px-2 pb-2 space-y-1">
                  {vehicles.map((vehicle) => {
                    const isAvailable = vehicle.etat_vehicule === 'disponible';
                    const statusText = vehicle.etat_vehicule === 'loue' ? 'loué' : 
                                     vehicle.etat_vehicule === 'maintenance' ? 'maintenance' : 'disponible';
                    
                    return (
                      <CommandItem
                        key={vehicle.id}
                        onSelect={() => {
                          if (!isAvailable) return;
                          onVehicleSelect(vehicle);
                          setOpen(false);
                        }}
                        disabled={!isAvailable}
                        className={cn(
                          "rounded-xl px-3 py-3 transition-all group",
                          !isAvailable ? "opacity-40 grayscale cursor-not-allowed" : "cursor-pointer hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center w-full">
                          <Check
                            className={cn(
                              "mr-3 h-4 w-4 text-primary shrink-0",
                              selectedVehicle?.id === vehicle.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1 overflow-hidden">
                            <span className="font-bold text-sm truncate">{getVehicleDisplayName(vehicle)}</span>
                            <div className="flex items-center gap-2">
                              {vehicle.registration && (
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider opacity-60">{vehicle.registration}</span>
                              )}
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md",
                                isAvailable ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                              )}>
                                {statusText}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <VehicleFormDialog
        open={showVehicleDialog}
        onOpenChange={setShowVehicleDialog}
        onSave={handleVehicleCreate}
      />
    </>
  );
};

export default VehicleSelector;
