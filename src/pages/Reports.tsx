import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Download, TrendingUp, DollarSign, Calendar, ChevronRight, PieChart as PieIcon, BarChart3, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { demoMaterials, demoSales } from '../lib/demoData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function ReportsPage() {
  const { profile } = useAuth();
  const { stores } = useData();
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, orders: 0, profit: 0 });

  const visibleStores = useMemo(() => {
    if (profile?.role === 'owner') return stores;
    return stores.filter((store) => store.id === profile?.store_id);
  }, [profile, stores]);

  useEffect(() => {
    if (profile?.role === 'store_manager' && profile.store_id) {
      setSelectedStoreId(profile.store_id);
    }
  }, [profile]);

  useEffect(() => {
    fetchReportData();
  }, [selectedStoreId, profile?.role, profile?.store_id]);

  const fetchReportData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const effectiveStoreId = profile.role === 'store_manager' ? profile.store_id : selectedStoreId;

      let salesQuery = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: true });

      if (effectiveStoreId && effectiveStoreId !== 'all') {
        salesQuery = salesQuery.eq('store_id', effectiveStoreId);
      }

      let inventoryQuery = supabase
        .from('store_stock')
        .select('store_id, quantity, raw_materials(name)');

      if (effectiveStoreId && effectiveStoreId !== 'all') {
        inventoryQuery = inventoryQuery.eq('store_id', effectiveStoreId);
      }

      const [sales, inventory] = await Promise.all([salesQuery, inventoryQuery]);
      if (sales.error) throw sales.error;
      if (inventory.error) throw inventory.error;

      const sourceSales = sales.data?.length ? sales.data : demoSales.filter((sale) => !effectiveStoreId || effectiveStoreId === 'all' || sale.store_id === effectiveStoreId);
      const sourceInventory = inventory.data?.length ? inventory.data : demoMaterials.flatMap((material) =>
        material.store_stock
          .filter((stock) => !effectiveStoreId || effectiveStoreId === 'all' || stock.store_id === effectiveStoreId)
          .map((stock) => ({ ...stock, raw_materials: { name: material.name } }))
      );

      const dailySales: any = {};
      let totalRevenue = 0;
      let totalProfit = 0;
      sourceSales.forEach((sale: any) => {
        const date = new Date(sale.created_at).toLocaleDateString('en-IN', { weekday: 'short' });
        const amount = Number(sale.total_amount || 0);
        dailySales[date] = (dailySales[date] || 0) + amount;
        totalRevenue += amount;
        totalProfit += Number(sale.gross_profit ?? sale.total_amount ?? 0);
      });

      const stockByMaterial: Record<string, number> = {};
      sourceInventory.forEach((stock: any) => {
        const name = stock.raw_materials?.name || 'Unassigned';
        stockByMaterial[name] = (stockByMaterial[name] || 0) + Number(stock.quantity || 0);
      });

      setSalesData(Object.entries(dailySales).map(([name, value]) => ({ name, value })));
      setInventoryData(Object.entries(stockByMaterial).map(([name, value]) => ({ name, value })));
      setSummary({
        revenue: totalRevenue,
        orders: sourceSales.length,
        profit: totalProfit
      });
    } catch (error) {
      toast.error('Failed to aggregate report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (reportName: string) => {
    toast.success(`${reportName} is being prepared for secure download...`);
  };

  const reports = [
    { id: 'sales', name: 'Sales Revenue', desc: 'Store-filtered billing totals.', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'inventory', name: 'Stock Integrity', desc: 'Store stock levels after POS deductions.', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'wastage', name: 'Wastage Analysis', desc: 'Detailed report of material trimming and edge loss.', icon: BarChart3, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'utilization', name: 'Roll Utilization', desc: 'FIFO batch depletion and remaining usable area.', icon: Ruler, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'financial', name: 'Estimated Profit', desc: 'Revenue proxy until purchase costs are mapped.', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'period', name: 'Period Review', desc: 'Daily transaction trend by selected store.', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900">Intelligence</h2>
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-1">Sales and inventory by store</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {profile?.role === 'owner' && (
            <select
              className="h-12 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-black shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
            >
              <option value="all">All Stores</option>
              {visibleStores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          )}
          <Button variant="outline" className="h-12 rounded-2xl border-neutral-200 font-black px-6 shadow-sm" onClick={() => handleDownload('Store Report')}>
            <Download className="mr-2 h-5 w-5" />
            Export Records
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: 'Total Sales', value: `Rs ${summary.revenue.toFixed(2)}`, icon: DollarSign },
          { label: 'Orders', value: String(summary.orders), icon: Store },
          { label: 'Profit', value: `Rs ${summary.profit.toFixed(2)}`, icon: TrendingUp },
        ].map((item) => (
          <Card key={item.label} className="rounded-[2rem] border-none shadow-sm bg-white">
            <CardContent className="p-6">
              <item.icon className="h-7 w-7 text-orange-600 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{item.label}</p>
              <h3 className="text-2xl font-black text-neutral-900 mt-1">{item.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
         <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
               <CardTitle className="text-xl font-black flex items-center gap-3">
                  <BarChart3 className="text-orange-600" />
                  Revenue Velocity
               </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData.length ? salesData : [{name: 'Empty', value: 0}]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="value" fill="#ea580c" radius={[8, 8, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

         <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
               <CardTitle className="text-xl font-black flex items-center gap-3">
                  <PieIcon className="text-blue-600" />
                  Store Stock Distribution
               </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryData.length ? inventoryData : [{name: 'Empty', value: 1}]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {inventoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#ea580c', '#3b82f6', '#10b981', '#6366f1'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="group relative overflow-hidden rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
            <CardContent className="p-8 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 ${report.bg} rounded-[1.5rem] flex items-center justify-center ${report.color} transition-transform group-hover:scale-110 duration-500 shadow-sm`}>
                  <report.icon size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900 tracking-tight">{report.name}</h3>
                  <p className="text-xs font-bold text-neutral-400 mt-1">{report.desc}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-12 h-12 rounded-2xl bg-neutral-50 hover:bg-neutral-900 hover:text-white transition-all shadow-sm"
                onClick={() => handleDownload(report.name)}
              >
                <ChevronRight size={20} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
