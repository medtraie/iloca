
import { useState } from "react";
import ReportCard from "./ReportCard";
import ReportCardTitle from "./ReportCardTitle";
import RevenueChart from "@/components/RevenueChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Contract as RevenueChartContract } from "@/components/RevenueChart";
import type { Vehicle, FilterState } from "@/pages/Reports";

interface RevenueSectionProps {
  vehicles: Vehicle[];
  contracts: RevenueChartContract[];
  filters: FilterState;
}

const calendarIcon = (
  <svg className="inline-block h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const RevenueSection = ({ vehicles, contracts, filters }: RevenueSectionProps) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");

  // Create modified filters based on the selected vehicle
  const modifiedFilters = {
    ...filters,
    vehicleId: selectedVehicleId
  };

  return (
    <ReportCard
      header={
        <div className="p-6 pb-0">
          <ReportCardTitle icon={calendarIcon}>
            Revenus par Véhicule
          </ReportCardTitle>
          
          {/* Vehicle Filter */}
          <div className="mt-4 space-y-2">
            <Label className="text-sm font-medium">Véhicule:</Label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les véhicules</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.marque} {vehicle.modele} ({vehicle.immatriculation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      <RevenueChart 
        vehicles={vehicles}
        contracts={contracts}
        filters={modifiedFilters}
      />
    </ReportCard>
  );
};

export default RevenueSection;
