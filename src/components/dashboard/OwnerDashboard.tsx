import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, ShoppingCart, DollarSign, Box, CreditCard, Store, AlertTriangle, Truck, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

export default function OwnerDashboard() {
  const { stores, products, materials, vendors, batches, ledger } = useData();
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  const [sales, setSales] = useState<any[]>([]);
  const [stockRows, setStockRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let salesQuery = supabase.from('sales').select('*').order('created_at');
      let stockQuery = supabase.from('store_stock').select('store_id, quantity');

      if (selectedStoreId !== 'all') {
        salesQuery = salesQuery.eq('store_id', selectedStoreId);
        stockQuery = stockQuery.eq('store_id', selectedStoreId);
      }

      const [salesResult, stockResult] = await Promise.all([salesQuery, stockQuery]);
      setSales(salesResult.data || []);
      setStockRows(stockResult.data || []);
      setLoading(false);
    };

    load();
  }, [selectedStoreId]);

  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const profit = sales.reduce((sum, sale) => sum + Number(sale.gross_profit ?? sale.total_amount ?? 0), 0);
  const vendorDues = vendors.reduce((sum: number, vendor: any) => sum + Number(vendor.current_balance || 0), 0);
  const lowStockItems = materials.flatMap((material: any) => {
    const threshold = Number(material.low_stock_threshold || 100);
    return (material.store_stock || [])
      .filter((stock: any) => selectedStoreId === 'all' || stock.store_id === selectedStoreId)
      .filter((stock: any) => Number(stock.quantity || 0) <= threshold)
      .map((stock: any) => ({
        material: material.name,
        store: stores.find((store) => store.id === stock.store_id)?.name || 'Store',
        quantity: Number(stock.quantity || 0),
        threshold
      }));
  });

  const alerts = [
    ...lowStockItems.slice(0, 4).map((item) => ({
      type: 'Low Stock',
      message: `${item.material} at ${item.store}: ${item.quantity} left`,
      tone: 'text-red-600 bg-red-50'
    })),
    ...vendors.filter((vendor: any) => Number(vendor.current_balance || 0) > 0).slice(0, 3).map((vendor: any) => ({
      type: 'Vendor Due',
      message: `${vendor.name}: Rs ${Number(vendor.current_balance || 0).toFixed(0)} pending`,
      tone: 'text-amber-700 bg-amber-50'
    })),
    ...(profit < revenue * 0.25 && revenue > 0 ? [{
      type: 'Profitability',
      message: 'Gross profit has dropped below 25% of revenue',
      tone: 'text-orange-700 bg-orange-50'
    }] : [])
  ];
  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    sales.forEach((sale) => {
      const day = new Date(sale.created_at).toLocaleDateString('en-IN', { weekday: 'short' });
      grouped[day] = (grouped[day] || 0) + Number(sale.total_amount || 0);
    });
    return Object.entries(grouped).map(([name, revenue]) => ({ name, revenue }));
  }, [sales]);

  const storeBreakdown = useMemo(() => {
    return stores.map((store) => ({
      name: store.name,
      revenue: sales
        .filter((sale) => sale.store_id === store.id)
        .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0)
    }));
  }, [stores, sales]);

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900">System Command</h1>
           <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-1">Multi-store sales overview</p>
        </div>
        <div className="flex gap-3">
          <select
            className="h-12 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
          >
            <option value="all">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <Button
            className="h-12 rounded-2xl bg-orange-600 text-white font-bold px-6 shadow-lg shadow-orange-100 border-none hover:bg-orange-700 transition-all"
            onClick={() => {
              window.history.pushState({}, '', '/pos');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            <CreditCard className="mr-2 h-5 w-5" strokeWidth={3} />
            POS
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Revenue', value: `Rs ${revenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12% from last week' },
          { label: 'Active Batches', value: String(batches.filter(b => b.remaining_usable_area_sqft > 0).length), icon: Box, color: 'text-orange-600', bg: 'bg-orange-50', trend: 'FIFO Active' },
          { label: 'Gross Profit', value: `Rs ${profit.toFixed(2)}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', trend: `${((profit/revenue)*100).toFixed(1)}% margin` },
          { label: 'Vendor Payable', value: `Rs ${vendorDues.toFixed(0)}`, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50', trend: `${vendors.length} vendors` },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-none shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300 bg-white relative">
            <div className={`absolute top-0 left-0 w-1 h-full ${kpi.color.replace('text-', 'bg-')}`} />
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 ${kpi.bg} rounded-2xl flex items-center justify-center ${kpi.color}`}>
                   <kpi.icon size={24} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-neutral-400 bg-neutral-50 px-2 py-1 rounded-lg uppercase tracking-widest">{kpi.trend}</span>
              </div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight">{kpi.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
         <Card className="lg:col-span-2 border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 md:p-8">
               <CardTitle className="text-xl font-black tracking-tight">Revenue Velocity</CardTitle>
               <CardDescription className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-1">Filtered by selected store</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-8 pt-0">
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.length ? chartData : [{ name: 'Empty', revenue: 0 }]}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800}} />
                      <Area type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

         <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 md:p-8">
               <CardTitle className="text-xl font-black tracking-tight">Store Split</CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-0">
               <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={storeBreakdown.length ? storeBreakdown : [{ name: 'Empty', revenue: 0 }]}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#ea580c" radius={[8, 8, 8, 8]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2rem] bg-white dark:bg-white/8 overflow-hidden">
          <CardHeader className="p-6 md:p-8">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              Owner Command Alerts
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-1">Low stock, vendor dues, and profitability checks</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            {alerts.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 text-emerald-700 p-5 font-bold">No critical alerts right now.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((alert, index) => (
                  <div key={index} className={`rounded-2xl p-4 ${alert.tone}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{alert.type}</p>
                        <p className="text-sm font-black mt-1">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-white dark:bg-white/8 overflow-hidden">
          <CardHeader className="p-6 md:p-8">
            <CardTitle className="text-xl font-black tracking-tight">Stock Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0 space-y-3">
            {materials.slice(0, 5).map((material: any) => {
              const totalStoreStock = (material.store_stock || [])
                .filter((stock: any) => selectedStoreId === 'all' || stock.store_id === selectedStoreId)
                .reduce((sum: number, stock: any) => sum + Number(stock.quantity || 0), 0);
              
              const isRoll = material.material_kind === 'flex_roll';
              
              return (
                <div key={material.id} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-white/10 p-3 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRoll ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      <Box size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{material.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{isRoll ? 'Usable Sqft' : material.unit}</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-orange-600">{totalStoreStock.toLocaleString()}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {loading && <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Refreshing dashboard...</p>}
    </div>
  );
}
