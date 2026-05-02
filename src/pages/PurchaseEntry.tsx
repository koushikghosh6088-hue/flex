import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Save, Truck, Layers, Hash, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

import { useData } from '../contexts/DataContext';

export default function PurchaseEntryPage() {
  const { profile } = useAuth();
  const { vendors, materials, loading: dataLoading, refreshMaterials } = useData();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_id: '',
    raw_material_id: '',
    quantity: '',
    unit_price: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const response = await fetch('/api/inventory/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: formData.vendor_id,
          invoice: formData.notes || 'N/A',
          items: [{
             materialId: formData.raw_material_id,
             quantity: parseFloat(formData.quantity),
             rate: parseFloat(formData.unit_price)
          }],
          userId: profile.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record purchase');
      }

      toast.success('Purchase recorded successfully');
      setFormData({
        vendor_id: '',
        raw_material_id: '',
        quantity: '',
        unit_price: '',
        notes: ''
      });
      refreshMaterials();
    } catch (error: any) {
      toast.error('Failed to record purchase: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading && vendors.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">Purchase Inbound</h2>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Restock Raw Materials & Assets</p>
      </div>

      <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-xl shadow-neutral-200/50 overflow-hidden bg-white">
        <CardHeader className="bg-neutral-900 text-white p-6 md:p-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/40">
                <Truck size={24} strokeWidth={2.5} />
             </div>
             <div>
                <CardTitle className="text-xl md:text-2xl font-black">Entry Protocol</CardTitle>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mt-1">Transaction ID: NEW-AUTO</p>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
               {/* Vendor Selection */}
               <div className="space-y-3">
                 <div className="flex items-center gap-2 mb-1">
                    <Truck size={14} className="text-neutral-400" />
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Supplier Authority</Label>
                 </div>
                 <select 
                   required
                   className="w-full h-14 rounded-2xl bg-neutral-50 border border-neutral-100 font-bold px-4 outline-none focus:ring-4 focus:ring-orange-600/10 transition-all appearance-none cursor-pointer"
                   value={formData.vendor_id}
                   onChange={(e) => setFormData({...formData, vendor_id: e.target.value})}
                 >
                   <option value="">Select Vendor</option>
                   {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                 </select>
               </div>

               {/* Material Selection */}
               <div className="space-y-3">
                 <div className="flex items-center gap-2 mb-1">
                    <Layers size={14} className="text-neutral-400" />
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Resource Type</Label>
                 </div>
                 <select 
                   required
                   className="w-full h-14 rounded-2xl bg-neutral-50 border border-neutral-100 font-bold px-4 outline-none focus:ring-4 focus:ring-orange-600/10 transition-all appearance-none cursor-pointer"
                   value={formData.raw_material_id}
                   onChange={(e) => setFormData({...formData, raw_material_id: e.target.value})}
                 >
                   <option value="">Select Material</option>
                   {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                 </select>
               </div>

               {/* Quantity */}
               <div className="space-y-3">
                 <div className="flex items-center gap-2 mb-1">
                    <Hash size={14} className="text-neutral-400" />
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Volume / Quantity</Label>
                 </div>
                 <Input 
                   type="number"
                   step="0.001"
                   required
                   placeholder="0.000"
                   className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 font-black text-lg focus:ring-orange-600/10 tabular-nums"
                   value={formData.quantity}
                   onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                 />
               </div>

                {/* Unit Price */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                     <DollarSign size={14} className="text-neutral-400" />
                     <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cost per Roll (₹)</Label>
                  </div>
                  <Input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 font-black text-lg focus:ring-orange-600/10 tabular-nums"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  />
                </div>

                {/* Roll Specs (Auto calculated if material is selected) */}
                {formData.raw_material_id && materials.find(m => m.id === formData.raw_material_id)?.material_kind === 'flex_roll' && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                         <Ruler size={14} className="text-neutral-400" />
                         <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Roll Width (ft)</Label>
                      </div>
                      <div className="h-14 rounded-2xl bg-neutral-100 border-neutral-100 font-black text-lg flex items-center px-4 text-neutral-500">
                        {materials.find(m => m.id === formData.raw_material_id)?.roll_width_ft || '4.0'} ft
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                         <Ruler size={14} className="text-neutral-400" />
                         <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Area (sqft)</Label>
                      </div>
                      <div className="h-14 rounded-2xl bg-orange-50 border-orange-100 font-black text-lg flex items-center px-4 text-orange-700">
                        {((materials.find(m => m.id === formData.raw_material_id)?.roll_width_ft || 4) * 100).toFixed(0)} sqft
                      </div>
                    </div>
                  </>
                )}
             </div>

            {/* Notes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                 <FileText size={14} className="text-neutral-400" />
                 <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Transaction Notes</Label>
              </div>
              <Input 
                className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 font-medium px-4"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Reference numbers, batch codes, or specific instructions..."
              />
            </div>

            <div className="pt-8 border-t border-neutral-100">
              <div className="bg-neutral-50 p-6 md:p-8 rounded-[2rem] mb-8 border border-neutral-100">
                 <div className="flex justify-between items-center">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Calculated Valuation</span>
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Base + Logistics</span>
                   </div>
                   <span className="text-4xl md:text-5xl font-black text-orange-600 tabular-nums tracking-tighter">
                     ₹{(parseFloat(formData.quantity || '0') * parseFloat(formData.unit_price || '0')).toFixed(2)}
                   </span>
                 </div>
              </div>
              <Button type="submit" className="w-full h-16 md:h-20 rounded-[2rem] text-xl font-black bg-neutral-950 text-white shadow-2xl shadow-neutral-400 hover:bg-orange-600 transition-all active:scale-[0.98]" disabled={loading}>
                <Save className="mr-3 h-6 w-6" strokeWidth={2.5} />
                Verify & Commit Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
