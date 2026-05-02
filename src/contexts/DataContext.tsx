import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { demoMaterials, demoProducts, demoStores, demoVendors } from '../lib/demoData';

interface DataContextType {
  materials: any[];
  products: any[];
  vendors: any[];
  stores: any[];
  batches: any[];
  ledger: any[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  refreshMaterials: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshVendors: () => Promise<void>;
  refreshStores: () => Promise<void>;
  refreshBatches: () => Promise<void>;
  refreshLedger: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  const refreshMaterials = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('raw_materials')
        .select(`
          *,
          central_stock:central_stock(quantity),
          store_stock:store_stock(store_id, quantity)
        `)
        .order('name');
      if (data) setMaterials(data);
      if (!data || data.length === 0) setMaterials(demoMaterials);
    } catch (e) {
      console.error('Failed to refresh materials', e);
      setMaterials(demoMaterials);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('finished_products')
        .select('*')
        .order('name');
      if (data) setProducts(data);
      if (!data || data.length === 0) setProducts(demoProducts);
    } catch (e) {
      console.error('Failed to refresh products', e);
      setProducts(demoProducts);
    }
  }, []);

  const refreshVendors = useCallback(async () => {
    try {
      const { data } = await supabase.from('vendors').select('*').order('name');
      if (data) setVendors(data);
      if (!data || data.length === 0) setVendors(demoVendors);
    } catch (e) {
      console.error('Failed to refresh vendors', e);
      setVendors(demoVendors);
    }
  }, []);

  const refreshStores = useCallback(async () => {
    try {
      const { data } = await supabase.from('stores').select('*').order('name');
      if (data) setStores(data);
      if (!data || data.length === 0) setStores(demoStores);
    } catch (e) {
      console.error('Failed to refresh stores', e);
      setStores(demoStores);
    }
  }, []);

  const refreshBatches = useCallback(async () => {
    try {
      const { data } = await supabase.from('material_batches').select('*').order('created_at', { ascending: false });
      if (data) setBatches(data);
      // Fallback to demo if needed
    } catch (e) {
      console.error('Failed to refresh batches', e);
    }
  }, []);

  const refreshLedger = useCallback(async () => {
    try {
      const { data } = await supabase.from('vendor_ledger').select('*').order('created_at', { ascending: false });
      if (data) setLedger(data);
    } catch (e) {
      console.error('Failed to refresh ledger', e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([
        refreshMaterials(),
        refreshProducts(),
        refreshVendors(),
        refreshStores(),
        refreshBatches(),
        refreshLedger()
      ]);
      setHasLoadedInitial(true);
    } finally {
      setLoading(false);
    }
  }, [user, refreshMaterials, refreshProducts, refreshVendors, refreshStores, refreshBatches, refreshLedger]);

  useEffect(() => {
    if (user && !hasLoadedInitial) {
      refreshAll();
    } else if (!user) {
      setMaterials([]);
      setProducts([]);
      setVendors([]);
      setStores([]);
      setBatches([]);
      setLedger([]);
      setHasLoadedInitial(false);
    }
  }, [user, hasLoadedInitial, refreshAll]);

  return (
    <DataContext.Provider value={{
      materials,
      products,
      vendors,
      stores,
      batches,
      ledger,
      loading,
      refreshAll,
      refreshMaterials,
      refreshProducts,
      refreshVendors,
      refreshStores,
      refreshBatches,
      refreshLedger
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
