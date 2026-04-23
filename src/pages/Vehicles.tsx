
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVehicles } from '@/hooks/useVehicles';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import VehicleFormDialog from '@/components/VehicleFormDialog';
import VehicleDetailsDialog from '@/components/VehicleDetailsDialog';
import { Plus, Search, Car, CheckCircle, Wrench, RefreshCcw, Table2, LayoutGrid, Sparkles, Maximize2 } from 'lucide-react';
import VehicleCard from '@/components/VehicleCard';
import VehicleTable from '@/components/VehicleTable';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';

type VehiclesViewMode = 'cards' | 'table';

const Vehicles = () => {
  const { vehicles, loading, addVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const [searchTerm, setSearchTerm] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage<VehiclesViewMode>('vehicles:view-mode', 'cards');

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

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        const searchString = searchTerm.toLowerCase();
        return (
          (vehicle.marque || vehicle.brand || '').toLowerCase().includes(searchString) ||
          (vehicle.modele || vehicle.model || '').toLowerCase().includes(searchString) ||
          (vehicle.immatriculation || vehicle.registration || '').toLowerCase().includes(searchString)
        );
      }),
    [vehicles, searchTerm]
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'disponible':
        return { label: 'Disponible', variant: 'success', color: 'text-success' };
      case 'loue':
        return { label: 'Loué', variant: 'secondary', color: 'text-blue-500' };
      case 'maintenance':
        return { label: 'Maintenance', variant: 'warning', color: 'text-warning' };
      case 'horsService':
        return { label: 'Hors service', variant: 'destructive', color: 'text-destructive' };
      default:
        return { label: 'Non défini', variant: 'outline', color: 'text-muted-foreground' };
    }
  };

  const handleAddVehicle = async (vehicleData, docUploads) => {
    const result = editingVehicle
      ? await updateVehicle(editingVehicle.id, vehicleData)
      : await addVehicle(vehicleData);

    if (result) {
      setFormDialogOpen(false);
      setEditingVehicle(null);
    }
  };

  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormDialogOpen(true);
  };

  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setDetailsDialogOpen(true);
  };

  const topBrands = useMemo(
    () =>
      Object.entries(
        filteredVehicles.reduce<Record<string, number>>((acc, vehicle) => {
          const brand = (vehicle.marque || vehicle.brand || 'Inconnu').trim();
          acc[brand] = (acc[brand] || 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [filteredVehicles]
  );

  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.etat_vehicule === 'disponible').length,
    rented: vehicles.filter(v => v.etat_vehicule === 'loue').length,
    maintenance: vehicles.filter(v => v.etat_vehicule === 'maintenance').length,
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-accent/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-bold animate-pulse">Chargement de la flotte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 pb-20">
      {/* Header Section */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">
            Gestion de <span className="text-accent">Flotte</span>
          </h1>
          <p className="text-muted-foreground font-medium">Contrôlez et suivez l'état de vos véhicules en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setFormDialogOpen(true)} 
            className="rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-6 py-6 shadow-lg shadow-accent/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Véhicule
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-2xl h-12 w-12 p-0 border-border/50 hover:bg-card"
          >
            <RefreshCcw className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Véhicules", value: stats.total, icon: Car, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Disponibles", value: stats.available, icon: CheckCircle, color: "text-accent", bg: "bg-accent/10" },
          { label: "Loués", value: stats.rented, icon: Car, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Maintenance", value: stats.maintenance, icon: Wrench, color: "text-warning", bg: "bg-warning/10" },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="border-none bg-card shadow-card rounded-[2rem] overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-4 rounded-2xl ${stat.bg} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1 border-none bg-card shadow-card rounded-[2.5rem] p-2">
          <CardContent className="p-2">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors w-5 h-5" />
              <Input
                placeholder="Rechercher par marque, modèle ou immatriculation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 h-16 rounded-[2rem] border-none bg-muted/30 focus-visible:ring-2 focus-visible:ring-accent text-lg font-medium"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-card shadow-card rounded-[2.5rem] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={viewMode === 'cards' ? 'default' : 'outline'} onClick={() => setViewMode('cards')}>
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Cards
            </Button>
            <Button size="sm" variant={viewMode === 'table' ? 'default' : 'outline'} onClick={() => setViewMode('table')}>
              <Table2 className="w-4 h-4 mr-1.5" />
              Table
            </Button>
            {viewMode === 'table' && (
              <Button size="sm" variant="outline" onClick={() => setIsTableFullscreen(true)}>
                <Maximize2 className="w-4 h-4 mr-1.5" />
                Plein écran
              </Button>
            )}
          </div>
          <div className="flex -space-x-2">
            {[
              { m: 'Dacia', mo: 'Logan', p: 250 },
              { m: 'Renault', mo: 'Clio', p: 300 },
              { m: 'Peugeot', mo: '208', p: 320 },
            ].map((car, idx) => (
              <button
                key={idx}
                onClick={async () => {
                  const newVehicle = {
                    brand: car.m, marque: car.m, model: car.mo, modele: car.mo,
                    prix_par_jour: car.p, type_carburant: 'Essence',
                    boite_vitesse: 'Manuelle', kilometrage: 0, couleur: 'Blanc',
                    etat_vehicule: 'disponible', km_depart: 0, documents: [], photos: [],
                  };
                  await addVehicle(newVehicle);
                }}
                className="h-12 px-4 rounded-full bg-muted/50 border border-border/50 hover:bg-accent hover:text-accent-foreground hover:z-10 transition-all font-bold text-xs"
                title={`Ajouter ${car.m} ${car.mo}`}
              >
                + {car.m}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ajout Rapide</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card
          className="xl:col-span-2 border-none bg-card shadow-card rounded-[2.5rem] p-4 sm:p-5"
          onDoubleClick={() => {
            if (viewMode === 'table') setIsTableFullscreen(true);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Affichage {viewMode === 'cards' ? 'Cards' : 'Table'}</p>
            <Badge variant="secondary" className="font-bold">{filteredVehicles.length} véhicule{filteredVehicles.length > 1 ? 's' : ''}</Badge>
          </div>
          <AnimatePresence mode="wait">
            {viewMode === 'cards' ? (
              <motion.div
                key="vehicles-cards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {filteredVehicles.map((vehicle, idx) => (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{ y: -4 }}
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
            ) : (
              <motion.div
                key="vehicles-table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
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
          </AnimatePresence>
        </Card>

        <Card className="border-none bg-card shadow-card rounded-[2.5rem] p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Insights flotte
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Top marques</p>
              {topBrands.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune marque filtrée.</p>
              ) : (
                topBrands.map(([brand, count], index) => (
                  <motion.div
                    key={brand}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2"
                  >
                    <span className="text-sm font-semibold">{brand}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </motion.div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Filtre actuel</p>
              <p className="text-sm text-foreground font-medium">
                {searchTerm ? `Recherche: "${searchTerm}"` : "Tous les véhicules"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredVehicles.length === 0 && (
        <motion.div 
          className="text-center py-20 bg-card rounded-[3rem] border-2 border-dashed border-border/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Car className="w-12 h-12 text-muted-foreground/20" />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-2">
            {searchTerm ? 'Aucun résultat' : 'La flotte est vide'}
          </h3>
          <p className="text-muted-foreground font-medium mb-8 max-w-md mx-auto">
            {searchTerm 
              ? `Nous n'avons trouvé aucun véhicule correspondant à "${searchTerm}"`
              : "Commencez par ajouter votre premier véhicule pour gérer votre flotte de location."
            }
          </p>
          {!searchTerm && (
            <Button 
              onClick={() => setFormDialogOpen(true)}
              className="rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8 py-6 h-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter mon premier véhicule
            </Button>
          )}
        </motion.div>
      )}

      {/* Dialogs */}
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

      <Dialog open={isTableFullscreen} onOpenChange={setIsTableFullscreen}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none p-0 gap-0 border-none">
          <DialogTitle className="sr-only">Table des véhicules en plein écran</DialogTitle>
          <DialogDescription className="sr-only">Affichage détaillé de la table des véhicules en mode plein écran.</DialogDescription>
          <div className="h-full bg-background p-4 md:p-6 overflow-auto">
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
