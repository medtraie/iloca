
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
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">Filtres et Navigation</h3>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 bg-card px-3 py-1 rounded border">
          📅 {monthNames[currentMonth]} {currentYear}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="font-medium">Véhicule:</span>
        </div>
        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
          <SelectTrigger className="w-48">
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
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-green-500 rounded-sm"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-red-500 rounded-sm"></div>
          <span>Louée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-orange-500 rounded-sm"></div>
          <span>Maintenance</span>
        </div>
      </div>
    </div>
  </div>
);

export default VehicleGanttChartHeader;
