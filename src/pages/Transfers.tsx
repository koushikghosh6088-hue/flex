import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, Package, Truck, Layers, Hash, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

import { useData } from '../contexts/DataContext';

export default function TransfersPage() {
  const { profile } = useAuth();
  const { stores, materials, loading: dataLoading, refreshMaterials } = useData();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    from_store_id: '',
    to_store_id: '',
    raw_material_id: '',
    quantity: '',
    notes: ''
  });

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          from_store:stores!stock_transfers_from_store_id_fkey (name),
          to_store:stores!stock_transfers_to_store_id_fkey (name),
          material:raw_materials (name, unit)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error: any) {
      console.error('Failed to load transfers', error);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (formData.from_store_id === formData.to_store_id && formData.from_store_id !== '') {
      toast.error('Source and Destination cannot be the same');
      return;
    }
    
    if (formData.from_store_id !== '') {
       toast.error('Only Central Warehouse to Store transfers are currently supported.');
       return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: formData.raw_material_id,
          toStoreId: formData.to_store_id,
          quantity: parseFloat(formData.quantity),
          remarks: formData.notes,
          userId: profile.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transfer failed');
      }

      toast.success('Inventory transfer successful');
      setIsAddOpen(false);
      setFormData({ from_store_id: '', to_store_id: '', raw_material_id: '', quantity: '', notes: '' });
      fetchTransfers();
      refreshMaterials();
    } catch (error: any) {
      toast.error('Transfer failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading && transfers.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">Stock Logistics</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Internal Warehouse Transfers</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto h-12 rounded-2xl bg-neutral-900 text-white shadow-lg shadow-neutral-200 font-bold border-none hover:bg-orange-600 transition-all">
          <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
          New Transfer Request
        </Button>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Transfer Protocol</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Resource Type</Label>
              <select 
                required
                className="w-full h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold px-3"
                value={formData.raw_material_id}
                onChange={(e) => setFormData({...formData, raw_material_id: e.target.value})}
              >
                <option value="">Select Material</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Source Node</Label>
                <select 
                  className="w-full h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold px-3"
                  value={formData.from_store_id}
                  onChange={(e) => setFormData({...formData, from_store_id: e.target.value})}
                >
                  <option value="">Central Warehouse</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Destination Node</Label>
                <select 
                  required
                  className="w-full h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold px-3"
                  value={formData.to_store_id}
                  onChange={(e) => setFormData({...formData, to_store_id: e.target.value})}
                >
                  <option value="">Select Target Store</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Transfer Quantity</Label>
              <Input 
                required 
                type="number"
                step="0.001"
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Protocol Notes</Label>
              <Input 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" className="h-12 rounded-xl font-bold text-neutral-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-12 rounded-xl bg-orange-600 text-white font-bold shadow-xl shadow-orange-100">Execute Transfer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {transfers.map((transfer) => (
          <Card key={transfer.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b border-neutral-50">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                  <Truck size={20} strokeWidth={2.5} />
                </div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  transfer.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {transfer.status}
                </span>
              </div>
              <CardTitle className="mt-4 text-lg font-black tracking-tight text-neutral-900">
                {transfer.material?.name || 'Technical Asset'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1 text-center">Source</span>
                  <div className="h-12 rounded-2xl bg-neutral-50 flex items-center justify-center px-3 border border-neutral-100">
                    <span className="text-[10px] font-bold text-neutral-600 truncate uppercase">{transfer.from_store?.name || 'CENTRAL WHS'}</span>
                  </div>
                </div>
                <ArrowRight className="text-neutral-300 shrink-0" size={16} strokeWidth={3} />
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1 text-center">Destination</span>
                  <div className="h-12 rounded-2xl bg-orange-600 flex items-center justify-center px-3 border border-orange-500 shadow-lg shadow-orange-100">
                    <span className="text-[10px] font-bold text-white truncate uppercase">{transfer.to_store?.name || 'TERMINAL'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Volume</span>
                    <span className="text-xl font-black tabular-nums">{transfer.quantity} <span className="text-[10px] text-neutral-400">{transfer.material?.unit}</span></span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Logged</span>
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{new Date(transfer.created_at).toLocaleDateString()}</span>
                 </div>
              </div>

              {transfer.notes && (
                <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100 italic text-[10px] text-neutral-500 font-medium">
                   <Info size={14} className="shrink-0 text-neutral-400" />
                   {transfer.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {transfers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-neutral-200">
          <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-6">
            <Layers className="h-12 w-12 text-neutral-200" />
          </div>
          <h3 className="text-xl font-black text-neutral-900">Logistics Offline</h3>
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-2 mb-8 text-center px-6">No internal stock movements recorded</p>
          <Button onClick={() => setIsAddOpen(true)} className="h-12 px-8 rounded-2xl bg-neutral-900 text-white shadow-xl shadow-neutral-200 font-bold">
            <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
            Initialize First Transfer
          </Button>
        </div>
      )}
    </div>
  );
}
