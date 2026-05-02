import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, AlertTriangle, Layers } from 'lucide-react';
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
import { PlusCircle, Ruler, History } from 'lucide-react';

import { useData } from '../contexts/DataContext';

export default function RawMaterialsPage() {
  const { materials, loading: dataLoading, refreshMaterials } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'SQFT',
    description: ''
  });

  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [stockInData, setStockInData] = useState({
    quantity: '',
    rate: '',
    vendorId: '',
    rollWidth: '',
    rollLength: '100'
  });
  const { vendors } = useData();

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/inventory/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add material');
      }

      toast.success('Material added successfully');
      setIsAddOpen(false);
      setFormData({ name: '', unit: 'SQFT', description: '' });
      refreshMaterials();
    } catch (error: any) {
      console.error('Material Addition Error:', error);
      toast.error('Failed to add material: ' + error.message);
    }
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    try {
      const response = await fetch('/api/inventory/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: stockInData.vendorId,
          date: new Date().toISOString().split('T')[0],
          invoice: 'DIRECT_ENTRY',
          userId: (await supabase.auth.getUser()).data.user?.id,
          items: [{
            materialId: selectedMaterial.id,
            quantity: stockInData.quantity,
            rate: stockInData.rate
          }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add stock');
      }

      toast.success('Stock added successfully');
      setIsStockInOpen(false);
      setStockInData({ quantity: '', rate: '', vendorId: '', rollWidth: '', rollLength: '100' });
      refreshMaterials();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteMaterial = async (material: any) => {
    const hasStock = (material.central_stock?.[0]?.quantity || 0) > 0;
    
    if (hasStock) {
      toast.error('Cannot delete material with active stock. Please clear stock first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${material.name}"? This will remove all history for this material.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', material.id);

      if (error) throw error;

      toast.success('Material deleted successfully');
      refreshMaterials();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  if (dataLoading && materials.length === 0) {
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
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">Raw Inventory</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Material Resource Planning</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto h-12 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-100 font-bold border-none hover:bg-orange-700 transition-all">
          <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
          Add New Material
        </Button>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Add Raw Material</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMaterial} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Material Name</Label>
              <Input 
                required 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Measurement Unit (SQFT, LTR, KG)</Label>
              <Input 
                required
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Internal Description</Label>
              <Input 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" className="h-12 rounded-xl font-bold text-neutral-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-12 rounded-xl bg-neutral-900 text-white font-bold shadow-xl shadow-neutral-200">Register Material</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {materials.map((material) => (
          <Card key={material.id} className="group overflow-hidden rounded-[2rem] border-none shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-900 font-black text-xl border border-neutral-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-500 transition-all">
                  <Layers size={24} />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl hover:bg-orange-50 text-orange-600"
                    onClick={() => {
                      setSelectedMaterial(material);
                      setStockInData(prev => ({ ...prev, rollWidth: material.roll_width_ft || '' }));
                      setIsStockInOpen(true);
                    }}
                  >
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl hover:bg-neutral-100 text-neutral-400"
                    onClick={() => {
                      setFormData({
                        name: material.name,
                        unit: material.unit,
                        description: material.description || ''
                      });
                      setIsAddOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-400"
                    onClick={() => handleDeleteMaterial(material)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-4 text-xl font-black text-neutral-900 group-hover:text-orange-600 transition-colors truncate">
                {material.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Standard Unit</span>
                  <span className="text-sm font-bold text-neutral-700">{material.unit}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Central Warehouse</span>
                  <span className={`text-2xl font-black tabular-nums ${(material.central_stock?.[0]?.quantity || 0) < 100 ? 'text-red-600' : 'text-neutral-900'}`}>
                    {material.central_stock?.[0]?.quantity || 0}
                  </span>
                </div>
              </div>

              {(material.central_stock?.[0]?.quantity || 0) < 100 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-pulse">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Critical Reorder Level</span>
                </div>
              )}

              <p className="text-xs font-medium text-neutral-400 line-clamp-2 italic">
                {material.description || 'No additional material technical specifications provided.'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={isStockInOpen} onOpenChange={setIsStockInOpen}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Quick Stock In</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockIn} className="space-y-4 py-2">
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">Material</p>
              <h3 className="text-lg font-black text-orange-950">{selectedMaterial?.name}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Vendor</Label>
                <select 
                  required
                  className="w-full h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold px-3 outline-none"
                  value={stockInData.vendorId}
                  onChange={(e) => setStockInData({...stockInData, vendorId: e.target.value})}
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Purchase Rate</Label>
                <Input type="number" step="0.01" required className="h-12 rounded-xl bg-neutral-50" value={stockInData.rate} onChange={(e) => setStockInData({...stockInData, rate: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Quantity (Rolls/Units)</Label>
                <Input type="number" required className="h-12 rounded-xl bg-neutral-50" value={stockInData.quantity} onChange={(e) => setStockInData({...stockInData, quantity: e.target.value})} />
              </div>
              {selectedMaterial?.material_kind === 'flex_roll' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Roll Width (ft)</Label>
                  <Input type="number" readOnly className="h-12 rounded-xl bg-neutral-100 opacity-70" value={selectedMaterial.roll_width_ft} />
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" className="h-12 rounded-xl font-bold" onClick={() => setIsStockInOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-12 rounded-xl bg-neutral-900 text-white font-black shadow-xl">Update Inventory</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {materials.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-neutral-200">
          <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-6">
            <Package className="h-12 w-12 text-neutral-200" />
          </div>
          <h3 className="text-xl font-black text-neutral-900">Inventory Empty</h3>
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-2 mb-8 text-center px-6">No raw materials registered in system</p>
          <Button onClick={() => setIsAddOpen(true)} className="h-12 px-8 rounded-2xl bg-neutral-900 text-white shadow-xl shadow-neutral-200 font-bold">
            <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
            Initialize Inventory
          </Button>
        </div>
      )}
    </div>
  );
}
