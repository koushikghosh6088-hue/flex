import React, { useState } from 'react';
import { Calculator, Save, Layers, Hash, Ruler, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

export default function ConsumptionCalculatorPage() {
  const { materials } = useData();
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    materialId: '',
    count: '10',
    width: '2',
    height: '3'
  });
  const [loading, setLoading] = useState(false);

  const flexRolls = materials.filter(m => m.material_kind === 'flex_roll');

  const totalArea = Number(formData.count) * Number(formData.width) * Number(formData.height);
  const perFlexConsumption = totalArea / Number(formData.count);

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.materialId) {
      toast.error('Please provide a name and select a roll type');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/pos/consumption-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          count: Number(formData.count),
          width: Number(formData.width),
          height: Number(formData.height),
          userId: profile?.id
        })
      });

      if (!response.ok) throw new Error('Failed to save template');

      toast.success('Consumption template saved successfully');
      setFormData({
        name: '',
        materialId: '',
        count: '10',
        width: '2',
        height: '3'
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">BOM Calculator</h2>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Material Consumption & Template Engine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-neutral-900 text-white p-6">
            <div className="flex items-center gap-3">
              <Calculator size={20} className="text-orange-500" />
              <CardTitle className="text-xl font-black">Consumption Logic</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Template Name</Label>
                <Input 
                  placeholder="e.g., Standard 2x3 Banner Set"
                  className="h-12 rounded-xl bg-neutral-50"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Roll Type</Label>
                <select 
                  className="w-full h-12 rounded-xl bg-neutral-50 border border-neutral-100 font-bold px-3"
                  value={formData.materialId}
                  onChange={e => setFormData({...formData, materialId: e.target.value})}
                >
                  <option value="">Select Roll Size</option>
                  {flexRolls.map(m => <option key={m.id} value={m.id}>{m.name} ({m.roll_width_ft}ft)</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Count</Label>
                  <Input 
                    type="number"
                    className="h-12 rounded-xl bg-neutral-50 font-bold"
                    value={formData.count}
                    onChange={e => setFormData({...formData, count: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Width (ft)</Label>
                  <Input 
                    type="number"
                    className="h-12 rounded-xl bg-neutral-50 font-bold"
                    value={formData.width}
                    onChange={e => setFormData({...formData, width: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Height (ft)</Label>
                  <Input 
                    type="number"
                    className="h-12 rounded-xl bg-neutral-50 font-bold"
                    value={formData.height}
                    onChange={e => setFormData({...formData, height: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-14 rounded-2xl bg-neutral-900 text-white font-black"
              onClick={handleSaveTemplate}
              disabled={loading}
            >
              <Save className="mr-2 h-5 w-5" />
              Save as Template
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-orange-600 text-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black">Calculation Output</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="flex justify-between items-end border-b border-white/20 pb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Area Required</p>
                <p className="text-4xl font-black">{totalArea.toFixed(2)} sqft</p>
              </div>
              <Layers className="h-10 w-10 opacity-20" />
            </div>

            <div className="flex justify-between items-end border-b border-white/20 pb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Per Flex Consumption</p>
                <p className="text-4xl font-black">{perFlexConsumption.toFixed(2)} sqft</p>
              </div>
              <Hash className="h-10 w-10 opacity-20" />
            </div>

            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2">Technical Note</p>
              <p className="text-xs font-medium leading-relaxed opacity-80">
                This calculation assumes no margin. In POS, a default margin of 0.1ft will be applied per side, 
                increasing the actual deduction area.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
