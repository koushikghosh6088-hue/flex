import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, FileText, Building2, Calendar, IndianRupee, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          vendors (
            name
          )
        `)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">Purchase History</h2>
           <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Inbound Asset Records</p>
        </div>
        <Button onClick={() => window.location.pathname = '/purchase-entry'} className="w-full sm:w-auto h-12 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-100 font-bold border-none hover:bg-orange-700 transition-all">
          <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
          Record New Purchase
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {purchases.map((purchase) => (
          <Card key={purchase.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b border-neutral-50">
               <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                     <FileText size={20} />
                  </div>
                  <span className="bg-neutral-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                     Invoice
                  </span>
               </div>
               <CardTitle className="mt-4 text-lg font-black tracking-tight text-neutral-900">
                  {purchase.notes || 'No Invoice Ref'}
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400">
                     <Building2 size={16} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Vendor</p>
                     <p className="text-sm font-bold text-neutral-700 uppercase">{purchase.vendors?.name || 'N/A'}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400">
                        <Calendar size={16} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Date</p>
                        <p className="text-sm font-bold text-neutral-700">{new Date(purchase.purchase_date).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                        <IndianRupee size={16} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Total</p>
                        <p className="text-lg font-black text-neutral-900 tabular-nums">₹{purchase.total_amount}</p>
                     </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {purchases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-neutral-200">
          <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-neutral-200">
            <ShoppingCart className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-black text-neutral-900">History Empty</h3>
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-2 mb-8 text-center px-6">No inbound purchase records detected</p>
          <Button onClick={() => window.location.pathname = '/purchase-entry'} className="h-12 px-8 rounded-2xl bg-neutral-900 text-white shadow-xl shadow-neutral-200 font-bold">
            <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
            Record First Purchase
          </Button>
        </div>
      )}
    </div>
  );
}
