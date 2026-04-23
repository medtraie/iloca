import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, BarChart3, PieChart, TrendingUp, Filter, Pause, Play } from "lucide-react";

export type TimeFilter = 'day' | 'month' | 'year';

interface ReportFiltersProps {
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  showPieChart: boolean;
  onShowPieChartChange: (show: boolean) => void;
  showBarChart: boolean;
  onShowBarChartChange: (show: boolean) => void;
  showLineChart: boolean;
  onShowLineChartChange: (show: boolean) => void;
  freezePieChart: boolean;
  onFreezePieChartChange: (freeze: boolean) => void;
  freezeBarChart: boolean;
  onFreezeBarChartChange: (freeze: boolean) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const ReportFilters = ({
  timeFilter,
  onTimeFilterChange,
  showPieChart,
  onShowPieChartChange,
  showBarChart,
  onShowBarChartChange,
  showLineChart,
  onShowLineChartChange,
  freezePieChart,
  onFreezePieChartChange,
  freezeBarChart,
  onFreezeBarChartChange,
  selectedDate,
  onDateChange
}: ReportFiltersProps) => {
  const getDateInputType = () => {
    switch (timeFilter) {
      case 'day':
        return 'date';
      case 'month':
        return 'month';
      case 'year':
        return 'number';
      default:
        return 'date';
    }
  };

  const getDateValue = () => {
    if (timeFilter === 'year') {
      return selectedDate.split('-')[0];
    }
    if (timeFilter === 'month') {
      return selectedDate.substring(0, 7); // YYYY-MM
    }
    return selectedDate;
  };

  const handleDateChange = (value: string) => {
    if (timeFilter === 'year') {
      onDateChange(`${value}-01-01`);
    } else if (timeFilter === 'month') {
      onDateChange(`${value}-01`);
    } else {
      onDateChange(value);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center gap-6">
          {/* Time Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <Label className="text-sm font-medium">Période:</Label>
            <Select value={timeFilter} onValueChange={(value: TimeFilter) => onTimeFilterChange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Jour</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
                <SelectItem value="year">Année</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <Label className="text-sm font-medium">Date:</Label>
            {timeFilter === 'year' ? (
              <input
                type="number"
                min="2020"
                max="2030"
                value={getDateValue()}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-24"
              />
            ) : (
              <input
                type={getDateInputType()}
                value={getDateValue()}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            )}
          </div>

          {/* Chart Toggles */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <Label className="text-sm font-medium">Pie Chart:</Label>
              <Switch
                checked={showPieChart}
                onCheckedChange={onShowPieChartChange}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFreezePieChartChange(!freezePieChart)}
                className="ml-1 p-1 h-6 w-6"
                title={freezePieChart ? "Données gelées - Cliquer pour débloquer" : "Cliquer pour geler les données"}
              >
                {freezePieChart ? <Pause className="w-3 h-3 text-red-500" /> : <Play className="w-3 h-3 text-green-500" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-600" />
              <Label className="text-sm font-medium">Bar Chart:</Label>
              <Switch
                checked={showBarChart}
                onCheckedChange={onShowBarChartChange}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFreezeBarChartChange(!freezeBarChart)}
                className="ml-1 p-1 h-6 w-6"
                title={freezeBarChart ? "Données gelées - Cliquer pour débloquer" : "Cliquer pour geler les données"}
              >
                {freezeBarChart ? <Pause className="w-3 h-3 text-red-500" /> : <Play className="w-3 h-3 text-green-500" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <Label className="text-sm font-medium">Line Chart:</Label>
              <Switch
                checked={showLineChart}
                onCheckedChange={onShowLineChartChange}
              />
            </div>
          </div>
        </div>

        {/* Current Filter Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Filtre actuel:</span> 
            {timeFilter === 'day' && ` Jour du ${new Date(selectedDate).toLocaleDateString('fr-FR')}`}
            {timeFilter === 'month' && ` Mois de ${new Date(selectedDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}`}
            {timeFilter === 'year' && ` Année ${selectedDate.split('-')[0]}`}
            <span className="ml-4">
              Graphiques actifs: 
              {showPieChart && (freezePieChart ? ' Pie (gelé)' : ' Pie')}
              {showBarChart && (freezeBarChart ? ' Bar (gelé)' : ' Bar')}
              {showLineChart && ' Line'}
              {!showPieChart && !showBarChart && !showLineChart && ' Aucun'}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};