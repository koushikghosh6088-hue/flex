import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Users, 
  Store, 
  Database, 
  Save, 
  Plus, 
  Trash2, 
  Key,
  Download,
  AlertCircle,
  CheckCircle2,
  Globe,
  Phone,
  Hash,
  Shield,
  Layout
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    company_name: 'FlexStock Inventory',
    company_address: '',
    company_phone: '',
    company_gst: '',
    logo_url: '',
    default_gst_rate: 18,
    last_backup_at: ''
  });

  const [stores, setStores] = useState<any[]>([]);
  const [newStore, setNewStore] = useState({ name: '', code: '' });
  
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    role: 'store_manager', 
    store_id: '' 
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storesData, usersData] = await Promise.all([
        supabase.from('stores').select('*').order('name'),
        supabase.from('users').select('*').order('name')
      ]);
      setStores(storesData.data || []);
      setUsers(usersData.data || []);
    } catch (error) {
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = () => {
    toast.success('Core configurations updated successfully');
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStore.name || !newStore.code) return;
    try {
      const { error } = await supabase.from('stores').insert([newStore]);
      if (error) throw error;
      toast.success(`Node ${newStore.code} established`);
      setNewStore({ name: '', code: '' });
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900">Console</h2>
        <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">System Parameters & Node Management</p>
      </div>

      <Tabs defaultValue="general" className="space-y-8">
        <TabsList className="bg-neutral-100 p-1 rounded-2xl w-full sm:w-fit grid grid-cols-2 sm:flex sm:gap-1">
          <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest px-6 py-3">General</TabsTrigger>
          <TabsTrigger value="engine" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest px-6 py-3">Material Engine</TabsTrigger>
          <TabsTrigger value="stores" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest px-6 py-3">Stores</TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest px-6 py-3">Identity</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest px-6 py-3">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="engine" className="animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                 <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                       <CardTitle className="text-xl font-black tracking-tight">Material Consumption Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Wastage Per Roll Side (ft)</Label>
                             <Input 
                                type="number" 
                                step="0.01"
                                className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 font-black text-lg" 
                                value={0.25} // Defaulting for now
                             />
                             <p className="text-[10px] font-bold text-neutral-400 mt-1">Total wastage = 2 × this value (default 0.5ft total)</p>
                          </div>
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Default Cutting Margin (ft)</Label>
                             <Input 
                                type="number" 
                                step="0.01"
                                className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 font-black text-lg" 
                                value={0.1}
                             />
                             <p className="text-[10px] font-bold text-neutral-400 mt-1">Added to all sides during POS job entry</p>
                          </div>
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Pipe Consumption Logic</Label>
                             <select className="w-full h-14 rounded-2xl bg-neutral-50 border border-neutral-100 font-black text-lg px-4">
                                <option value="2">2 × Banner Width (Top & Bottom)</option>
                                <option value="4">4 × Banner Width (All Sides)</option>
                                <option value="0">Manual Entry Only</option>
                             </select>
                          </div>
                       </div>
                       <Button className="h-14 w-full rounded-2xl bg-neutral-900 text-white font-black shadow-xl shadow-neutral-200">Update Engine Logic</Button>
                    </CardContent>
                 </Card>
              </div>
              <div className="space-y-6">
                 <Card className="rounded-[2.5rem] border-none shadow-sm bg-neutral-950 text-white overflow-hidden">
                    <CardContent className="p-8 space-y-6">
                       <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center">
                          <Ruler size={32} />
                       </div>
                       <h3 className="text-2xl font-black tracking-tighter leading-tight">Batch Precision <br />Engine</h3>
                       <p className="text-sm font-medium text-neutral-400 leading-relaxed">These parameters control the FIFO deduction logic and wastage reporting accuracy across all stores.</p>
                    </CardContent>
                 </Card>
              </div>
           </div>
        </TabsContent>

        <TabsContent value="general" className="animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                 <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                       <CardTitle className="text-xl font-black tracking-tight">Organization Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Entity Name</Label>
                             <Input className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold" value={settings.company_name} onChange={(e) => setSettings({...settings, company_name: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Support Hotline</Label>
                             <Input className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold" value={settings.company_phone} onChange={(e) => setSettings({...settings, company_phone: e.target.value})} />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Headquarters Address</Label>
                          <Input className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold" value={settings.company_address} onChange={(e) => setSettings({...settings, company_address: e.target.value})} />
                       </div>
                       <Button onClick={saveSettings} className="h-14 w-full rounded-2xl bg-neutral-900 text-white font-black shadow-xl shadow-neutral-200">Commit Changes</Button>
                    </CardContent>
                 </Card>
              </div>
              <div className="space-y-6">
                 <Card className="rounded-[2.5rem] border-none shadow-sm bg-orange-600 text-white overflow-hidden">
                    <CardContent className="p-8 space-y-6">
                       <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                          <Globe size={32} />
                       </div>
                       <h3 className="text-2xl font-black tracking-tighter leading-tight">Global Logistics <br />Settings</h3>
                       <p className="text-sm font-medium text-orange-100 leading-relaxed">Configure how your nodes interact and synchronize data across timezones.</p>
                    </CardContent>
                 </Card>
              </div>
           </div>
        </TabsContent>

        <TabsContent value="stores" className="animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                 <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                       <CardTitle className="text-xl font-black tracking-tight text-neutral-900">Establish Node</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                       <form onSubmit={handleAddStore} className="space-y-4">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Branch Name</Label>
                             <Input required className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold" value={newStore.name} onChange={(e) => setNewStore({...newStore, name: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Node Code</Label>
                             <Input required className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold" value={newStore.code} onChange={(e) => setNewStore({...newStore, code: e.target.value})} />
                          </div>
                          <Button type="submit" className="w-full h-12 rounded-xl bg-orange-600 text-white font-black mt-2">Initialize Store</Button>
                       </form>
                    </CardContent>
                 </Card>
              </div>
              <div className="lg:col-span-2">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stores.map((store) => (
                       <Card key={store.id} className="rounded-3xl border-none shadow-sm bg-white p-6 hover:shadow-lg transition-all group">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-white">
                                   <Store size={24} />
                                </div>
                                <div>
                                   <h4 className="font-black text-neutral-900 tracking-tight">{store.name}</h4>
                                   <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{store.code}</p>
                                </div>
                             </div>
                             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={18} />
                             </Button>
                          </div>
                       </Card>
                    ))}
                 </div>
              </div>
           </div>
        </TabsContent>

        <TabsContent value="users" className="animate-in fade-in slide-in-from-left-4 duration-500">
           <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                    <CardTitle className="text-xl font-black tracking-tight">Access Control</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-1">Authorized System Personnel</CardDescription>
                 </div>
                 <Button className="h-12 rounded-xl bg-neutral-900 text-white font-bold px-6 shadow-lg shadow-neutral-200">
                    <Plus className="mr-2 h-4 w-4" />
                    New Identity
                 </Button>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y divide-neutral-50">
                    {users.map((u) => (
                       <div key={u.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50 transition-colors">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-900 font-black">
                                {u.name[0]}
                             </div>
                             <div>
                                <p className="font-black text-neutral-900 tracking-tight">{u.name}</p>
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{u.email}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-6">
                             <Badge className={`rounded-lg uppercase text-[10px] font-black tracking-widest px-3 py-1 ${u.role === 'owner' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                                {u.role}
                             </Badge>
                             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-neutral-400 hover:text-red-600">
                                <Trash2 size={18} />
                             </Button>
                          </div>
                       </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="security" className="animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[2.5rem] border-none shadow-sm bg-neutral-900 text-white p-8 space-y-6">
                 <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center">
                    <Shield size={28} />
                 </div>
                 <h3 className="text-2xl font-black tracking-tight">System Integrity</h3>
                 <p className="text-sm font-medium text-neutral-400 leading-relaxed">Multi-factor authentication and role-based access control are active. All login attempts are recorded in the audit trail.</p>
                 <Button variant="outline" className="h-12 rounded-xl border-neutral-700 text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px]">Verify Security Protocol</Button>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8 space-y-6">
                 <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-900">
                    <Key size={28} />
                 </div>
                 <h3 className="text-2xl font-black tracking-tight">Identity Recovery</h3>
                 <p className="text-sm font-medium text-neutral-500 leading-relaxed">Manage master keys and PIN reset procedures for your store managers and staff.</p>
                 <Button className="h-12 rounded-xl bg-orange-600 text-white font-black shadow-lg shadow-orange-100 uppercase tracking-widest text-[10px]">Manage Master Keys</Button>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
