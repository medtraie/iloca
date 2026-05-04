import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localStorageService, Vehicle } from "@/services/localStorageService";
import { trackingService } from "@/services/trackingService";
import { gpswoxService, GpswoxDevice } from "@/services/gpswoxService";
import { Loader } from "@googlemaps/js-api-loader";
import { toast } from "@/components/ui/sonner";

export default function Tracking() {
  const [vehicleId, setVehicleId] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [gpsDevices, setGpsDevices] = useState<GpswoxDevice[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [historyPointsCount, setHistoryPointsCount] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const timerRef = useRef<number | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const playbackIndexRef = useRef(0);
  const vehicles = localStorageService.getAll<Vehicle>("vehicles");
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey) return;
    let mounted = true;
    const run = async () => {
      const loader = new Loader({ apiKey, version: "weekly" });
      await loader.importLibrary("maps");
      await loader.importLibrary("marker");
      if (mounted) setReady(true);
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const devices = await gpswoxService.getDevices();
        setGpsDevices(devices);
      } catch {
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const center = { lat: 33.5731, lng: -7.5898 };
    const map = new google.maps.Map(ref.current, { center, zoom: 12, mapId: "DEMO_MAP_ID" });
    mapRef.current = map;
  }, [ready]);

  useEffect(() => {
    if (vehicleId) {
      setHistoryPointsCount(trackingService.getPositions(vehicleId).length);
      refreshPath();
    } else {
      setHistoryPointsCount(0);
    }
  }, [vehicleId]);

  const refreshPath = async () => {
    if (!mapRef.current) return;
    if (!vehicleId) return;
    
    // Stop any ongoing animation
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    setIsPlaying(false);
    playbackIndexRef.current = 0;

    const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
    const plate = selectedVehicle?.immatriculation || selectedVehicle?.registration || "";
    const gpsDevice = gpsDevices.find((device) => device.plate === plate);
    if (gpsDevice) {
      const from = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const to = new Date().toISOString();
      const history = await gpswoxService.getDeviceHistory(gpsDevice.id, from, to);
      if (history.length) {
        trackingService.setPositions(vehicleId, history);
      } else if (gpsDevice.lat && gpsDevice.lng) {
        trackingService.addPosition(vehicleId, {
          lat: gpsDevice.lat,
          lng: gpsDevice.lng,
          speed: gpsDevice.speed,
          timestamp: Date.now()
        });
      }
    }
    const pts = trackingService.getPositions(vehicleId).map((p) => ({ lat: p.lat, lng: p.lng }));
    setHistoryPointsCount(pts.length);
    if (!pts.length) return;
    if (polyRef.current) polyRef.current.setMap(null);
    polyRef.current = new google.maps.Polyline({
      path: pts,
      geodesic: true,
      strokeColor: "#2563EB",
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });
    polyRef.current.setMap(mapRef.current);
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({ position: pts[pts.length - 1] });
      markerRef.current.setMap(mapRef.current);
    } else {
      markerRef.current.setPosition(pts[pts.length - 1]);
    }
    mapRef.current.panTo(pts[pts.length - 1]);
  };

  const playAnimation = () => {
    const pts = trackingService.getPositions(vehicleId).map((p) => ({ lat: p.lat, lng: p.lng }));
    if (!pts.length || !mapRef.current) {
      toast.error("Aucun historique disponible pour l'animation");
      return;
    }

    if (isPlaying) {
      // Pause animation
      setIsPlaying(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    setIsPlaying(true);
    if (playbackIndexRef.current >= pts.length - 1) {
      playbackIndexRef.current = 0; // Restart if at the end
    }

    // Set initial state for traceur effect
    if (polyRef.current) {
      polyRef.current.setPath(pts.slice(0, playbackIndexRef.current + 1));
    }
    if (markerRef.current) {
      markerRef.current.setPosition(pts[playbackIndexRef.current]);
    }
    mapRef.current.panTo(pts[playbackIndexRef.current]);

    playbackTimerRef.current = window.setInterval(() => {
      if (playbackIndexRef.current >= pts.length - 1) {
        setIsPlaying(false);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        return;
      }

      playbackIndexRef.current++;
      const currentPoint = pts[playbackIndexRef.current];

      if (markerRef.current) {
        markerRef.current.setPosition(currentPoint);
      }

      if (polyRef.current) {
        polyRef.current.setPath(pts.slice(0, playbackIndexRef.current + 1));
      }

      if (mapRef.current) {
        mapRef.current.panTo(currentPoint);
      }
    }, 150); // Adjust speed of animation here
  };

  const seedTrip = () => {
    if (!vehicleId) return;
    trackingService.seedDemoPositions(vehicleId);
    toast.success("Trajet démo ajouté");
    void refreshPath();
  };

  const startSim = () => {
    if (!vehicleId) return;
    if (timerRef.current) return;
    timerRef.current = window.setInterval(() => {
      const last = trackingService.lastPosition(vehicleId) || { lat: 33.5731, lng: -7.5898, timestamp: Date.now(), speed: 40 };
      const n = {
        lat: last.lat + (Math.random() - 0.5) * 0.005,
        lng: last.lng + (Math.random() - 0.5) * 0.005,
        timestamp: Date.now(),
        speed: Math.round(30 + Math.random() * 40),
      };
      trackingService.addPosition(vehicleId, n);
      void refreshPath();
    }, 2000);
    toast.success("Suivi en temps réel (simulation) démarré");
  };

  const stopSim = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      toast.success("Suivi arrêté");
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  const syncGps = async () => {
    try {
      setSyncing(true);
      const devices = await gpswoxService.getDevices();
      setGpsDevices(devices);
      await refreshPath();
      toast.success("Tracking GPSwox synchronisé");
    } catch {
      toast.error("Erreur de synchronisation GPSwox");
    } finally {
      setSyncing(false);
    }
  };

  const hasHistory = historyPointsCount > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Suivi des véhicules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select onValueChange={(v) => {
              setVehicleId(v);
              // reset animation state when vehicle changes
              if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
              setIsPlaying(false);
              playbackIndexRef.current = 0;
            }} value={vehicleId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {(v.marque || v.brand || "") + " " + (v.modele || v.model || "")} {v.immatriculation || v.registration || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={seedTrip} disabled={!vehicleId}>
              Trajet démo
            </Button>
            <Button variant="outline" onClick={syncGps} disabled={syncing || !vehicleId}>
              {syncing ? "Sync..." : "Sync GPSwox"}
            </Button>
            <Button onClick={playAnimation} disabled={!vehicleId || !apiKey || !hasHistory} variant={isPlaying ? "destructive" : "default"}>
              {isPlaying ? "Pause Traceur" : "Animer (Traceur)"}
            </Button>
            <Button onClick={startSim} disabled={!vehicleId || !apiKey}>
              Sim. Direct
            </Button>
            <Button variant="destructive" onClick={stopSim}>
              Arrêter Sim.
            </Button>
          </div>
          {!apiKey ? (
            <div className="h-[60vh] flex items-center justify-center text-muted-foreground">Configurer VITE_GOOGLE_MAPS_API_KEY</div>
          ) : (
            <div ref={ref} className="h-[60vh] w-full rounded-lg overflow-hidden bg-muted" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
