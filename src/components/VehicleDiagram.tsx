
import { useState, useEffect } from "react";

interface DamagePoint {
  id: string;
  x: number;
  y: number;
}

interface VehicleDiagramProps {
  onDamageChange?: (damages: DamagePoint[]) => void;
  initialDamages?: DamagePoint[];
}

const VehicleDiagram = ({ onDamageChange, initialDamages = [] }: VehicleDiagramProps) => {
  const [damagePoints, setDamagePoints] = useState<DamagePoint[]>(initialDamages);

  // CRITICAL FIX: Sync internal state with external initialDamages prop changes  
  useEffect(() => {
    console.log(`[VehicleDiagram] Syncing damage points:`, initialDamages);
    setDamagePoints(initialDamages);
  }, [initialDamages]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newDamage: DamagePoint = {
      id: `damage_${Date.now()}`,
      x,
      y
    };
    
    const updatedDamages = [...damagePoints, newDamage];
    setDamagePoints(updatedDamages);
    onDamageChange?.(updatedDamages);
  };

  const removeDamagePoint = (id: string) => {
    const updatedDamages = damagePoints.filter(point => point.id !== id);
    setDamagePoints(updatedDamages);
    onDamageChange?.(updatedDamages);
  };

  return (
    <div className="relative w-full">
      <div 
        className="relative cursor-crosshair border-2 border-border rounded-lg overflow-hidden bg-card"
        onClick={handleClick}
      >
        <img 
          src="/lovable-uploads/b28228b7-89d0-46f1-88ae-39cdf67d2bde.png"
          alt="Diagramme de véhicule"
          className="w-full h-auto max-w-md mx-auto"
          draggable={false}
        />
        
        {damagePoints.map((point) => (
          <div
            key={point.id}
            className="absolute w-4 h-4 bg-red-500 border-2 border-white rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:bg-red-600"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`
            }}
            onClick={(e) => {
              e.stopPropagation();
              removeDamagePoint(point.id);
            }}
            title="Cliquez pour supprimer"
          />
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground mt-2 text-center">
        Cliquez sur le véhicule pour marquer les dommages • Cliquez sur un point rouge pour le supprimer
      </div>
    </div>
  );
};

export default VehicleDiagram;
