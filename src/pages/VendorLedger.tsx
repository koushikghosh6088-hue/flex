import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowDownLeft, 
  History, 
  Calendar, 
  FileText, 
  CreditCard, 
  Hash, 
  Filter, 
  FileSpreadsheet,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function VendorLedgerPage({ vendor, onBack }: { vendor: any, onBack: () => void }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Fetch purchases
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases')
          .select('*')
          .eq('vendor_id', vendor.id)
          .order('purchase_date', { ascending: false });

        if (purchasesError) throw purchasesError;

        // Fetch payments
        const { data: payments, error: paymentsError } = await supabase
          .from('vendor_payments')
          .select('*')
          .eq('vendor_id', vendor.id)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;

        // Combine
        const allTransactions = [
          ...(purchases || []).map(p => ({
            id: p.id,
            date: p.purchase_date,
            type: 'purchase',
            description: `Stock Purchase Record`,
            debit: p.total_amount,
            credit: 0
          })),
          ...(payments || []).map(p => ({
            id: p.id,
            date: p.payment_date,
            type: 'payment',
            description: `Financial Disbursement - ${p.payment_method}`,
            debit: 0,
            credit: p.amount
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setTransactions(allTransactions);
      } catch (error: any) {
        toast.error('Failed to reconstruct ledger history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [vendor.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-12 w-12 rounded-2xl bg-white border border-neutral-100 shadow-sm hover:bg-neutral-50">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
          </Button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">{vendor.name}</h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Financial Reconciliation Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none h-12 rounded-2xl border-neutral-200 font-bold px-6 shadow-sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button className="flex-1 sm:flex-none h-12 rounded-2xl bg-neutral-900 text-white font-bold px-6 shadow-xl shadow-neutral-200 border-none">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
         <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
               <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Payables</p>
               <h3 className="text-2xl font-black text-neutral-900 tracking-tight">₹{transactions.reduce((acc, curr) => acc + curr.debit, 0)}</h3>
            </CardContent>
         </Card>
         <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
               <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Settled Amount</p>
               <h3 className="text-2xl font-black text-emerald-600 tracking-tight">₹{transactions.reduce((acc, curr) => acc + curr.credit, 0)}</h3>
            </CardContent>
         </Card>
         <Card className="rounded-[2rem] border-none shadow-sm bg-orange-600 text-white overflow-hidden">
            <CardContent className="p-6">
               <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1">Outstanding Risk</p>
               <h3 className="text-2xl font-black tracking-tight">
                  ₹{transactions.reduce((acc, curr) => acc + curr.debit - curr.credit, 0)}
               </h3>
            </CardContent>
         </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-neutral-900 text-white p-6 md:p-8 flex flex-row items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                 <History size={20} strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl font-black">Transaction Stream</CardTitle>
           </div>
           <div className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Verified Blockchain Index
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-50">
            {transactions.length === 0 ? (
              <div className="py-24 text-center">
                 <Clock className="w-16 h-16 text-neutral-100 mx-auto mb-4" />
                 <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No transaction history detected</p>
              </div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      t.type === 'purchase' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {t.type === 'purchase' ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                           t.type === 'purchase' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                         }`}>
                           {t.type}
                         </span>
                         <span className="text-[10px] font-bold text-neutral-400 tabular-nums">
                            {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                         </span>
                      </div>
                      <p className="font-black text-neutral-900 tracking-tight text-lg">{t.description}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Ref: {t.id.slice(0, 12)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-10 border-t md:border-none pt-6 md:pt-0">
                    <div className="text-right flex flex-col">
                       <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Transaction Value</span>
                       <span className={`text-2xl font-black tabular-nums ${t.debit > 0 ? 'text-neutral-900' : 'text-emerald-600'}`}>
                          {t.debit > 0 ? `₹${t.debit}` : `₹${t.credit}`}
                       </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-neutral-50 hover:bg-white hover:shadow-md transition-all">
                       <ArrowUpRight size={20} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
