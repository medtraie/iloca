
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Vehicle } from "./VehicleGanttChart.types";

interface VehicleGanttChartHeaderProps {
  currentMonth: number;
  currentYear: number;
  monthNames: string[];
  vehicles: Vehicle[];
  selectedVehicle: string;
  setSelectedVehicle: (v: string) => void;
  navigateMonth: (dir: "prev" | "next") => void;
}

const VehicleGanttChartHeader = ({
  currentMonth,
  currentYear,
  monthNames,
  vehicles,
  selectedVehicle,
  setSelectedVehicle,
  navigateMonth,
}: VehicleGanttChartHeaderProps) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <h3 className="text-lg font-semibold text-center sm:text-left">Filtres et Navigation</h3>
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 bg-card px-3 py-1 rounded border text-sm">
          📅 {monthNames[currentMonth]} {currentYear}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="text-sm shrink-0">
          <span className="font-medium">Véhicule:</span>
        </div>
        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tous les véhicules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les véhicules</SelectItem>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.marque} {vehicle.modele}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3 bg-green-500 rounded-sm"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3 bg-red-500 rounded-sm"></div>
          <span>Louée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3 bg-orange-500 rounded-sm"></div>
          <span>Maintenance</span>
        </div>
      </div>
    </div>
  </div>
);

export default VehicleGanttChartHeader;
