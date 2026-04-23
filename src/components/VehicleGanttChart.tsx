import { useState, useMemo } from "react";
import VehicleGanttChartHeader from "./VehicleGanttChartHeader";
import VehicleGanttChartRow from "./VehicleGanttChartRow";
import { matchContractToVehicleId } from "./VehicleGanttChart.utils";
import { generateGanttSegments } from "@/utils/contractFinancialStatus";
import { Contract, FilterState, Vehicle } from "./VehicleGanttChart.types";
import { addDays } from "date-fns";

interface VehicleGanttChartProps {
  vehicles: Vehicle[];
  contracts: Contract[];
  filters: FilterState;
}

const VehicleGanttChart = ({ vehicles, contracts, filters }: VehicleGanttChartProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthNames = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];

  const dayNames = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(currentYear, currentMonth, day);
    const dayName = dayNames[date.getDay()];
    return { day, dayName };
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') newDate.setMonth(currentMonth - 1);
    else newDate.setMonth(currentMonth + 1);
    setCurrentDate(newDate);
  };

  const filteredVehicles = useMemo(() => {
    let vehicleList = vehicles;
    if (selectedVehicle !== "all") {
      vehicleList = vehicles.filter(v => v.id === selectedVehicle);
    }
    if (
      filters.vehicleId &&
      filters.vehicleId !== "all" &&
      filters.vehicleId !== ""
    ) {
      vehicleList = vehicleList.filter(v => v.id === filters.vehicleId);
    }
    return vehicleList;
  }, [vehicles, selectedVehicle, filters.vehicleId]);

  // تعديل: دالة ترجع بداية اليوم (دون توقيت) لأي تاريخ
  function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // دالة ترجع نهاية اليوم (آخر ثانية باليوم)
  function endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // تحويل التواريخ من بيانات العقد (سواء بصيغة dd/mm/yyyy أو ISO) إلى كائنات Date صحيحة
  function parseContractDate(rawDate: string) {
    if (!rawDate) return new Date();
    if (typeof rawDate === "string" && rawDate.match(/^\d{2}\/\d{2}\/\d{4}/)) {
      // dd/mm/yyyy [hh:mm]
      const [datePart, timePart] = rawDate.split(" ");
      const [d, m, y] = datePart.split("/");
      if (timePart) {
        const [H, MM] = timePart.split(":");
        return new Date(+y, +m - 1, +d, +H, +MM);
      } else {
        return new Date(+y, +m - 1, +d);
      }
    } else {
      return new Date(rawDate);
    }
  }

  // ===== تحسين: التقاط الفترات بدقة للطول والتواريخ =====
  // ================== Contract Range Calculation (with segments) ==================
  
  function getContractSegments(contract: any) {
    try {
      // Utiliser generateGanttSegments pour obtenir les segments séparés
      const segments = generateGanttSegments(contract);
      
      // Convertir les segments en intervalles avec leurs types
      return segments.map(segment => ({
        start: startOfDay(segment.start),
        end: endOfDay(segment.end),
        segmentType: segment.type,
        contract: contract
      }));
    } catch (error) {
      console.warn("Erreur lors de la génération des segments:", error);
      
      // Fallback vers l'ancienne méthode si generateGanttSegments échoue
      const getField = (...names: string[]) => {
        for (const name of names) {
          if (contract[name] !== undefined) return contract[name];
        }
        return undefined;
      };

      let baseStartRaw = getField("startDate", "start_date");
      let baseStart: Date = baseStartRaw ? parseContractDate(baseStartRaw) : new Date();
      baseStart = startOfDay(baseStart);

      let nombreDeJour: number | undefined = getField("nombreDeJour", "nombre_de_jour");
      let baseEnd: Date;

      if (typeof nombreDeJour === "number" && nombreDeJour > 0) {
        baseEnd = addDays(baseStart, nombreDeJour - 1);
      } else {
        let endDateRaw = getField("endDate", "end_date");
        baseEnd = endDateRaw ? parseContractDate(endDateRaw) : new Date(baseStart);
      }
      baseEnd = endOfDay(baseEnd);

      return [{ start: baseStart, end: baseEnd, segmentType: 'main' as const, contract: contract }];
    }
  }

  const ganttData = useMemo(() => {
    return filteredVehicles.map(vehicle => {
      const vehicleContracts = contracts.filter(contract => {
        const contractVehicleId = matchContractToVehicleId(contract, vehicles);
        // DEBUG LOG: show what contract links to what vehicle
        if (!contractVehicleId || contractVehicleId !== vehicle.id) {
          console.log(`[GANTT-match] Contract ${contract.id} — expected vehicle ${vehicle.id} — got ${contractVehicleId} — contract.vehicle =`, contract.vehicle, contract.vehicleId);
        }
        if (contractVehicleId !== vehicle.id) return false;
        if (filters.tenantName && filters.tenantName !== "all" && !contract.customerName?.includes?.(filters.tenantName)) return false;
        if (filters.contractStatus && filters.contractStatus !== "all" && contract.status !== filters.contractStatus) return false;
        return true;
      });

      // DEBUG: which contracts were matched to this vehicle
      console.log(`[GANTT-vehicleContracts] For vehicle ${vehicle.id} => contracts:`, vehicleContracts);

      let contractIntervals: Array<{ contract: Contract; start: Date; end: Date; segmentType: 'main' | 'extension' | 'overdue' }> = [];
      for (const contract of vehicleContracts) {
        const segments = getContractSegments(contract);
        for (const segment of segments) {
          contractIntervals.push({ 
            contract: segment.contract, 
            start: segment.start, 
            end: segment.end, 
            segmentType: segment.segmentType 
          });
        }
      }

      // تحقق: هل يوم معين (بـdays) يقع ضمن فترة حجز عقد
      function isSameOrWithin(day: Date, from: Date, to: Date) {
        const target = startOfDay(day); // اليوم نفسه، بلا وقت
        return target.getTime() >= startOfDay(from).getTime() && target.getTime() <= endOfDay(to).getTime();
      }

      // Debug: عرض الأيام المغطاة حسب العقود
      const coveredDays: Record<number, { contractId: string; segmentType: string } | null> = {};
      days.forEach(({ day }) => {
        const currentDayDate = new Date(currentYear, currentMonth, day);
        const found = contractIntervals.find(({ start, end }) => isSameOrWithin(currentDayDate, start, end));
        coveredDays[day] = found ? { contractId: found.contract.id, segmentType: found.segmentType } : null;
      });
      console.log("Vehicle", vehicle.id, vehicle.marque, "contract intervals", contractIntervals.map(a=>({start:a.start, end:a.end, type: a.segmentType})));
      console.log("Vehicle", vehicle.id, vehicle.marque, "covered days", coveredDays);

      // بناء سكجويل الأيام: أي عقد يغطي كل يوم
      const schedule = days.map(({ day }) => {
        const currentDayDate = new Date(currentYear, currentMonth, day);
        const coveringInterval = contractIntervals.find(({ start, end }) => isSameOrWithin(currentDayDate, start, end));
        return {
          day,
          contract: coveringInterval?.contract,
          segmentType: coveringInterval?.segmentType,
        };
      });

      // بناء البلوكات المتصلة (blockSchedule)
      const blockSchedule: Array<{
        key: string;
        from: number;
        length: number;
        contract?: Contract;
        type: "rent" | "free";
        segmentType?: 'main' | 'extension' | 'overdue';
        unmatchedVehicle: boolean;
      }> = [];

      let idx = 0;
      while (idx < schedule.length) {
        if (schedule[idx].contract) {
          const currentContract = schedule[idx].contract!;
          const currentSegmentType = schedule[idx].segmentType;
          let blockLen = 1;
          while (
            idx + blockLen < schedule.length &&
            schedule[idx + blockLen].contract &&
            schedule[idx + blockLen].contract!.id === currentContract.id &&
            schedule[idx + blockLen].segmentType === currentSegmentType // Même type de segment
          ) {
            blockLen += 1;
          }
          // Let's mark if this contract's vehicleId matched or not
          const matchedId = matchContractToVehicleId(currentContract, vehicles);
          blockSchedule.push({
            key: `rent-${currentContract.id}-${currentSegmentType}-${idx}`,
            from: idx,
            length: blockLen,
            contract: currentContract,
            type: "rent",
            segmentType: currentSegmentType,
            unmatchedVehicle: matchedId !== vehicle.id
          });
          idx += blockLen;
        } else {
          let freeLen = 1;
          while (
            idx + freeLen < schedule.length &&
            !schedule[idx + freeLen].contract
          ) {
            freeLen += 1;
          }
          blockSchedule.push({
            key: `free-${idx}`,
            from: idx,
            length: freeLen,
            type: "free",
            unmatchedVehicle: false
          });
          idx += freeLen;
        }
      }
      return {
        vehicle,
        blockSchedule,
      };
    });
  }, [filteredVehicles, contracts, filters, days, currentMonth, currentYear, vehicles]);

  return (
    <div className="space-y-6">
      <VehicleGanttChartHeader
        currentMonth={currentMonth}
        currentYear={currentYear}
        monthNames={monthNames}
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
        navigateMonth={navigateMonth}
      />
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-center">
            Planning ({filteredVehicles.length} véhicule{filteredVehicles.length > 1 ? 's' : ''})
          </h3>
        </div>
        {filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Aucun véhicule à afficher</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[200px_1fr] gap-0 border-b bg-gray-50">
                <div className="p-3 font-semibold text-sm text-gray-600 border-r">
                  Véhicule
                </div>
                <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}>
                  {days.map(({ day, dayName }) => (
                    <div key={day} className="text-xs text-center p-2 border-r border-gray-200">
                      <div className="font-semibold">{dayName}</div>
                      <div className="text-gray-600">{day}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                {ganttData.map((row) => (
                  <VehicleGanttChartRow
                    key={row.vehicle.id}
                    vehicle={row.vehicle}
                    blockSchedule={row.blockSchedule}
                    daysInMonth={daysInMonth}
                    days={days}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleGanttChart;
