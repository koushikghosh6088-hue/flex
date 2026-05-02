import React, { useState, useEffect } from 'react';
import { Store, Plus, Trash2, MapPin, Hash, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

export default function StoresPage() {
  const { stores, loading: dataLoading, refreshStores } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize store');
      }

      toast.success(`Node ${formData.code} established`);
      setFormData({ name: '', code: '' });
      setIsAddOpen(false);
      refreshStores();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (store: any) => {
    if (!confirm(`Are you sure you want to decommission "${store.name}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('stores').delete().eq('id', store.id);
      if (error) throw error;
      toast.success('Node successfully decommissioned');
      refreshStores();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (dataLoading && stores.length === 0) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">Branch Network</h2>
           <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Operational Node Management</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto h-12 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-100 font-bold border-none hover:bg-orange-700 transition-all">
          <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
          Initialize New Node
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => (
          <Card key={store.id} className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-8 pb-4">
               <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:bg-orange-600 transition-colors">
                     <Store size={28} strokeWidth={2.5} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDeleteStore(store)}>
                     <Trash2 size={20} />
                  </Button>
               </div>
               <CardTitle className="mt-6 text-xl font-black tracking-tight text-neutral-900">
                  {store.name}
               </CardTitle>
               <CardDescription className="text-xs font-black text-orange-600 uppercase tracking-widest">
                  Node Code: {store.code}
               </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-6 space-y-6">
               <div className="flex items-center justify-between py-4 border-y border-neutral-50">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Status</span>
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-neutral-700 uppercase">Operational</span>
                     </div>
                  </div>
                  <div className="text-right">
                     <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">ID Hash</span>
                     <p className="text-[10px] font-mono text-neutral-400 truncate w-24 ml-auto">{store.id.substring(0, 8)}</p>
                  </div>
               </div>
               
               <Button variant="outline" className="w-full h-12 rounded-xl border-neutral-100 font-bold text-neutral-600 hover:bg-neutral-50 group/btn">
                  View Node Terminal
                  <ArrowRight size={14} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
               </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-md">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black text-neutral-900">Establish Node</DialogTitle>
           </DialogHeader>
           <form onSubmit={handleAddStore} className="space-y-5 py-4">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Branch Identity (Name)</Label>
                 <Input required className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 font-black text-lg focus:ring-orange-600/10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Main Terminal" />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Node Code (Protocol)</Label>
                 <Input required className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 font-black text-lg focus:ring-orange-600/10 uppercase" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="LKO-01" />
              </div>
              <DialogFooter className="pt-4">
                 <Button type="button" variant="ghost" className="h-14 rounded-2xl font-black text-neutral-500" onClick={() => setIsAddOpen(false)}>Abort</Button>
                 <Button type="submit" disabled={loading} className="h-14 px-8 rounded-2xl bg-neutral-950 text-white font-black shadow-xl shadow-neutral-300">
                    {loading ? <Loader2 className="animate-spin" /> : 'Initialize Node'}
                 </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      {stores.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-neutral-200">
          <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-neutral-200">
            <Store className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-black text-neutral-900">Network Offline</h3>
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-2 mb-8 text-center px-6">No operational nodes registered in the system</p>
          <Button onClick={() => setIsAddOpen(true)} className="h-12 px-8 rounded-2xl bg-neutral-900 text-white shadow-xl shadow-neutral-200 font-bold">
            <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
            Initialize First Node
          </Button>
        </div>
      )}
    </div>
  );
}
