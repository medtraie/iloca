import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  User, Phone, MapPin, CreditCard, Car, Globe, Calendar, FileText, 
  MessageSquare, ShieldCheck, Download, ZoomIn, Copy, Check, 
  Award, TrendingUp, Sparkles, Clock, AlertCircle, X, Edit3, ExternalLink
} from "lucide-react";
import { Tenant } from "@/types/appData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";

interface Contract {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerNationalId?: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  dailyRate?: number;
  totalAmount: string;
  status: string;
  statusColor: string;
  notes?: string;
}

interface TenantDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onEdit?: (tenant: Tenant) => void;
}

export const TenantDetailsDialog: React.FC<TenantDetailsDialogProps> = ({ 
  isOpen, 
  onClose, 
  tenant,
  onEdit 
}) => {
  const [contracts] = useLocalStorage<Contract[]>("contracts", []);
  const [activeTab, setActiveTab] = useState("identity");
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  if (!tenant) return null;

  const nomComplet = `${tenant.prenom || ""} ${tenant.nom || ""}`.trim() || "Client sans nom";
  const initials = `${(tenant.prenom?.[0] || "").toUpperCase()}${(tenant.nom?.[0] || "").toUpperCase()}` || "CL";
  const rawPhone = (tenant.telephone || "").replace(/[^0-9+]/g, "");

  const getWhatsAppNumber = (phoneStr: string) => {
    let clean = phoneStr.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "212" + clean.substring(1);
    }
    return clean;
  };
  const waNumber = getWhatsAppNumber(rawPhone);

  // Match tenant contracts
  const tenantContracts = contracts.filter(contract => 
    contract.customerNationalId === tenant.cin ||
    contract.customerName === `${tenant.prenom} ${tenant.nom}` ||
    contract.customerPhone === tenant.telephone
  );

  const activeContract = tenantContracts.find(c => c.status === "Actif");

  // Calculate CRM Telemetry & LTV
  const totalRevenue = tenantContracts.reduce((sum, c) => {
    const raw = parseFloat((c.totalAmount || "0").replace(/[^0-9.-]/g, ""));
    return sum + (isNaN(raw) ? 0 : raw);
  }, 0);

  const getLoyaltyTier = (count: number) => {
    if (count >= 10) return { label: "Client VIP Diamond", tier: "VIP", color: "from-amber-500 to-orange-500", text: "text-amber-500", bg: "bg-amber-500/15 border-amber-500/30", nextTierCount: 15 };
    if (count >= 5) return { label: "Client Gold", tier: "Gold", color: "from-yellow-400 to-amber-500", text: "text-yellow-500", bg: "bg-yellow-500/15 border-yellow-500/30", nextTierCount: 10 };
    if (count >= 2) return { label: "Client Régulier Silver", tier: "Silver", color: "from-blue-400 to-indigo-500", text: "text-blue-500", bg: "bg-blue-500/15 border-blue-500/30", nextTierCount: 5 };
    return { label: "Nouveau Client", tier: "Bronze", color: "from-slate-400 to-zinc-500", text: "text-muted-foreground", bg: "bg-muted border-border/40", nextTierCount: 2 };
  };

  const loyalty = getLoyaltyTier(tenantContracts.length);

  // Age calculation helper
  const calculateAge = (dateString?: string) => {
    if (!dateString) return null;
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const copyToClipboard = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({
      title: "Copié !",
      description: `${label} (${text}) a été copié dans le presse-papier.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Actif":
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">Actif</Badge>;
      case "Terminé":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold">Terminé</Badge>;
      case "À venir":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">À venir</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card to-background shadow-2xl">
          
          {/* Top Hero Passport Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-card border-b border-border/50 p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Profile Header & Info */}
              <div className="flex items-start sm:items-center gap-4">
                <div className="relative">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-accent/25 via-accent/10 to-primary/10 border-2 border-accent/40 text-accent font-black text-2xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                    {tenant.tenantImageUrl ? (
                      <img src={tenant.tenantImageUrl} alt={nomComplet} className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  {activeContract && (
                    <span 
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-3 border-background shadow-md"
                      title="En location active" 
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${loyalty.bg}`}>
                      👑 {loyalty.label}
                    </span>
                    <Badge className={tenant.type === "Locataire Principal" ? "bg-accent/15 text-accent border-accent/30 font-bold" : "bg-muted text-muted-foreground font-bold"}>
                      {tenant.type}
                    </Badge>
                    {activeContract && (
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold animate-pulse">
                        <Car className="w-3 h-3 mr-1" /> En location
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    {nomComplet}
                  </h2>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-accent" />
                      {tenant.nationalite || "Marocaine"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <CreditCard className="w-3.5 h-3.5 text-accent" />
                      CIN: <span className="font-bold text-foreground">{tenant.cin || "N/A"}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      Ajouté le {new Date(tenant.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Direct Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {rawPhone && (
                  <>
                    <a
                      href={`tel:${rawPhone}`}
                      className="flex items-center gap-2 px-4 h-11 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5 text-accent" />
                      <span>Appeler</span>
                    </a>

                    <a
                      href={`https://wa.me/${waNumber}?text=Bonjour%20${encodeURIComponent(tenant.prenom || '')},`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 h-11 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </>
                )}

                {onEdit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onEdit(tenant);
                    }}
                    className="h-11 px-4 rounded-2xl border-border/60 hover:bg-accent/10 hover:text-accent font-bold text-xs gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Dialog Body Tabs */}
          <div className="p-6 sm:p-8">
            <Tabs defaultValue="identity" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 p-1.5 rounded-2xl bg-muted/50 border border-border/40 h-auto">
                <TabsTrigger value="identity" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <User className="w-3.5 h-3.5" />
                  Identité & Coordonnées
                </TabsTrigger>
                <TabsTrigger value="documents" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Scans & Documents
                </TabsTrigger>
                <TabsTrigger value="contracts" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Car className="w-3.5 h-3.5" />
                  Contrats ({tenantContracts.length})
                </TabsTrigger>
                <TabsTrigger value="crm" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Award className="w-3.5 h-3.5" />
                  Score & Fidélité
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: IDENTITÉ & COORDONNÉES */}
              <TabsContent value="identity" className="space-y-6 animate-in fade-in-50 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Nom & Prénom Card */}
                  <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-black uppercase tracking-wider">Identité Client</span>
                        <User className="w-4 h-4 text-accent" />
                      </div>
                      <p className="text-lg font-black text-foreground">{nomComplet}</p>
                      <p className="text-xs text-muted-foreground">ID Système: <span className="font-mono text-foreground font-semibold">{tenant.id}</span></p>
                    </CardContent>
                  </Card>

                  {/* Téléphone Card */}
                  <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-black uppercase tracking-wider">Téléphone Direct</span>
                        <Phone className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-black font-mono text-foreground">{tenant.telephone || "Non renseigné"}</p>
                        {tenant.telephone && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(tenant.telephone, "Numéro de téléphone", "phone")}
                            className="h-7 w-7 p-0 rounded-lg"
                          >
                            {copiedKey === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Compatible WhatsApp & SMS</p>
                    </CardContent>
                  </Card>

                  {/* Date de Naissance & Âge */}
                  <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-black uppercase tracking-wider">Date de Naissance</span>
                        <Calendar className="w-4 h-4 text-accent" />
                      </div>
                      <p className="text-base font-bold text-foreground">
                        {tenant.dateNaissance ? new Date(tenant.dateNaissance).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : "Non renseignée"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Âge: <span className="font-bold text-foreground">{calculateAge(tenant.dateNaissance) ? `${calculateAge(tenant.dateNaissance)} ans` : "—"}</span>
                      </p>
                    </CardContent>
                  </Card>

                  {/* CIN Card */}
                  <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-black uppercase tracking-wider">Carte Nationale (CIN)</span>
                        <CreditCard className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-black font-mono text-foreground">{tenant.cin || "Non renseigné"}</p>
                        {tenant.cin && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(tenant.cin, "Numéro CIN", "cin")}
                            className="h-7 w-7 p-0 rounded-lg"
                          >
                            {copiedKey === "cin" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Délivrée le: <span className="font-semibold text-foreground">{tenant.dateCin ? new Date(tenant.dateCin).toLocaleDateString("fr-FR") : "Non précisée"}</span>
                      </p>
                    </CardContent>
                  </Card>

                  {/* Permis de Conduire Card */}
                  <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-black uppercase tracking-wider">Permis de Conduire</span>
                        <Car className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-black font-mono text-foreground">{tenant.permis || "Non renseigné"}</p>
                        {tenant.permis && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(tenant.permis, "Numéro de Permis", "permis")}
                            className="h-7 w-7 p-0 rounded-lg"
                          >
                            {copiedKey === "permis" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Délivré le: <span className="font-semibold text-foreground">{tenant.datePermis ? new Date(tenant.datePermis).toLocaleDateString("fr-FR") : "Non précisée"}</span>
                      </p>
                    </CardContent>
                  </Card>

                  {/* Passeport Card */}
                  <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-black uppercase tracking-wider">Numéro Passeport</span>
                        <Globe className="w-4 h-4 text-accent" />
                      </div>
                      <p className="text-base font-black font-mono text-foreground">{tenant.passeport || "Aucun passeport associé"}</p>
                      <p className="text-xs text-muted-foreground">Nationalité: <span className="font-semibold text-foreground">{tenant.nationalite}</span></p>
                    </CardContent>
                  </Card>

                  {/* Adresse Complète (Span 3) */}
                  <Card className="md:col-span-2 lg:col-span-3 rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[10px] font-black uppercase tracking-wider">Adresse de Résidence</span>
                        <MapPin className="w-4 h-4 text-accent" />
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-relaxed">
                        {tenant.adresse || "Aucune adresse physique enregistrée pour ce locataire."}
                      </p>
                    </CardContent>
                  </Card>

                </div>
              </TabsContent>

              {/* TAB 2: SCANS NUMÉRIQUES & DOCUMENTS LIGHTBOX */}
              <TabsContent value="documents" className="space-y-6 animate-in fade-in-50 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Photo d'identité */}
                  <Card className="rounded-2xl border-border/50 overflow-hidden bg-card/60 flex flex-col">
                    <div className="p-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Photo d'Identité</span>
                      {tenant.tenantImageUrl ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">Numérisée</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Absente</Badge>
                      )}
                    </div>
                    <div className="h-44 bg-muted/30 flex items-center justify-center p-3 relative group overflow-hidden">
                      {tenant.tenantImageUrl ? (
                        <>
                          <img src={tenant.tenantImageUrl} alt="Photo Profil" className="w-full h-full object-cover rounded-xl" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="rounded-xl h-8 text-xs font-bold"
                              onClick={() => setLightboxImage({ url: tenant.tenantImageUrl!, title: "Photo d'identité" })}
                            >
                              <ZoomIn className="w-3.5 h-3.5 mr-1" /> Agrandir
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 text-muted-foreground">
                          <User className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <span className="text-xs">Aucun portrait</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Scan CIN */}
                  <Card className="rounded-2xl border-border/50 overflow-hidden bg-card/60 flex flex-col">
                    <div className="p-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Scan CIN</span>
                      {tenant.cinImageUrl ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">Vérifié</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Non scanné</Badge>
                      )}
                    </div>
                    <div className="h-44 bg-muted/30 flex items-center justify-center p-3 relative group overflow-hidden">
                      {tenant.cinImageUrl ? (
                        <>
                          <img src={tenant.cinImageUrl} alt="Scan CIN" className="w-full h-full object-contain rounded-xl" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="rounded-xl h-8 text-xs font-bold"
                              onClick={() => setLightboxImage({ url: tenant.cinImageUrl!, title: "Carte Nationale d'Identité" })}
                            >
                              <ZoomIn className="w-3.5 h-3.5 mr-1" /> Agrandir
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 text-muted-foreground">
                          <CreditCard className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <span className="text-xs">Aucun scan CIN</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Scan Permis */}
                  <Card className="rounded-2xl border-border/50 overflow-hidden bg-card/60 flex flex-col">
                    <div className="p-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Scan Permis</span>
                      {tenant.permisImageUrl ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">Vérifié</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Non scanné</Badge>
                      )}
                    </div>
                    <div className="h-44 bg-muted/30 flex items-center justify-center p-3 relative group overflow-hidden">
                      {tenant.permisImageUrl ? (
                        <>
                          <img src={tenant.permisImageUrl} alt="Scan Permis" className="w-full h-full object-contain rounded-xl" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="rounded-xl h-8 text-xs font-bold"
                              onClick={() => setLightboxImage({ url: tenant.permisImageUrl!, title: "Permis de Conduire" })}
                            >
                              <ZoomIn className="w-3.5 h-3.5 mr-1" /> Agrandir
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 text-muted-foreground">
                          <Car className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <span className="text-xs">Aucun scan Permis</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Scan Passeport */}
                  <Card className="rounded-2xl border-border/50 overflow-hidden bg-card/60 flex flex-col">
                    <div className="p-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Scan Passeport</span>
                      {tenant.passeportImageUrl ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">Vérifié</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Non scanné</Badge>
                      )}
                    </div>
                    <div className="h-44 bg-muted/30 flex items-center justify-center p-3 relative group overflow-hidden">
                      {tenant.passeportImageUrl ? (
                        <>
                          <img src={tenant.passeportImageUrl} alt="Scan Passeport" className="w-full h-full object-contain rounded-xl" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="rounded-xl h-8 text-xs font-bold"
                              onClick={() => setLightboxImage({ url: tenant.passeportImageUrl!, title: "Passeport International" })}
                            >
                              <ZoomIn className="w-3.5 h-3.5 mr-1" /> Agrandir
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4 text-muted-foreground">
                          <Globe className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <span className="text-xs">Aucun scan Passeport</span>
                        </div>
                      )}
                    </div>
                  </Card>

                </div>
              </TabsContent>

              {/* TAB 3: HISTORIQUE CONTRATS & FLOTTE */}
              <TabsContent value="contracts" className="space-y-4 animate-in fade-in-50 duration-300">
                {tenantContracts.length > 0 ? (
                  <div className="rounded-2xl border border-border/50 overflow-hidden bg-card/60">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="font-bold text-xs uppercase">N° Contrat</TableHead>
                          <TableHead className="font-bold text-xs uppercase">Véhicule</TableHead>
                          <TableHead className="font-bold text-xs uppercase">Début</TableHead>
                          <TableHead className="font-bold text-xs uppercase">Fin</TableHead>
                          <TableHead className="font-bold text-xs uppercase">Montant Total</TableHead>
                          <TableHead className="font-bold text-xs uppercase">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantContracts.map((contract) => (
                          <TableRow key={contract.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono font-bold text-xs">{contract.id}</TableCell>
                            <TableCell className="font-bold text-foreground flex items-center gap-2">
                              <Car className="w-3.5 h-3.5 text-accent" />
                              {contract.vehicle}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(contract.startDate).toLocaleDateString("fr-FR")}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(contract.endDate).toLocaleDateString("fr-FR")}</TableCell>
                            <TableCell className="font-mono font-black text-sm text-foreground">{contract.totalAmount}</TableCell>
                            <TableCell>{getStatusBadge(contract.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-14 rounded-2xl border border-dashed border-border/60 bg-muted/10 space-y-3">
                    <Car className="w-12 h-12 mx-auto text-muted-foreground/40" />
                    <p className="font-bold text-foreground">Aucun contrat associé</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Ce locataire n'a pas encore de contrat de location actif ou archivé dans le système.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* TAB 4: CRM INTELLIGENCE & SCORE DE FIDÉLITÉ */}
              <TabsContent value="crm" className="space-y-6 animate-in fade-in-50 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* LTV Metric */}
                  <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-emerald-500/10 via-card to-card">
                    <CardContent className="p-5 space-y-1">
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Chiffre d'affaires LTV</span>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-black text-foreground font-mono mt-1">
                        {totalRevenue.toLocaleString("fr-FR")} <span className="text-xs font-normal text-muted-foreground">MAD</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Dépenses cumulées sur l'ensemble des contrats</p>
                    </CardContent>
                  </Card>

                  {/* Total Rentals */}
                  <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-blue-500/10 via-card to-card">
                    <CardContent className="p-5 space-y-1">
                      <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Contrats Réalisés</span>
                        <Car className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-black text-foreground font-mono mt-1">
                        {tenantContracts.length} <span className="text-xs font-normal text-muted-foreground">locations</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Fréquence de location et fiabilité</p>
                    </CardContent>
                  </Card>

                  {/* Loyalty Tier Card */}
                  <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-amber-500/10 via-card to-card">
                    <CardContent className="p-5 space-y-1">
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Niveau de Fidélité</span>
                        <Award className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-black text-foreground mt-1">
                        {loyalty.tier}
                      </p>
                      <p className="text-xs text-muted-foreground">Avantages prioritaires et remises de flotte</p>
                    </CardContent>
                  </Card>

                </div>

                {/* VIP Progression Bar */}
                <Card className="rounded-2xl border-border/50 bg-card/60 p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Progression Programme Privilège 2026</h4>
                      <p className="text-xs text-muted-foreground">Seuil vers le palier supérieur ({loyalty.nextTierCount} contrats)</p>
                    </div>
                    <span className="font-mono font-bold text-sm text-accent">
                      {tenantContracts.length} / {loyalty.nextTierCount}
                    </span>
                  </div>
                  <div className="w-full bg-muted/60 h-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-accent to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (tenantContracts.length / loyalty.nextTierCount) * 100)}%` }}
                    />
                  </div>
                </Card>
              </TabsContent>

            </Tabs>
          </div>

          {/* Footer Toolbar */}
          <div className="p-5 bg-muted/30 border-t border-border/50 flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">
              Fiche client synchronisée en temps réel
            </p>
            <Button variant="default" onClick={onClose} className="px-6 rounded-2xl font-bold bg-foreground text-background hover:bg-foreground/90">
              Fermer le dossier
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* LIGHTBOX MODAL FOR ZOOMING SCANS */}
      {lightboxImage && (
        <Dialog open={Boolean(lightboxImage)} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl p-2 bg-black/90 border-none rounded-3xl overflow-hidden">
            <div className="relative p-2 flex flex-col items-center">
              <div className="flex items-center justify-between w-full px-4 py-2 text-white">
                <span className="font-bold text-sm">{lightboxImage.title}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLightboxImage(null)}
                  className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.title} 
                className="max-h-[75vh] w-auto rounded-2xl object-contain shadow-2xl" 
              />
              <div className="pt-3 pb-1">
                <a 
                  href={lightboxImage.url} 
                  download={`document_${tenant.cin || 'client'}.png`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger l'original
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default TenantDetailsDialog;
