
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Globe, UserMinus } from "lucide-react";
import React from "react";
import { motion } from "framer-motion";

interface Props {
  tenantsLength: number;
  mainTenants: number;
  nationalityCount: number;
  foreignTenantCount: number;
}

export default function TenantsStatsBar({ tenantsLength, mainTenants, nationalityCount, foreignTenantCount }: Props) {
  const stats = [
    {
      label: "Total Locataires",
      value: tenantsLength,
      icon: Users,
      color: "text-card-blue",
      bg: "bg-card-blue-bg",
      accent: "bg-card-blue"
    },
    {
      label: "Locataires Principaux",
      value: mainTenants,
      icon: UserCheck,
      color: "text-card-green",
      bg: "bg-card-green-bg",
      accent: "bg-card-green"
    },
    {
      label: "Nationalités",
      value: nationalityCount,
      icon: Globe,
      color: "text-card-orange",
      bg: "bg-card-orange-bg",
      accent: "bg-card-orange"
    },
    {
      label: "Étrangers",
      value: foreignTenantCount,
      icon: UserMinus,
      color: "text-card-red",
      bg: "bg-card-red-bg",
      accent: "bg-card-red"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="border-none shadow-card bg-card overflow-hidden group relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 w-full h-1 ${stat.accent} opacity-20 group-hover:opacity-100 transition-opacity duration-300`}></div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
