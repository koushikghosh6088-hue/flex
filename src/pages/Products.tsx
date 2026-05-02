import React, { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Box, Store, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

export default function ProductsPage() {
  const { profile } = useAuth();
  const { products, stores, loading: dataLoading, refreshProducts } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [storePrices, setStorePrices] = useState<any[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Piece',
    selling_price: '',
    description: ''
  });

  const visibleStores = useMemo(() => {
    if (profile?.role === 'owner') return stores;
    return stores.filter((store) => store.id === profile?.store_id);
  }, [profile, stores]);

  useEffect(() => {
    const fetchStorePrices = async () => {
      if (!visibleStores.length) {
        setStorePrices([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('store_product_prices')
          .select('*')
          .in('store_id', visibleStores.map((store) => store.id));

        if (error) throw error;
        setStorePrices(data || []);
      } catch (error) {
        console.warn('Store-specific prices are not available yet.', error);
        setStorePrices([]);
      }
    };

    fetchStorePrices();
  }, [visibleStores]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('finished_products').insert([{
        ...formData,
        selling_price: parseFloat(formData.selling_price) || 0
      }]);
      if (error) throw error;
      toast.success('Product added successfully');
      setIsAddOpen(false);
      setFormData({ name: '', unit: 'Piece', selling_price: '', description: '' });
      refreshProducts();
    } catch (error: any) {
      toast.error('Failed to add product: ' + error.message);
    }
  };

  const getOverride = (storeId: string, productId: string) => {
    return storePrices.find((price) => price.store_id === storeId && price.finished_product_id === productId);
  };

  const getDraftKey = (storeId: string, productId: string) => `${storeId}:${productId}`;

  const getDraftValue = (storeId: string, product: any) => {
    const key = getDraftKey(storeId, product.id);
    const override = getOverride(storeId, product.id);
    return priceDrafts[key] ?? String(override?.selling_price ?? product.selling_price ?? '');
  };

  const saveStorePrice = async (storeId: string, product: any) => {
    if (!profile) return;

    const key = getDraftKey(storeId, product.id);
    const value = Number(priceDrafts[key] ?? getDraftValue(storeId, product));

    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid selling price');
      return;
    }

    setSavingKey(key);
    try {
      const { data, error } = await supabase
        .from('store_product_prices')
        .upsert({
          store_id: storeId,
          finished_product_id: product.id,
          selling_price: value,
          updated_by: profile.id
        }, { onConflict: 'store_id,finished_product_id' })
        .select()
        .single();

      if (error) throw error;

      setStorePrices((current) => {
        const withoutCurrent = current.filter((price) => !(price.store_id === storeId && price.finished_product_id === product.id));
        return [...withoutCurrent, data];
      });
      setPriceDrafts((current) => ({ ...current, [key]: String(value) }));
      toast.success('Store price saved');
    } catch (error: any) {
      toast.error('Failed to save store price: ' + error.message);
    } finally {
      setSavingKey('');
    }
  };

  if (dataLoading && products.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">Finished Catalog</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Base catalog plus store-specific selling prices</p>
        </div>
        {profile?.role === 'owner' && (
          <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto h-12 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-100 font-bold border-none hover:bg-orange-700 transition-all">
            <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
            Launch New Product
          </Button>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Register Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Product Title</Label>
              <Input 
                required 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Sales Unit</Label>
                <Input 
                  required
                  className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Base Price</Label>
                <Input 
                  type="number"
                  step="0.01"
                  required
                  className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Description</Label>
              <Input 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" className="h-12 rounded-xl font-bold text-neutral-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-12 rounded-xl bg-neutral-900 text-white font-bold shadow-xl shadow-neutral-200">Finalize Product</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {products.map((product) => (
          <Card key={product.id} className="group overflow-hidden rounded-[2rem] border-none shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-900 font-black text-xl border border-neutral-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-500 transition-all">
                  <Box size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Catalog</span>
              </div>
              <CardTitle className="mt-4 text-xl font-black text-neutral-900 group-hover:text-orange-600 transition-colors truncate">
                {product.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Unit Type</span>
                  <span className="text-sm font-bold text-neutral-700">{product.unit}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Base Price</span>
                  <span className="text-2xl font-black tabular-nums text-orange-600">
                    Rs {Number(product.selling_price || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {visibleStores.map((store) => {
                  const key = getDraftKey(store.id, product.id);
                  return (
                    <div key={store.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Store size={14} className="text-orange-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{store.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="h-10 rounded-xl bg-white border-neutral-100 font-bold"
                          value={getDraftValue(store.id, product)}
                          onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: event.target.value }))}
                        />
                        <Button
                          size="icon"
                          className="h-10 w-10 rounded-xl bg-neutral-900 text-white hover:bg-orange-600"
                          onClick={() => saveStorePrice(store.id, product)}
                          disabled={savingKey === key}
                        >
                          <Save className={`h-4 w-4 ${savingKey === key ? 'animate-pulse' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs font-medium text-neutral-400 line-clamp-2 italic">
                {product.description || 'No product technical specifications provided.'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-neutral-200">
          <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-6">
            <Package className="h-12 w-12 text-neutral-200" />
          </div>
          <h3 className="text-xl font-black text-neutral-900">Catalog Empty</h3>
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-2 mb-8 text-center px-6">No finished products registered in system</p>
          {profile?.role === 'owner' && (
            <Button onClick={() => setIsAddOpen(true)} className="h-12 px-8 rounded-2xl bg-neutral-900 text-white shadow-xl shadow-neutral-200 font-bold">
              <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
              Initialize Catalog
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
