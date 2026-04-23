import { getContractColor, generateContractTooltip, getContractGradientStyle } from "./VehicleGanttChart.utils";
import { Contract, Vehicle } from "./VehicleGanttChart.types";

interface Block {
  key: string;
  from: number;
  length: number;
  contract?: Contract;
  type: "rent" | "free";
  segmentType?: 'main' | 'extension' | 'overdue'; // Nouveau pour distinguer les types de segments
  unmatchedVehicle?: boolean; // ← new for debug!
}

interface VehicleGanttChartRowProps {
  vehicle: Vehicle;
  blockSchedule: Block[];
  daysInMonth: number;
  days: { day: number; dayName: string }[];
}

const VehicleGanttChartRow = ({
  vehicle,
  blockSchedule,
  daysInMonth,
  days,
}: VehicleGanttChartRowProps) => (
  <div className="grid grid-cols-[200px_1fr] gap-0 border-b hover:bg-gray-50">
    <div className="p-3 border-r bg-card">
      <div className="text-sm font-medium">
        {vehicle.marque || ''} {vehicle.modele || ''}
      </div>
      <div className="text-gray-500 text-xs">
        {vehicle.immatriculation}
      </div>
    </div>
    <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}>
      {blockSchedule.map((block) =>
        block.type === "rent" && block.contract ? (
          <div
            key={block.key}
            style={{
              gridColumn: `span ${block.length} / span ${block.length}`,
              border: block.unmatchedVehicle ? '2px solid red' : undefined,
            }}
            className="relative h-12 border-r border-gray-200 flex items-stretch"
          >
            <div
              className={`w-full h-full cursor-pointer relative group transition-all border rounded overflow-hidden`}
              title={generateContractTooltip(block.contract)}
              style={{ 
                boxShadow: "0 2px 8px 0 rgba(0,0,0,0.1)",
                background: getContractGradientStyle(block.contract, block.segmentType)
              }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded"></div>
              
              {/* Contenu du bloc avec informations */}
              <div className="absolute inset-0 p-1 text-xs overflow-hidden">
                <div className="font-medium truncate">
                  {block.contract.customer_name || block.contract.customerName || 'N/A'}
                </div>
                <div className="opacity-75 truncate">
                  {(block.contract as any).contract_number || block.contract.id?.substring(0, 8) || 'N/A'}
                </div>
              </div>
              
              {block.unmatchedVehicle && (
                <span className="absolute inset-x-0 bottom-[-1.4em] text-xs text-destructive bg-card border border-destructive/30 px-1 rounded shadow z-10">
                  ⚠️ Problème associé véhicule
                </span>
              )}
            </div>
          </div>
        ) : (
          <div
            key={block.key}
            style={{ gridColumn: `span ${block.length} / span ${block.length}` }}
            className="relative h-12 border-r border-gray-200"
          >
            <div className="w-full h-full bg-gray-100"></div>
          </div>
        )
      )}
    </div>
  </div>
);

export default VehicleGanttChartRow;
