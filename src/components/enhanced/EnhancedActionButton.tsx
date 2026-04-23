import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  tooltip?: string;
}

export function EnhancedActionButton({
  label,
  onClick,
  icon = <Plus className="h-4 w-4 mr-2" />,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  className = "",
  tooltip
}: EnhancedActionButtonProps) {
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'primary':
        return "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg";
      case 'secondary':
        return "bg-secondary hover:bg-secondary/90 text-secondary-foreground";
      case 'success':
        return "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg";
      case 'warning':
        return "bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg";
      case 'danger':
        return "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg";
      default:
        return "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg";
    }
  };

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'sm':
        return "h-9 px-3 text-sm";
      case 'lg':
        return "h-12 px-6 text-lg";
      default:
        return "h-11 px-4";
    }
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "font-medium transition-all duration-200 transform hover:scale-105 active:scale-95",
        getVariantStyles(variant),
        getSizeStyles(size),
        className
      )}
      title={tooltip}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
      ) : (
        icon
      )}
      {loading ? "Chargement..." : label}
    </Button>
  );
}