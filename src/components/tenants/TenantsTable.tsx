
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Edit, Trash2, Phone, MapPin, CreditCard, Globe, CalendarClock } from "lucide-react";
import { Tenant } from "@/pages/Customers";
import { EnhancedTable } from "@/components/enhanced/EnhancedTable";

interface Props {
  tenants: Tenant[];
  onView: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  searchTerm: string;
  expanded?: boolean;
  tableHeightClass?: string;
}

export default function TenantsTable({
  tenants,
  onView,
  onEdit,
  onDelete,
  searchTerm,
  expanded = false,
  tableHeightClass
}: Props) {
  const getTenantAddress = (tenant: Tenant) => {
    const legacyAddress = (tenant as Tenant & { address?: string }).address;
    const resolvedAddress = tenant.adresse || legacyAddress || "";
    return resolvedAddress.trim();
  };

  const columns = [
    {
      key: 'nom',
      label: 'Locataire',
      sortable: true,
      render: (tenant: Tenant) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent/15 text-accent flex items-center justify-center font-black text-xs">
            {`${tenant.prenom?.[0] || ""}${tenant.nom?.[0] || ""}`}
          </div>
          <div>
            <p className="font-semibold text-foreground leading-none">{tenant.prenom} {tenant.nom}</p>
            <p className="text-xs text-muted-foreground mt-1">{tenant.id}</p>
          </div>
        </div>
      )
    },
    {
      key: 'telephone',
      label: 'Téléphone',
      sortable: true,
      render: (tenant: Tenant) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{tenant.telephone}</span>
        </div>
      )
    },
    {
      key: 'adresse',
      label: 'Adresse',
      sortable: true,
      className: "min-w-[230px]",
      render: (tenant: Tenant) => {
        const address = getTenantAddress(tenant);
        return (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm whitespace-normal break-words leading-snug">
              {address || "—"}
            </span>
          </div>
        );
      }
    },
    {
      key: 'cin',
      label: 'CIN',
      sortable: true,
      render: (tenant: Tenant) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{tenant.cin}</span>
        </div>
      )
    },
    {
      key: 'permis',
      label: 'Permis',
      sortable: true,
      render: (tenant: Tenant) => (
        <span className="font-mono text-sm">{tenant.permis}</span>
      )
    },
    {
      key: 'nationalite',
      label: 'Nationalité',
      sortable: true,
      render: (tenant: Tenant) => (
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>{tenant.nationalite}</span>
        </div>
      )
    },
    {
      key: 'updatedAt',
      label: 'Dernière MAJ',
      sortable: true,
      render: (tenant: Tenant) => (
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{tenant.updatedAt}</span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (tenant: Tenant) => (
        <Badge className={`font-medium ${
          tenant.type === "Locataire Principal"
            ? "bg-card-blue-bg text-card-blue border-transparent"
            : "bg-card-orange-bg text-card-orange border-transparent"
        }`}>
          {tenant.type}
        </Badge>
      )
    },
  ];

  const renderActions = (tenant: Tenant) => (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        title="Voir détails"
        onClick={() => onView(tenant)}
        className="h-8 w-8 p-0 rounded-lg hover:bg-card-blue-bg hover:text-card-blue"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title="Modifier"
        onClick={() => onEdit(tenant)}
        className="h-8 w-8 p-0 rounded-lg hover:bg-card-green-bg hover:text-card-green"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg text-card-red hover:text-card-red hover:bg-card-red-bg"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le locataire {tenant.prenom} {tenant.nom} ? 
              Cette action est irréversible et supprimera toutes les données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(tenant.id)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <EnhancedTable
      data={tenants}
      columns={columns}
      title="Liste des locataires"
      description={`${tenants.length} locataire${tenants.length > 1 ? 's' : ''} enregistré${tenants.length > 1 ? 's' : ''}`}
      searchPlaceholder="Rechercher par nom, téléphone, CIN, permis..."
      actions={renderActions}
      emptyMessage={
        searchTerm 
          ? "Aucun locataire ne correspond à votre recherche. Essayez de modifier vos critères."
          : "Aucun locataire enregistré. Commencez par ajouter votre premier locataire."
      }
      className="rounded-[1.5rem]"
      tableHeightClass={tableHeightClass ?? (expanded ? "h-[72vh] md:h-[78vh]" : "h-[60vh] md:h-[600px]")}
      defaultItemsPerPage={25}
      itemsPerPageOptions={[10, 25, 50]}
    />
  );
}
