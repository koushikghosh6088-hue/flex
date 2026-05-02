import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, ShoppingCart, Layers, ArrowRightLeft, AlertTriangle, CreditCard, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { supabase } from '../../lib/supabase';
import { demoMaterials, demoSales } from '../../lib/demoData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function ManagerDashboard() {
  const { profile } = useAuth();
  const { stores } = useData();
  const [sales, setSales] = useState<any[]>([]);
  const [stockRows, setStockRows] = useState<any[]>([]);

  const store = stores.find((item) => item.id === profile?.store_id);

  useEffect(() => {
    const load = async () => {
      if (!profile?.store_id) return;
      const [salesResult, stockResult] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount, created_at')
          .eq('store_id', profile.store_id)
          .order('created_at'),
        supabase
          .from('store_stock')
          .select('quantity')
          .eq('store_id', profile.store_id)
      ]);

      setSales(salesResult.data?.length ? salesResult.data : demoSales.filter((sale) => sale.store_id === profile.store_id));
      setStockRows(stockResult.data?.length ? stockResult.data : demoMaterials.flatMap((material) => material.store_stock).filter((stock) => stock.store_id === profile.store_id));
    };

    load();
  }, [profile?.store_id]);

  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    sales.forEach((sale) => {
      const day = new Date(sale.created_at).toLocaleDateString('en-IN', { weekday: 'short' });
      grouped[day] = (grouped[day] || 0) + Number(sale.total_amount || 0);
    });
    return Object.entries(grouped).map(([name, sales]) => ({ name, sales }));
  }, [sales]);

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black tracking-tight text-neutral-900">Terminal Active</h1>
           <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-1">Store Node: {store?.name || profile?.store_id || 'Unassigned'}</p>
        </div>
        <Button 
          className="w-full sm:w-auto h-14 rounded-2xl bg-neutral-900 text-white font-black px-8 shadow-xl shadow-neutral-200 border-none hover:bg-orange-600 transition-all active:scale-95"
          onClick={() => {
            window.history.pushState({}, '', '/pos');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
        >
          <CreditCard className="mr-3 h-5 w-5" strokeWidth={2.5} />
          Launch POS
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: 'Store Sales', value: `Rs ${revenue.toFixed(2)}`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Orders Processed', value: String(sales.length), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Stock Records', value: String(stockRows.length), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-4 group-hover:scale-110 transition-transform`}>
                 <stat.icon size={24} strokeWidth={2.5} />
              </div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-neutral-900">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
         <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
               <CardTitle className="text-xl font-black tracking-tight uppercase tracking-widest">Store Velocity</CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-0">
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.length ? chartData : [{ name: 'Empty', sales: 0 }]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} dy={10} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="sales" radius={[10, 10, 10, 10]} barSize={24}>
                        {(chartData.length ? chartData : [{ name: 'Empty', sales: 0 }]).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 4 ? '#ea580c' : '#e2e8f0'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

         <div className="space-y-4 md:space-y-6">
            {[
              { title: 'Inventory Requisition', desc: 'Request material from central stock', icon: Layers, color: 'bg-blue-600' },
              { title: 'Price Review', desc: 'Update selling prices for this store', icon: Box, color: 'bg-orange-600', path: '/products' },
              { title: 'Inbound Transfer', desc: 'Review incoming stock transfers', icon: ArrowRightLeft, color: 'bg-neutral-900' },
            ].map((task) => (
              <button
                key={task.title}
                className="w-full text-left group bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-neutral-200/40 transition-all duration-300 flex items-center justify-between cursor-pointer border border-transparent hover:border-neutral-100"
                onClick={() => {
                  if (task.path) {
                    window.history.pushState({}, '', task.path);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
              >
                 <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 ${task.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                       <task.icon size={24} />
                    </div>
                    <div>
                       <h4 className="font-black text-neutral-900 tracking-tight">{task.title}</h4>
                       <p className="text-xs font-medium text-neutral-500 mt-0.5">{task.desc}</p>
                    </div>
                 </div>
              </button>
            ))}
         </div>
      </div>
    </div>
  );
}
