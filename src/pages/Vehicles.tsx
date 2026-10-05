import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVehicles, Vehicle } from '@/hooks/useVehicles';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import VehicleFormDialog, { DocumentUploadType } from '@/components/VehicleFormDialog';
import VehicleDetailsDialog from '@/components/VehicleDetailsDialog';
import { 
  Plus, Search, Car, CheckCircle2, KeyRound, Wrench, RefreshCcw, 
  Table2, LayoutGrid, Maximize2, X, ArrowUpDown, Sparkles, 
  Kanban, Fuel, Zap, ShieldAlert, Check, MoreVertical, Radio, Navigation, Eye
} from 'lucide-react';
import VehicleCard from '@/components/VehicleCard';
import VehicleTable from '@/components/VehicleTable';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useGPSwoxVehicles } from '@/hooks/useGPSwoxVehicles';

type VehiclesViewMode = 'cards' | 'table' | 'kanban';
type StatusFilter = 'all' | 'disponible' | 'loue' | 'maintenance' | 'horsService';
type SortOption = 'default' | 'price_asc' | 'price_desc' | 'km_asc' | 'km_desc' | 'name_asc';

const Vehicles = () => {
  const { vehicles, loading, addVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const { data: gpsVehiclesData } = useGPSwoxVehicles();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedFuel, setSelectedFuel] = useState<string>('all');
  const [selectedGearbox, setSelectedGearbox] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [hideGpsVehicles, setHideGpsVehicles] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage<VehiclesViewMode>('vehicles:view-mode', 'cards');

  // Keyboard shortcut for fullscreen table
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f' || event.altKey || event.ctrlKey || event.metaKey) return;
      if (viewMode !== 'table') return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        Boolean(target?.isContentEditable);

      if (isTypingTarget) return;
      event.preventDefault();
      setIsTableFullscreen((current) => !current);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [viewMode]);

  // Extract unique brands for quick filter chips
  const uniqueBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    vehicles.forEach((v) => {
      const brand = (v.marque || v.brand || '').trim();
      if (brand) brandsSet.add(brand);
    });
    return Array.from(brandsSet).sort();
  }, [vehicles]);

  const gpsPlatesSet = useMemo(() => {
    const set = new Set<string>();
    if (gpsVehiclesData && Array.isArray(gpsVehiclesData)) {
      gpsVehiclesData.forEach((g) => {
        if (g.plate) {
          const clean = g.plate.toLowerCase().replace(/[\s\-_]/g, '');
          if (clean) set.add(clean);
        }
      });
    }
    return set;
  }, [gpsVehiclesData]);

  const isGpsVehicle = (vehicle: Vehicle) => {
    if ((vehicle as any).has_gps || (vehicle as any).gps_device_id || (vehicle as any).gps_tracker) return true;
    const cleanImmat = (vehicle.immatriculation || vehicle.registration || '').toLowerCase().replace(/[\s\-_]/g, '');
    if (cleanImmat && gpsPlatesSet.has(cleanImmat)) return true;
    if (Array.isArray(vehicle.documents)) {
      if (vehicle.documents.some((d) => String(d).toLowerCase().includes('gps'))) return true;
    }
    return false;
  };

  // Filter and sort vehicles
  const filteredVehicles = useMemo(() => {
    let result = vehicles.filter((vehicle) => {
      if (hideGpsVehicles && isGpsVehicle(vehicle)) {
        return false;
      }

      const searchString = searchTerm.toLowerCase().trim();
      const marque = (vehicle.marque || vehicle.brand || '').toLowerCase();
      const modele = (vehicle.modele || vehicle.model || '').toLowerCase();
      const immat = (vehicle.immatriculation || vehicle.registration || '').toLowerCase();
      const matchesSearch = !searchString || marque.includes(searchString) || modele.includes(searchString) || immat.includes(searchString);

      const status = vehicle.etat_vehicule || 'disponible';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      const vehicleBrand = (vehicle.marque || vehicle.brand || '').trim();
      const matchesBrand = selectedBrand === 'all' || vehicleBrand.toLowerCase() === selectedBrand.toLowerCase();

      const fuel = (vehicle.type_carburant || '').toLowerCase();
      const matchesFuel = selectedFuel === 'all' || fuel.includes(selectedFuel.toLowerCase());

      const gearbox = (vehicle.boite_vitesse || '').toLowerCase();
      const matchesGearbox = selectedGearbox === 'all' || gearbox.includes(selectedGearbox.toLowerCase());

      return matchesSearch && matchesStatus && matchesBrand && matchesFuel && matchesGearbox;
    });

    // Sorting logic
    if (sortBy === 'price_asc') {
      result.sort((a, b) => (Number(a.prix_par_jour) || 0) - (Number(b.prix_par_jour) || 0));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (Number(b.prix_par_jour) || 0) - (Number(a.prix_par_jour) || 0));
    } else if (sortBy === 'km_asc') {
      result.sort((a, b) => (Number(a.kilometrage) || 0) - (Number(b.kilometrage) || 0));
    } else if (sortBy === 'km_desc') {
      result.sort((a, b) => (Number(b.kilometrage) || 0) - (Number(a.kilometrage) || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.marque || a.brand || '').localeCompare(b.marque || b.brand || ''));
    }

    return result;
  }, [vehicles, searchTerm, statusFilter, selectedBrand, selectedFuel, selectedGearbox, sortBy, hideGpsVehicles, gpsPlatesSet]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponible':
        return { label: 'Disponible', variant: 'success', color: 'text-emerald-500' };
      case 'loue':
        return { label: 'En Location', variant: 'secondary', color: 'text-blue-500' };
      case 'maintenance':
        return { label: 'Maintenance', variant: 'warning', color: 'text-amber-500' };
      case 'horsService':
        return { label: 'Hors service', variant: 'destructive', color: 'text-rose-500' };
      default:
        return { label: 'Disponible', variant: 'outline', color: 'text-muted-foreground' };
    }
  };

  const handleAddVehicle = async (vehicleData: any, docUploads?: DocumentUploadType[]) => {
    const finalVehicleData = { ...vehicleData };
    if (docUploads && docUploads.length > 0) {
      finalVehicleData.documents = docUploads.map((doc) => doc.file?.name || doc.name || JSON.stringify(doc));
    }

    const result = editingVehicle
      ? await updateVehicle(editingVehicle.id, finalVehicleData)
      : await addVehicle(finalVehicleData);

    if (result) {
      setFormDialogOpen(false);
      setEditingVehicle(null);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormDialogOpen(true);
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDetailsDialogOpen(true);
  };

  const handleQuickStatusChange = async (vehicleId: string, newStatus: string) => {
    await updateVehicle(vehicleId, { etat_vehicule: newStatus });
  };

  // Fleet Telemetry Stats
  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => (v.etat_vehicule || 'disponible') === 'disponible').length;
    const rented = vehicles.filter((v) => v.etat_vehicule === 'loue').length;
    const maintenance = vehicles.filter((v) => v.etat_vehicule === 'maintenance').length;
    const horsService = vehicles.filter((v) => v.etat_vehicule === 'horsService').length;
    const availabilityRate = total > 0 ? Math.round((available / total) * 100) : 0;
    const rentalRate = total > 0 ? Math.round((rented / total) * 100) : 0;
    const totalPotentialRevenue = vehicles.reduce((sum, v) => sum + (Number(v.prix_par_jour) || 200), 0);

    return {
      total,
      available,
      rented,
      maintenance,
      horsService,
      availabilityRate,
      rentalRate,
      totalPotentialRevenue
    };
  }, [vehicles]);

  const kanbanColumns = [
    {
      id: 'disponible',
      title: 'Disponibles (Prêts)',
      color: 'emerald',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
      vehicles: filteredVehicles.filter(v => (v.etat_vehicule || 'disponible') === 'disponible')
    },
    {
      id: 'loue',
      title: 'En Location (Actifs)',
      color: 'blue',
      badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      dotClass: 'bg-blue-500',
      vehicles: filteredVehicles.filter(v => v.etat_vehicule === 'loue')
    },
    {
      id: 'maintenance',
      title: 'En Maintenance',
      color: 'amber',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      dotClass: 'bg-amber-500',
      vehicles: filteredVehicles.filter(v => v.etat_vehicule === 'maintenance')
    },
    {
      id: 'horsService',
      title: 'Hors Service',
      color: 'rose',
      badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      dotClass: 'bg-rose-500',
      vehicles: filteredVehicles.filter(v => v.etat_vehicule === 'horsService')
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-accent/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-accent/40 border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-accent/10 backdrop-blur-md flex items-center justify-center">
            <Car className="w-6 h-6 text-accent animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-black text-foreground tracking-tight">Chargement du parc automobile</p>
          <p className="text-xs text-muted-foreground font-medium">Synchronisation de la télémétrie de flotte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6 space-y-6 pb-24 w-full transition-all">
      {/* 2026 Hero Header Section */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-accent">Fleet OS 2026 • Live Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Parc <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent/90 to-blue-500">Automobile</span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Gérez votre flotte de luxe, disponibilités et télémétrie en temps réel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={hideGpsVehicles ? "default" : "outline"}
            onClick={() => setHideGpsVehicles(!hideGpsVehicles)}
            className={`rounded-2xl h-12 px-4 font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-2 border ${
              hideGpsVehicles 
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-amber-500/20' 
                : 'border-border/60 hover:bg-card text-foreground'
            }`}
          >
            <Navigation className="w-4 h-4" />
            {hideGpsVehicles ? 'GPS Masqués' : 'Masquer Véhicules GPS'}
          </Button>

          <Button 
            onClick={() => {
              setEditingVehicle(null);
              setFormDialogOpen(true);
            }} 
            className="rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-black px-6 h-12 shadow-lg shadow-accent/20 active:scale-95 transition-all text-sm flex items-center gap-2"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            Nouveau Véhicule
          </Button>

          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
            aria-label="Actualiser"
            className="rounded-2xl h-12 w-12 p-0 border-border/60 hover:bg-card active:scale-95 transition-all"
          >
            <RefreshCcw className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </motion.div>

      {/* 2026 Luxury Telemetry Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Flotte */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-card via-card to-card/90 border border-border/60 shadow-sm group hover:border-foreground/30 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">Total Flotte</span>
            <div className="p-2.5 rounded-2xl bg-foreground/5 group-hover:scale-110 transition-transform">
              <Car className="w-5 h-5 text-foreground" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">{stats.total}</span>
            <span className="text-[11px] font-bold text-muted-foreground">véhicule{stats.total > 1 ? 's' : ''}</span>
          </div>
          <div className="w-full bg-muted/50 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-foreground h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </motion.div>

        {/* Disponibles */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-card via-card to-card/90 border border-emerald-500/20 shadow-sm group hover:border-emerald-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Disponibles</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{stats.available}</span>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {stats.availabilityRate}%
            </span>
          </div>
          <div className="w-full bg-emerald-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.availabilityRate}%` }} />
          </div>
        </motion.div>

        {/* En Location */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-card via-card to-card/90 border border-blue-500/20 shadow-sm group hover:border-blue-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">En Location</span>
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{stats.rented}</span>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {stats.rentalRate}%
            </span>
          </div>
          <div className="w-full bg-blue-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.rentalRate}%` }} />
          </div>
        </motion.div>

        {/* Maintenance & Hors Service */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-card via-card to-card/90 border border-amber-500/20 shadow-sm group hover:border-amber-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Maintenance</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{stats.maintenance}</span>
            {stats.horsService > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                +{stats.horsService} HS
              </span>
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground">0 Hors service</span>
            )}
          </div>
          <div className="w-full bg-amber-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.total > 0 ? ((stats.maintenance + stats.horsService) / stats.total) * 100 : 0}%` }} 
            />
          </div>
        </motion.div>
      </div>

      {/* 2026 Interactive Filter & Command Center */}
      <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Search & Mode Switcher Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input
              placeholder="Rechercher par marque, modèle ou matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-10 h-12 rounded-2xl border-border/50 bg-muted/30 focus-visible:ring-2 focus-visible:ring-accent text-sm font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                aria-label="Effacer la recherche"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Trier les véhicules"
                className="h-12 px-4 pr-8 rounded-2xl border border-border/50 bg-muted/30 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-accent appearance-none cursor-pointer"
              >
                <option value="default">Tri: Par défaut</option>
                <option value="price_asc">Prix: Croissant</option>
                <option value="price_desc">Prix: Décroissant</option>
                <option value="km_asc">Km: Croissant</option>
                <option value="km_desc">Km: Décroissant</option>
                <option value="name_asc">Marque: A → Z</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 3 View Mode Switchers: Cards / Table / Kanban */}
            <div className="flex items-center bg-muted/40 p-1 rounded-2xl border border-border/50">
              <Button 
                size="sm" 
                variant={viewMode === 'cards' ? 'default' : 'ghost'} 
                onClick={() => setViewMode('cards')}
                className={`rounded-xl h-10 px-3 font-bold text-xs transition-all ${viewMode === 'cards' ? 'bg-foreground text-background shadow-xs' : 'text-muted-foreground'}`}
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Grille
              </Button>
              <Button 
                size="sm" 
                variant={viewMode === 'table' ? 'default' : 'ghost'} 
                onClick={() => setViewMode('table')}
                className={`rounded-xl h-10 px-3 font-bold text-xs transition-all ${viewMode === 'table' ? 'bg-foreground text-background shadow-xs' : 'text-muted-foreground'}`}
              >
                <Table2 className="w-4 h-4 mr-1.5" />
                Tableau
              </Button>
              <Button 
                size="sm" 
                variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
                onClick={() => setViewMode('kanban')}
                className={`rounded-xl h-10 px-3 font-bold text-xs transition-all ${viewMode === 'kanban' ? 'bg-foreground text-background shadow-xs' : 'text-muted-foreground'}`}
              >
                <Kanban className="w-4 h-4 mr-1.5" />
                Kanban
              </Button>
              {viewMode === 'table' && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsTableFullscreen(true)}
                  aria-label="Plein écran"
                  className="rounded-xl h-10 px-2 text-muted-foreground hover:text-foreground"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-2xl font-black text-xs transition-all whitespace-nowrap border ${
              statusFilter === 'all'
                ? 'bg-foreground text-background border-foreground shadow-md'
                : 'bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60'
            }`}
          >
            Tous ({vehicles.length})
          </button>

          <button
            onClick={() => setStatusFilter('disponible')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-xs transition-all whitespace-nowrap border ${
              statusFilter === 'disponible'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                : 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Disponibles ({stats.available})
          </button>

          <button
            onClick={() => setStatusFilter('loue')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-xs transition-all whitespace-nowrap border ${
              statusFilter === 'loue'
                ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            En Location ({stats.rented})
          </button>

          <button
            onClick={() => setStatusFilter('maintenance')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-xs transition-all whitespace-nowrap border ${
              statusFilter === 'maintenance'
                ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Maintenance ({stats.maintenance})
          </button>

          <button
            onClick={() => setStatusFilter('horsService')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-xs transition-all whitespace-nowrap border ${
              statusFilter === 'horsService'
                ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                : 'bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Hors Service ({stats.horsService})
          </button>
        </div>

        {/* Secondary Specs Chips (Brand, Fuel, Gearbox) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/30 text-xs">
          {/* Fuel Filter Chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
              <Fuel className="w-3 h-3 text-accent" /> Énergie:
            </span>
            {['all', 'Essence', 'Diesel', 'Hybride', 'Electrique'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFuel(f)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  selectedFuel === f
                    ? 'bg-accent/20 text-accent font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'Toutes' : f}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border/50 hidden sm:block" />

          {/* Gearbox Filter Chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-500" /> Boîte:
            </span>
            {['all', 'Manuelle', 'Automatique'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGearbox(g)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  selectedGearbox === g
                    ? 'bg-blue-500/20 text-blue-500 font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {g === 'all' ? 'Toutes' : g}
              </button>
            ))}
          </div>

          {/* Reset All Filters Button */}
          {(searchTerm || statusFilter !== 'all' || selectedBrand !== 'all' || selectedFuel !== 'all' || selectedGearbox !== 'all' || hideGpsVehicles) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setSelectedBrand('all');
                setSelectedFuel('all');
                setSelectedGearbox('all');
                setHideGpsVehicles(false);
              }}
              className="text-[11px] font-bold text-accent hover:underline ml-auto"
            >
              Réinitialiser tous les filtres
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: 3 Modes */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              {viewMode === 'cards' ? 'Catalogue 3D de véhicules' : viewMode === 'table' ? 'Tableau de bord de flotte' : 'Couloirs d\'état de flotte'}
            </span>
            <Badge variant="secondary" className="font-mono font-bold text-xs rounded-lg px-2">
              {filteredVehicles.length}
            </Badge>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* MODE 1: CARDS GRID */}
          {viewMode === 'cards' && (
            <motion.div
              key="vehicles-cards-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            >
              {filteredVehicles.map((vehicle, idx) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                >
                  <VehicleCard
                    vehicle={vehicle}
                    onEdit={handleEditVehicle}
                    onDelete={deleteVehicle}
                    onViewDetails={handleViewDetails}
                    getStatusBadge={getStatusBadge}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* MODE 2: HIGH-DENSITY TABLE */}
          {viewMode === 'table' && (
            <motion.div
              key="vehicles-table-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <VehicleTable
                vehicles={filteredVehicles}
                onEdit={handleEditVehicle}
                onDelete={deleteVehicle}
                onViewDetails={handleViewDetails}
                getStatusBadge={getStatusBadge}
              />
            </motion.div>
          )}

          {/* MODE 3: KANBAN STATUS LANES */}
          {viewMode === 'kanban' && (
            <motion.div
              key="vehicles-kanban-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6"
            >
              {kanbanColumns.map((col) => (
                <div 
                  key={col.id} 
                  className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-4 flex flex-col h-[700px] shadow-sm"
                >
                  {/* Lane Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border/40 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                      <h3 className="font-black text-sm text-foreground">{col.title}</h3>
                    </div>
                    <Badge variant="secondary" className="font-bold text-xs rounded-lg">
                      {col.vehicles.length}
                    </Badge>
                  </div>

                  {/* Lane Cards List */}
                  <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1 custom-scrollbar">
                    {col.vehicles.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-2xl text-muted-foreground text-xs text-center p-4">
                        Aucun véhicule dans cette section
                      </div>
                    ) : (
                      col.vehicles.map((v) => {
                        const vMarque = v.marque || v.brand || "Véhicule";
                        const vModele = v.modele || v.model || "Standard";
                        const vImmat = v.immatriculation || v.registration || "—";
                        const vPhotos = Array.isArray(v.photos) ? v.photos : [];

                        return (
                          <div
                            key={v.id}
                            className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-xs hover:shadow-md hover:border-accent/40 transition-all space-y-2.5 group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-12 rounded-xl bg-muted/60 overflow-hidden shrink-0 border border-border/40">
                                {vPhotos.length > 0 ? (
                                  <img src={vPhotos[0]} alt={`${vMarque} ${vModele}`} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Car className="w-5 h-5 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-black text-xs text-foreground truncate group-hover:text-accent transition-colors">
                                  {vMarque} {vModele}
                                </h4>
                                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                                  {vImmat}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                              <span className="font-black text-accent text-xs">
                                {v.prix_par_jour || 200} <span className="text-[9px] font-bold text-muted-foreground">DH/j</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {(v.kilometrage || 0).toLocaleString()} km
                              </span>
                            </div>

                            {/* Kanban Quick Action Buttons & Status Selector */}
                            <div className="flex items-center justify-between gap-1 pt-1">
                              <select
                                value={v.etat_vehicule || 'disponible'}
                                onChange={(e) => handleQuickStatusChange(v.id, e.target.value)}
                                className="h-7 text-[10px] font-bold rounded-lg bg-muted/50 border border-border/50 px-2 text-foreground cursor-pointer focus:outline-hidden"
                              >
                                <option value="disponible">🟢 Disponible</option>
                                <option value="loue">🔵 En Location</option>
                                <option value="maintenance">🟡 Maintenance</option>
                                <option value="horsService">🔴 Hors Service</option>
                              </select>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(v)}
                                  className="h-7 w-7 p-0 rounded-lg hover:bg-accent/10 hover:text-accent"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditVehicle(v)}
                                  className="h-7 w-7 p-0 rounded-lg hover:bg-accent/10 hover:text-accent"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredVehicles.length === 0 && (
        <motion.div 
          className="text-center py-16 px-4 bg-card/60 backdrop-blur-xl rounded-3xl border border-dashed border-border/60 max-w-lg mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="h-20 w-20 bg-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-border/40">
            <Car className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-1">
            {searchTerm || statusFilter !== 'all' || selectedBrand !== 'all' ? 'Aucun résultat correspondant' : 'Aucun véhicule enregistré'}
          </h3>
          <p className="text-muted-foreground text-xs font-medium mb-6 max-w-xs mx-auto">
            {searchTerm || statusFilter !== 'all' || selectedBrand !== 'all'
              ? "Essayez d'ajuster vos critères de recherche ou de réinitialiser les filtres."
              : "Ajoutez votre premier véhicule pour commencer la gestion de votre flotte."}
          </p>
          {searchTerm || statusFilter !== 'all' || selectedBrand !== 'all' ? (
            <Button 
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setSelectedBrand('all');
                setSelectedFuel('all');
                setSelectedGearbox('all');
              }}
              className="rounded-2xl font-bold text-xs h-11 px-6 border-border/60"
            >
              Effacer tous les filtres
            </Button>
          ) : (
            <Button 
              onClick={() => {
                setEditingVehicle(null);
                setFormDialogOpen(true);
              }}
              className="rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-black px-6 h-11 text-xs shadow-md shadow-accent/20"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Ajouter un premier véhicule
            </Button>
          )}
        </motion.div>
      )}

      {/* Vehicle Form & Details Modals */}
      <VehicleFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) setEditingVehicle(null);
        }}
        onSave={handleAddVehicle}
        vehicle={editingVehicle}
      />

      <VehicleDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        vehicle={selectedVehicle}
        onEdit={handleEditVehicle}
        onDelete={deleteVehicle}
      />

      {/* Fullscreen Table Modal */}
      <Dialog open={isTableFullscreen} onOpenChange={setIsTableFullscreen}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none p-0 gap-0 border-none">
          <DialogTitle className="sr-only">Table des véhicules en plein écran</DialogTitle>
          <DialogDescription className="sr-only">Affichage de la table des véhicules en mode plein écran.</DialogDescription>
          <div className="h-full bg-background p-4 sm:p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-foreground">Tableau de flotte en plein écran</h2>
              <Button size="sm" variant="outline" onClick={() => setIsTableFullscreen(false)} className="rounded-xl font-bold">
                Fermer
              </Button>
            </div>
            <VehicleTable
              vehicles={filteredVehicles}
              onEdit={handleEditVehicle}
              onDelete={deleteVehicle}
              onViewDetails={handleViewDetails}
              getStatusBadge={getStatusBadge}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vehicles;
