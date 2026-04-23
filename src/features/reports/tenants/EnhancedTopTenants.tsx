import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Calendar, DollarSign } from "lucide-react";
import { TenantData } from "./types";

interface EnhancedTopTenantsProps {
  tenantData: TenantData[];
}

const EnhancedTopTenants = ({ tenantData }: EnhancedTopTenantsProps) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Colors for each position
  const cardColors = [
    { bg: "bg-gradient-to-br from-yellow-400 to-orange-500", text: "text-white", border: "border-yellow-300" }, // Gold
    { bg: "bg-gradient-to-br from-gray-400 to-gray-600", text: "text-white", border: "border-gray-300" }, // Silver
    { bg: "bg-gradient-to-br from-orange-600 to-red-600", text: "text-white", border: "border-orange-300" }, // Bronze
    { bg: "bg-gradient-to-br from-blue-500 to-blue-700", text: "text-white", border: "border-blue-300" }, // Blue
    { bg: "bg-gradient-to-br from-purple-500 to-purple-700", text: "text-white", border: "border-purple-300" }, // Purple
  ];

  const positionIcons = [
    <Trophy className="w-5 h-5" />, // 1st
    <Trophy className="w-5 h-5" />, // 2nd
    <Trophy className="w-5 h-5" />, // 3rd
    <Users className="w-4 h-4" />, // 4th
    <Users className="w-4 h-4" />, // 5th
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800">Top 5 des meilleurs clients</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tenantData.slice(0, 5).map((tenant, index) => {
          const colorScheme = cardColors[index];
          const isHovered = hoveredCard === index;
          
          return (
            <Card 
              key={tenant.name}
              className={`
                relative overflow-hidden transition-all duration-300 cursor-pointer
                ${colorScheme.border} border-2 rounded-xl h-48
                ${isHovered ? 'transform scale-102 shadow-2xl' : 'shadow-lg hover:shadow-xl'}
              `}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardContent className={`p-0 ${colorScheme.bg} h-full flex`}>
                {/* Position Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <Badge 
                    variant="secondary" 
                    className="bg-card/90 text-foreground font-bold text-lg px-3 py-1 shadow-lg"
                  >
                    #{index + 1}
                  </Badge>
                </div>

                {/* Position Icon */}
                <div className="absolute top-3 left-3 z-10 bg-muted/20 p-2 rounded-full">
                  {positionIcons[index]}
                </div>

                {/* Left side - Client info */}
                <div className={`flex-1 p-6 pt-16 ${colorScheme.text}`}>
                  {/* Client Name */}
                  <h4 className="font-bold text-xl mb-6 truncate" title={tenant.name}>
                    {tenant.name}
                  </h4>

                  {/* Main stats in horizontal layout */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="opacity-90">Contrats:</span>
                      <span className="font-bold text-lg">{tenant.totalContracts}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="opacity-90">Jours:</span>
                      <span className="font-bold text-lg">{tenant.totalDays}</span>
                    </div>
                  </div>
                </div>

                {/* Right side - Amount */}
                <div className={`flex flex-col justify-center items-center p-6 border-l border-white/20 bg-white/10 ${colorScheme.text} min-w-[120px]`}>
                  <div className="text-center">
                    <DollarSign className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-bold text-xl">
                      {Math.round(tenant.totalAmount / 1000)}K
                    </div>
                    <div className="text-xs opacity-80">MAD</div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full" />
                <div className="absolute -top-2 -left-2 w-12 h-12 bg-white/10 rounded-full" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tenantData.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">Aucun client trouvé</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedTopTenants;