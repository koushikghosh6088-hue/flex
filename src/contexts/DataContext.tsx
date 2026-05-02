import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  
  const cacheRef = useRef<Record<string, number>>({});

  const shouldFetch = (key: string) => {
    const now = Date.now();
    if (!cacheRef.current[key] || (now - cacheRef.current[key] > 30000)) { // 30s cache
      cacheRef.current[key] = now;
      return true;
    }
    return false;
  };

  const refreshMaterials = useCallback(async (force = false) => {
    if (!force && !shouldFetch('materials')) return;
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
    } catch (e) {
      console.error('Failed to refresh materials', e);
    }
  }, []);

  const refreshProducts = useCallback(async (force = false) => {
    if (!force && !shouldFetch('products')) return;
    try {
      const { data } = await supabase.from('finished_products').select('*').order('name');
      if (data) setProducts(data);
    } catch (e) {
      console.error('Failed to refresh products', e);
    }
  }, []);

  const refreshVendors = useCallback(async (force = false) => {
    if (!force && !shouldFetch('vendors')) return;
    try {
      const { data } = await supabase.from('vendors').select('*').order('name');
      if (data) setVendors(data);
    } catch (e) {
      console.error('Failed to refresh vendors', e);
    }
  }, []);

  const refreshStores = useCallback(async (force = false) => {
    if (!force && !shouldFetch('stores')) return;
    try {
      const { data } = await supabase.from('stores').select('*').order('name');
      if (data) setStores(data);
    } catch (e) {
      console.error('Failed to refresh stores', e);
    }
  }, []);

  const refreshBatches = useCallback(async (force = false) => {
    if (!force && !shouldFetch('batches')) return;
    try {
      const { data } = await supabase.from('material_batches').select('*').order('created_at', { ascending: false });
      if (data) setBatches(data);
    } catch (e) {
      console.error('Failed to refresh batches', e);
    }
  }, []);

  const refreshLedger = useCallback(async (force = false) => {
    if (!force && !shouldFetch('ledger')) return;
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
    await Promise.all([
      refreshMaterials(true),
      refreshProducts(true),
      refreshVendors(true),
      refreshStores(true),
      refreshBatches(true),
      refreshLedger(true)
    ]);
    setLoading(false);
  }, [user, refreshMaterials, refreshProducts, refreshVendors, refreshStores, refreshBatches, refreshLedger]);

  useEffect(() => {
    if (user) {
      // Lazy load in background on login, don't set global loading
      refreshAll();
    } else {
      setMaterials([]); setProducts([]); setVendors([]); setStores([]); setBatches([]); setLedger([]);
      cacheRef.current = {};
    }
  }, [user, refreshAll]);

  return (
    <DataContext.Provider value={{
      materials, products, vendors, stores, batches, ledger, loading,
      refreshAll, refreshMaterials, refreshProducts, refreshVendors, refreshStores, refreshBatches, refreshLedger
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
