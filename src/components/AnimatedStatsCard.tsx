import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const getColorFromTailwind = (bgClass: string): string => {
  const colorMap: Record<string, string> = {
    'bg-primary': 'hsl(var(--primary))',
    'bg-card-blue': 'hsl(var(--card-blue))',
    'bg-card-green': 'hsl(var(--card-green))',
    'bg-card-orange': 'hsl(var(--card-orange))',
    'bg-card-red': 'hsl(var(--card-red))',
  };
  return colorMap[bgClass] || 'hsl(var(--primary))';
};

interface AnimatedStatsCardProps {
  title: string;
  value: number;
  total: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  textColor: string;
  delay?: number;
}

export const AnimatedStatsCard: React.FC<AnimatedStatsCardProps> = ({
  title,
  value,
  total,
  icon: Icon,
  color,
  bgColor,
  textColor,
  delay = 0,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const increment = value / 30; // Animate over 30 steps
      const intervalTimer = setInterval(() => {
        current += increment;
        if (current >= value) {
          current = value;
          clearInterval(intervalTimer);
        }
        setAnimatedValue(Math.floor(current));
      }, 33); // ~30fps
      
      return () => clearInterval(intervalTimer);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);

  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <Card className={cn("border-none shadow-card bg-card overflow-hidden group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl")}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{title}</p>
            <div className="flex items-center gap-6">
              <div className="relative w-16 h-16 shrink-0">
                <CircularProgress
                  value={percentage}
                  max={100}
                  size={64}
                  strokeWidth={6}
                  color={getColorFromTailwind(color)}
                  className="shrink-0 transition-all duration-1000 ease-out"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-lg font-black tracking-tighter", textColor)}>
                    {Math.round(percentage)}%
                  </span>
                </div>
              </div>
              <div>
                <div className={cn("text-3xl font-black mb-0.5 tracking-tight", textColor)}>
                  {animatedValue}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                  sur {total} total
                </div>
              </div>
            </div>
          </div>
          <div className={cn("p-3.5 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg", color, "bg-opacity-10")}>
            <Icon className={cn("h-6 w-6", textColor)} />
          </div>
        </div>
      </CardContent>
      <div className={cn("absolute bottom-0 left-0 w-full h-1 opacity-20 group-hover:opacity-100 transition-opacity duration-300", color)}></div>
    </Card>
  );
};