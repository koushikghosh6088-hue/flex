import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Plus, Minus, CreditCard, Loader2, Store, ArrowRight, Ruler, IndianRupee, Package, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

import { useData } from '../contexts/DataContext';

export default function POSPage() {
  const { profile } = useAuth();
  const { products, stores, loading: dataLoading, refreshMaterials } = useData();
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLineEditorOpen, setIsLineEditorOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [searchTerm, setSearchSearchTerm] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', paymentMethod: 'Cash' });
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const [lineDraft, setLineDraft] = useState({
    widthFt: '10',
    heightFt: '10',
    quantity: '1',
    rate: '',
    margin: '0'
  });

  useEffect(() => {
    if (profile?.role === 'store_manager' && profile.store_id) {
      setSelectedStoreId(profile.store_id);
    } else if (profile?.role === 'owner' && stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [profile, stores]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId),
    [stores, selectedStoreId]
  );

  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const openLineEditor = (product: any) => {
    if (!selectedStoreId) {
      toast.error('Select a store before billing');
      return;
    }
    setSelectedProduct(product);
    setLineDraft({
      widthFt: '4',
      heightFt: '6',
      quantity: '1',
      rate: String(product.selling_price || ''),
      margin: '0'
    });
    setIsLineEditorOpen(true);
  };

  const addLineToCart = () => {
    const width = parseFloat(lineDraft.widthFt);
    const height = parseFloat(lineDraft.heightFt);
    const qty = parseInt(lineDraft.quantity);
    const rate = parseFloat(lineDraft.rate);

    if (!selectedProduct || isNaN(width) || isNaN(height) || isNaN(qty) || isNaN(rate)) {
      toast.error('Invalid size, quantity or rate');
      return;
    }

    const chargedArea = width * height;
    const lineTotal = chargedArea * rate * qty;

    setCart(prev => [...prev, {
      ...selectedProduct,
      lineId: `${selectedProduct.id}-${Date.now()}`,
      widthFt: width,
      heightFt: height,
      quantity: qty,
      rate: rate,
      chargedAreaSqft: chargedArea,
      lineTotal: lineTotal
    }]);

    setIsLineEditorOpen(false);
  };

  const removeFromCart = (lineId: string) => {
    setCart(prev => prev.filter(item => item.lineId !== lineId));
  };

  const handleCheckout = async () => {
    if (!profile || !selectedStoreId) return;
    setLoading(true);
    try {
      const response = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStoreId,
          userId: profile.id,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          paymentMode: customerInfo.paymentMethod,
          totalAmount: cart.reduce((sum, item) => sum + item.lineTotal, 0),
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            rate: item.rate,
            width_ft: item.widthFt,
            height_ft: item.heightFt,
            charged_area_sqft: item.chargedAreaSqft
          }))
        })
      });

      if (!response.ok) throw new Error('Transaction failed');

      toast.success('Sale completed successfully');
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading && stores.length === 0) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
      {/* Header & Store Selector */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-neutral-900 p-6 rounded-[2rem] text-white shadow-xl">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center">
              <Store size={24} strokeWidth={2.5} />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Revenue Terminal</p>
              <h2 className="text-xl font-black">{selectedStore?.name || 'Select Node'}</h2>
           </div>
        </div>

        {profile?.role === 'owner' && (
          <select 
            className="bg-white/10 border border-white/10 rounded-xl px-4 py-2 font-bold outline-none"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
          >
            {stores.map(s => <option key={s.id} value={s.id} className="text-neutral-900">{s.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Product Catalog */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <Input 
                placeholder="Search products for billing..." 
                className="pl-12 h-14 rounded-2xl border-none shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
              {filteredProducts.map(p => (
                <Card key={p.id} className="rounded-3xl border-none shadow-sm hover:shadow-lg transition-all cursor-pointer group" onClick={() => openLineEditor(p)}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-900 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                          <Package size={24} />
                       </div>
                       <div>
                          <h4 className="font-black text-neutral-900">{p.name}</h4>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">{p.unit}</p>
                       </div>
                    </div>
                    <Plus className="text-neutral-300 group-hover:text-orange-600" />
                  </CardContent>
                </Card>
              ))}
           </div>
        </div>

        {/* Cart/Summary */}
        <div className="flex flex-col bg-white rounded-[2.5rem] shadow-xl shadow-neutral-200/50 overflow-hidden">
           <div className="p-6 border-b border-neutral-50 flex items-center justify-between bg-neutral-50">
              <h3 className="font-black text-neutral-900 flex items-center gap-2">
                 <ShoppingCart size={18} /> Active Cart
              </h3>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-[10px] font-black">{cart.length} ITEMS</span>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.lineId} className="p-4 bg-neutral-50 rounded-2xl flex items-center justify-between group">
                   <div>
                      <p className="font-black text-sm text-neutral-900">{item.name}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
                         {item.widthFt}x{item.heightFt} ft • Qty {item.quantity}
                      </p>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="font-black text-neutral-900 tabular-nums">₹{item.lineTotal.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeFromCart(item.lineId)}>
                         <Minus size={14} strokeWidth={3} />
                      </Button>
                   </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                   <ShoppingCart size={48} className="mb-4" />
                   <p className="font-bold text-sm">Cart is empty</p>
                </div>
              )}
           </div>

           <div className="p-8 bg-neutral-900 text-white space-y-6">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Total Amount</span>
                 <span className="text-3xl font-black tabular-nums">₹{cart.reduce((s, i) => s + i.lineTotal, 0).toFixed(2)}</span>
              </div>
              <Button 
                className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-lg shadow-xl shadow-orange-950/40"
                disabled={cart.length === 0}
                onClick={() => setIsCheckoutOpen(true)}
              >
                Checkout Terminal
              </Button>
           </div>
        </div>
      </div>

      {/* Line Editor Modal */}
      <Dialog open={isLineEditorOpen} onOpenChange={setIsLineEditorOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-md">
           <DialogHeader><DialogTitle className="text-2xl font-black">Configure Item</DialogTitle></DialogHeader>
           <div className="space-y-4 py-4">
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                 <p className="text-[10px] font-black text-neutral-400 uppercase">Product</p>
                 <h3 className="text-xl font-black">{selectedProduct?.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-neutral-400">Width (ft)</Label>
                    <Input type="number" className="h-12 rounded-xl font-black" value={lineDraft.widthFt} onChange={e => setLineDraft({...lineDraft, widthFt: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-neutral-400">Height (ft)</Label>
                    <Input type="number" className="h-12 rounded-xl font-black" value={lineDraft.heightFt} onChange={e => setLineDraft({...lineDraft, heightFt: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-neutral-400">Quantity</Label>
                    <Input type="number" className="h-12 rounded-xl font-black" value={lineDraft.quantity} onChange={e => setLineDraft({...lineDraft, quantity: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-neutral-400">Rate / Sqft</Label>
                    <Input type="number" className="h-12 rounded-xl font-black" value={lineDraft.rate} onChange={e => setLineDraft({...lineDraft, rate: e.target.value})} />
                 </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-2xl text-right">
                 <p className="text-[10px] font-black text-orange-400 uppercase">Subtotal</p>
                 <p className="text-2xl font-black text-orange-700">₹{((parseFloat(lineDraft.widthFt) || 0) * (parseFloat(lineDraft.heightFt) || 0) * (parseFloat(lineDraft.rate) || 0) * (parseInt(lineDraft.quantity) || 0)).toFixed(2)}</p>
              </div>
           </div>
           <DialogFooter>
              <Button className="w-full h-14 rounded-2xl bg-neutral-900 text-white font-black" onClick={addLineToCart}>Add to Billing</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-md">
           <DialogHeader><DialogTitle className="text-2xl font-black">Sale Authorization</DialogTitle></DialogHeader>
           <div className="space-y-4 py-4">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-neutral-400">Customer Identity</Label>
                 <Input placeholder="Full Name" className="h-12 rounded-xl" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                 <Input placeholder="Phone Number" className="h-12 rounded-xl" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase text-neutral-400">Settlement Method</Label>
                 <select className="w-full h-12 rounded-xl bg-neutral-50 px-3 font-bold" value={customerInfo.paymentMethod} onChange={e => setCustomerInfo({...customerInfo, paymentMethod: e.target.value})}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="Card">Card</option>
                 </select>
              </div>
           </div>
           <DialogFooter>
              <Button className="w-full h-14 rounded-2xl bg-orange-600 text-white font-black" onClick={handleCheckout} disabled={loading}>
                 {loading ? 'Processing...' : 'Confirm & Print Invoice'}
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
