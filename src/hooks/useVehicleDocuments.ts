
import { useState, useEffect, useCallback } from "react";
import { localStorageService } from "@/services/localStorageService";

// Mock type for localStorage version
export type VehicleDocument = {
  id: string;
  vehicle_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  expiry_date?: string;
  uploaded_at: string;
};

export const useVehicleDocuments = (vehicleId?: string | null) => {
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    
    try {
      // Mock implementation for localStorage
      const mockDocs: VehicleDocument[] = [];
      setDocs(mockDocs);
      setError(null);
    } catch (error) {
      setError("خطأ أثناء جلب الوثائق");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const addDoc = async (doc: Omit<VehicleDocument, "id" | "uploaded_at">) => {
    // Mock implementation
    const newDoc: VehicleDocument = {
      ...doc,
      id: Date.now().toString(),
      uploaded_at: new Date().toISOString(),
    };
    
    setDocs(prev => [newDoc, ...prev]);
    return { data: newDoc, error: null };
  };

  const deleteDoc = async (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    return { error: null };
  };

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs, vehicleId]);

  return { docs, loading, error, fetchDocs, addDoc, deleteDoc };
};
