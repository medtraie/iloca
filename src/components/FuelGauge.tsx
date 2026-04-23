
import { useState, useEffect } from "react";
import { Fuel } from "lucide-react";

interface FuelGaugeProps {
  value?: number;
  onChange?: (value: number) => void;
  label?: string;
}

const FuelGauge = ({ value = 50, onChange, label = "Niveau de carburant" }: FuelGaugeProps) => {
  const [fuelLevel, setFuelLevel] = useState(value);

  // CRITICAL FIX: Sync internal state with external value prop changes
  useEffect(() => {
    console.log(`[FuelGauge] Syncing fuel level: ${value} for label: ${label}`);
    setFuelLevel(value);
  }, [value, label]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newLevel = Math.round((clickX / rect.width) * 100);
    const clampedLevel = Math.max(0, Math.min(100, newLevel));
    
    setFuelLevel(clampedLevel);
    onChange?.(clampedLevel);
  };

  const getFuelColor = () => {
    if (fuelLevel <= 25) return "bg-red-500";
    if (fuelLevel <= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Fuel className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-gray-500">({fuelLevel}%)</span>
      </div>
      
      <div 
        className="relative w-full h-6 bg-gray-200 rounded-full cursor-pointer border border-gray-300"
        onClick={handleClick}
      >
        <div 
          className={`h-full rounded-full transition-all duration-200 ${getFuelColor()}`}
          style={{ width: `${fuelLevel}%` }}
        />
        
        {/* Gauge markings */}
        <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center px-1">
          {[0, 25, 50, 75, 100].map((mark) => (
            <div 
              key={mark}
              className="w-0.5 h-3 bg-gray-400"
              style={{ marginLeft: mark === 0 ? '0' : '-1px' }}
            />
          ))}
        </div>
        
        {/* Labels */}
        <div className="absolute -bottom-5 left-0 w-full flex justify-between text-xs text-gray-500">
          <span>E</span>
          <span>1/4</span>
          <span>1/2</span>
          <span>3/4</span>
          <span>F</span>
        </div>
      </div>
    </div>
  );
};

export default FuelGauge;
