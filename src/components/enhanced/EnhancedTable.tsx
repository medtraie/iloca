import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown, Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface EnhancedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  itemsPerPageOptions?: number[];
  defaultItemsPerPage?: number;
  actions?: (item: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  filterable?: boolean;
  className?: string;
  tableHeightClass?: string;
}

export function EnhancedTable<T extends { id: string | number }>({
  data,
  columns,
  title,
  description,
  searchPlaceholder = "Rechercher...",
  onSearch,
  itemsPerPageOptions = [10, 25, 50, 100],
  defaultItemsPerPage = 25,
  actions,
  loading = false,
  emptyMessage = "Aucune donnée disponible",
  searchable = true,
  filterable = false,
  className = "",
  tableHeightClass = "h-[60vh] md:h-[600px]"
}: EnhancedTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

  // Filtrage et tri des données
  const processedData = useMemo(() => {
    let filtered = data;

    // Filtrage par recherche
    if (searchTerm && searchable) {
      filtered = data.filter(item =>
        columns.some(column => {
          const value = item[column.key as keyof T];
          return value && String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Tri
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn as keyof T];
        const bValue = b[sortColumn as keyof T];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, columns, searchable]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    if (onSearch) {
      onSearch(value);
    }
  };

  if (loading) {
    return (
      <Card className={cn("border-none shadow-card bg-card/50 backdrop-blur-sm rounded-[var(--radius)] overflow-hidden", className)}>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Chargement des données...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className={cn("border-none shadow-card bg-card/50 backdrop-blur-sm rounded-[var(--radius)] overflow-hidden", className)}>
        {(title || description) && (
          <CardHeader className="p-8 border-b-2 border-muted/30">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-6 w-1.5 bg-primary rounded-full" />
              {title && <CardTitle className="text-xl font-black uppercase tracking-tight">{title}</CardTitle>}
            </div>
            {description && <p className="text-sm font-medium text-muted-foreground ml-4">{description}</p>}
          </CardHeader>
        )}
        
        <CardContent className="p-0">
          {/* Barre de recherche et contrôles */}
          <div className="p-6 border-b-2 border-muted/20 bg-muted/5">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
              {searchable && (
                <div className="relative flex-1 max-w-md group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors group-focus-within:text-primary" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-11 h-12 bg-background/50 border-2 border-transparent focus:border-primary/30 focus:bg-background transition-all rounded-xl font-medium"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-4 w-full lg:w-auto">
                {filterable && (
                  <Button variant="outline" size="sm" className="h-12 px-5 rounded-xl border-2 font-bold uppercase tracking-wider text-[10px]">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filtres
                  </Button>
                )}
                
                <div className="flex items-center gap-3 bg-muted/20 px-4 py-2 rounded-xl ml-auto lg:ml-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Afficher</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8 border-none bg-transparent font-bold text-sm focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {itemsPerPageOptions.map(option => (
                        <SelectItem key={option} value={option.toString()} className="font-bold">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau */}
          <ScrollArea className={tableHeightClass}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-muted/30 bg-muted/10 hover:bg-muted/10">
                    {columns.map((column, index) => (
                      <TableHead
                        key={index}
                        className={cn(
                          "px-6 py-5 h-auto font-black text-[11px] uppercase tracking-widest text-muted-foreground transition-colors",
                          column.className,
                          column.sortable && "cursor-pointer hover:text-foreground select-none"
                        )}
                        onClick={() => column.sortable && handleSort(String(column.key))}
                      >
                        <div className="flex items-center gap-2">
                          {column.label}
                          {column.sortable && (
                            <div className="flex flex-col opacity-50 group-hover:opacity-100 transition-opacity">
                              <ChevronUp 
                                className={cn("h-3 w-3", 
                                  sortColumn === column.key && sortDirection === 'asc' ? "text-primary opacity-100" : "text-muted-foreground"
                                )} 
                              />
                              <ChevronDown 
                                className={cn("h-3 w-3 -mt-1", 
                                  sortColumn === column.key && sortDirection === 'desc' ? "text-primary opacity-100" : "text-muted-foreground"
                                )} 
                              />
                            </div>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    {actions && (
                      <TableHead className="px-6 py-5 h-auto font-black text-[11px] uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell 
                          colSpan={columns.length + (actions ? 1 : 0)} 
                          className="text-center py-20"
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-3"
                          >
                            <div className="p-4 bg-muted/20 rounded-full">
                              <Search className="h-8 w-8 text-muted-foreground opacity-20" />
                            </div>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{emptyMessage}</p>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={cn(
                            "group transition-all duration-200 border-b border-muted/10 hover:bg-primary/5",
                            index % 2 === 0 ? 'bg-background/30' : 'bg-muted/5'
                          )}
                        >
                          {columns.map((column, colIndex) => (
                            <TableCell key={colIndex} className={cn("px-6 py-5 text-sm font-medium", column.className)}>
                              {column.render 
                                ? column.render(item) 
                                : <span className="text-foreground/80 group-hover:text-foreground transition-colors">{String(item[column.key as keyof T] || '')}</span>
                              }
                            </TableCell>
                          ))}
                          {actions && (
                            <TableCell className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {actions(item)}
                              </div>
                            </TableCell>
                          )}
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 border-t-2 border-muted/30 bg-muted/5 gap-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground order-2 sm:order-1">
                Affichage de <span className="text-foreground">{startIndex + 1}</span> à <span className="text-foreground">{Math.min(startIndex + itemsPerPage, processedData.length)}</span> sur <span className="text-foreground">{processedData.length}</span> résultats
              </div>
              <div className="flex items-center gap-3 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-10 w-10 rounded-xl border-2 transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/20 rounded-xl">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber: number;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={cn(
                          "h-8 min-w-[32px] rounded-lg font-black text-xs transition-all",
                          currentPage === pageNumber 
                            ? "bg-primary text-primary-foreground shadow-md scale-110" 
                            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-10 w-10 rounded-xl border-2 transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-20"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
