import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, MapPin, Plus, Edit, Trash2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import VendorLedgerPage from './VendorLedger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

import { useData } from '../contexts/DataContext';

export default function VendorsPage() {
  const { vendors, loading: dataLoading, refreshVendors } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('vendors').insert([formData]);
      if (error) throw error;
      toast.success('Vendor added successfully');
      setIsAddOpen(false);
      setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
      refreshVendors();
    } catch (error: any) {
      toast.error('Failed to add vendor: ' + error.message);
    }
  };

  if (selectedVendor) {
    return <VendorLedgerPage vendor={selectedVendor} onBack={() => setSelectedVendor(null)} />;
  }

  if (dataLoading && vendors.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">Partner Vendors</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Supply Chain Management</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto h-12 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-100 font-bold border-none hover:bg-orange-700 transition-all">
          <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
          Register Vendor
        </Button>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[2rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Register New Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddVendor} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Vendor Authority / Company Name</Label>
              <Input 
                required 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Contact Person</Label>
                <Input 
                  className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Phone Number</Label>
                <Input 
                  className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Email Protocol</Label>
              <Input 
                type="email"
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Physical Address</Label>
              <Input 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" className="h-12 rounded-xl font-bold text-neutral-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-12 rounded-xl bg-neutral-900 text-white font-bold shadow-xl shadow-neutral-200">Establish Connection</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {vendors.map((vendor) => (
          <Card key={vendor.id} className="group overflow-hidden rounded-[2rem] border-none shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-900 font-black text-xl border border-neutral-100 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-500 transition-all">
                  {vendor.name[0]}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-neutral-100 text-neutral-400">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-4 text-xl font-black text-neutral-900 group-hover:text-orange-600 transition-colors truncate">
                {vendor.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm font-bold text-neutral-500">
                  <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-neutral-400" />
                  </div>
                  <span className="truncate">{vendor.phone || 'No Contact'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-neutral-500">
                  <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-neutral-400" />
                  </div>
                  <span className="truncate">{vendor.email || 'No Email'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-neutral-500">
                  <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                  </div>
                  <span className="line-clamp-1">{vendor.address || 'No Address'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Account Balance</span>
                    <span className={`text-2xl font-black tabular-nums truncate ${vendor.current_balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ₹{vendor.current_balance || 0}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-10 px-4 rounded-xl border-neutral-200 font-bold hover:bg-neutral-900 hover:text-white transition-all shadow-sm shrink-0"
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Ledger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {vendors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-neutral-200">
          <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-6">
            <Building2 className="h-12 w-12 text-neutral-200" />
          </div>
          <h3 className="text-xl font-black text-neutral-900">Database Empty</h3>
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-2 mb-8 text-center px-6">No vendors registered in system</p>
          <Button onClick={() => setIsAddOpen(true)} className="h-12 px-8 rounded-2xl bg-neutral-900 text-white shadow-xl shadow-neutral-200 font-bold">
            <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
            Add First Vendor
          </Button>
        </div>
      )}
    </div>
  );
}
