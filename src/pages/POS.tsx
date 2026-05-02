import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Plus, Minus, CreditCard, Loader2, Store, ArrowRight, Ruler, IndianRupee } from 'lucide-react';
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
import { demoProducts } from '../lib/demoData';

type StorePrice = {
  store_id: string;
  finished_product_id: string;
  selling_price: number;
};

export default function POSPage() {
  const { profile } = useAuth();
  const { products, stores, loading: dataLoading, refreshMaterials } = useData();
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLineEditorOpen, setIsLineEditorOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [storePrices, setStorePrices] = useState<StorePrice[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', paymentMethod: 'cash' });
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [lineDraft, setLineDraft] = useState({
    widthFt: '4',
    heightFt: '6',
    quantity: '1',
    rate: '',
    margin: '0.1'
  });

  useEffect(() => {
    if (profile?.role === 'store_manager' && profile.store_id) {
      setSelectedStoreId(profile.store_id);
    }
  }, [profile]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId),
    [stores, selectedStoreId]
  );

  useEffect(() => {
    const fetchStorePrices = async () => {
      if (!selectedStoreId) {
        setStorePrices([]);
        return;
      }

      setPriceLoading(true);
      try {
        const { data, error } = await supabase
          .from('store_product_prices')
          .select('store_id, finished_product_id, selling_price')
          .eq('store_id', selectedStoreId);

        if (error) throw error;
        setStorePrices((data || []) as StorePrice[]);
      } catch (error: any) {
        console.warn('Store price overrides unavailable; using base catalog prices.', error);
        setStorePrices([]);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchStorePrices();
  }, [selectedStoreId]);

  useEffect(() => {
    setCart([]);
  }, [selectedStoreId]);

  const pricedProducts = useMemo(() => {
    return products.map((product) => {
      const override = storePrices.find((price) => price.finished_product_id === product.id);
      return {
        ...product,
        effective_price: Number(override?.selling_price ?? product.selling_price ?? 0),
        has_store_price: Boolean(override)
      };
    });
  }, [products, storePrices]);

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
      rate: String(product.effective_price || ''),
      margin: '0.1'
    });
    setIsLineEditorOpen(true);
  };

  const addLineToCart = () => {
    const widthFt = Number(lineDraft.widthFt);
    const heightFt = Number(lineDraft.heightFt);
    const quantity = Number(lineDraft.quantity);
    const rate = Number(lineDraft.rate);

    if (!selectedProduct || widthFt <= 0 || heightFt <= 0 || quantity <= 0 || rate < 0) {
      toast.error('Enter valid size, quantity, and selling price');
      return;
    }

    const lineId = `${selectedProduct.id}-${Date.now()}`;
    const margin = Number(lineDraft.margin || 0.1);
    const chargedAreaSqft = (widthFt + (2 * margin)) * (heightFt + (2 * margin));
    const wastageSqft = chargedAreaSqft - (widthFt * heightFt);
    const lineTotal = chargedAreaSqft * rate * quantity;

    setCart(prev => {
      return [...prev, {
        ...selectedProduct,
        lineId,
        widthFt,
        heightFt,
        margin,
        quantity,
        effective_price: rate,
        chargedAreaSqft,
        wastageSqft,
        pipeLengthFt: (widthFt * 2) * quantity, // 2 * width as per requirement 4
        lineTotal
      }];
    });
    setIsLineEditorOpen(false);
    setSelectedProduct(null);
  };

  const removeFromCart = (lineId: string) => {
    setCart(prev => prev.filter(item => item.lineId !== lineId));
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(lineId);
    } else {
      setCart(prev =>
        prev.map(item =>
          item.lineId === lineId ? {
            ...item,
            quantity,
            pipeLengthFt: item.widthFt * quantity,
            lineTotal: item.chargedAreaSqft * item.effective_price * quantity
          } : item
        )
      );
    }
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + item.lineTotal, 0);
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
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            rate: item.effective_price,
            width_ft: item.widthFt,
            height_ft: item.heightFt,
            margin: item.margin,
            charged_area_sqft: item.chargedAreaSqft,
            wastage_sqft: item.wastageSqft,
            pipe_length_ft: item.pipeLengthFt
          }))
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete sale');
      }

      const result = await response.json();
      toast.success(`Sale completed: ${result.billNumber}`);
      setCart([]);
      setIsCheckoutOpen(false);
      setCustomerInfo({ name: '', phone: '', paymentMethod: 'cash' });
      refreshMaterials();
    } catch (error: any) {
      const hasDemoItems = cart.some((item) => demoProducts.some((product) => product.id === item.id));
      if (hasDemoItems) {
        const billNumber = `${selectedStore?.code || 'DEMO'}-${Date.now().toString().slice(-6)}`;
        toast.success(`Demo sale completed: ${billNumber}`);
        setCart([]);
        setIsCheckoutOpen(false);
        setCustomerInfo({ name: '', phone: '', paymentMethod: 'cash' });
      } else {
        toast.error('Checkout failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading && products.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (profile?.role === 'store_manager' && !profile.store_id) {
    return (
      <div className="bg-white rounded-[2rem] p-10 text-center shadow-sm">
        <Store className="h-12 w-12 text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-neutral-900">Store assignment required</h2>
        <p className="text-sm font-bold text-neutral-400 mt-2">This manager account is not linked to a store.</p>
      </div>
    );
  }

  if (profile?.role === 'owner' && !selectedStoreId) {
    return (
      <div className="max-w-6xl mx-auto py-4 md:py-8">
        <div className="app-panel rounded-[2rem] p-6 md:p-10 mb-6 overflow-hidden relative">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.16),transparent_22rem)] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 dark:bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-600 mb-4">
                <Store size={14} />
                POS Access
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 dark:text-white text-balance">Choose a billing store</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-3 max-w-xl">Every transaction, price override, and stock deduction will be isolated to the selected branch.</p>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-white/10 border border-white/70 dark:border-white/10 px-5 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Stores</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white">{stores.length}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => setSelectedStoreId(store.id)}
              className="text-left bg-white/90 dark:bg-white/8 rounded-[2rem] p-6 shadow-sm border border-white/80 dark:border-white/10 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-100/60 dark:hover:shadow-black/20 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 flex items-center justify-center mb-5">
                <Store size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white">{store.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{store.code}</p>
              <div className="mt-8 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Dedicated register</span>
                <span className="h-9 w-9 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center">
                  <ArrowRight size={16} />
                </span>
              </div>
              <div className="mt-5 flex items-center text-orange-600 text-xs font-black uppercase tracking-widest">
                Open POS <ArrowRight size={14} className="ml-2" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-900 text-white rounded-[2rem] px-5 py-4 md:px-8 md:py-5 shadow-xl shadow-neutral-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center shrink-0">
            <Store size={26} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Active Billing Store</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{selectedStore?.name || 'Assigned Store'}</h2>
          </div>
        </div>
        {profile?.role === 'owner' && (
          <select
            className="h-12 rounded-2xl bg-white/10 border border-white/10 px-4 text-sm font-black outline-none focus:ring-2 focus:ring-orange-500"
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id} className="text-neutral-900">{store.name}</option>
            ))}
          </select>
        )}
      </div>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Complete Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-2xl bg-orange-50 text-orange-700 px-4 py-3 text-xs font-black uppercase tracking-widest">
              {selectedStore?.name || 'Store'} billing
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Customer Name</Label>
              <Input 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Customer Phone</Label>
              <Input 
                className="h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Payment Method</Label>
              <select 
                className="w-full h-12 rounded-xl bg-neutral-50 border-neutral-100 font-bold px-3 outline-none focus:ring-2 focus:ring-orange-600/20 transition-all"
                value={customerInfo.paymentMethod}
                onChange={(e) => setCustomerInfo({...customerInfo, paymentMethod: e.target.value})}
              >
                <option value="cash">Cash Payment</option>
                <option value="card">Card Payment</option>
                <option value="upi">UPI / Digital</option>
              </select>
            </div>
            <div className="pt-6 border-t border-neutral-100 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Total Amount Payable</p>
              <p className="text-4xl font-black text-orange-600 tabular-nums">Rs {getTotal().toFixed(2)}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="h-12 rounded-xl font-bold text-neutral-500" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckout} disabled={loading || cart.length === 0} className="h-12 rounded-xl font-bold bg-neutral-900 text-white shadow-xl shadow-neutral-200">
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <CreditCard className="mr-2 h-4 w-4" />}
              Confirm & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLineEditorOpen} onOpenChange={setIsLineEditorOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black bg-gradient-to-r from-neutral-900 to-orange-600 bg-clip-text text-transparent">Job Specifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-3">
            <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Product</p>
              <h3 className="text-xl font-black text-neutral-950">{selectedProduct?.name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Width (ft)</Label>
                <Input type="number" min="0" step="0.1" className="h-14 rounded-2xl bg-white border-2 border-neutral-100 font-black text-lg focus:border-orange-500" value={lineDraft.widthFt} onChange={(e) => setLineDraft({...lineDraft, widthFt: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Height (ft)</Label>
                <Input type="number" min="0" step="0.1" className="h-14 rounded-2xl bg-white border-2 border-neutral-100 font-black text-lg focus:border-orange-500" value={lineDraft.heightFt} onChange={(e) => setLineDraft({...lineDraft, heightFt: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Quantity</Label>
                <Input type="number" min="1" step="1" className="h-14 rounded-2xl bg-white border-2 border-neutral-100 font-black text-lg focus:border-orange-500" value={lineDraft.quantity} onChange={(e) => setLineDraft({...lineDraft, quantity: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Rate / Sqft</Label>
                <Input type="number" min="0" step="0.01" className="h-14 rounded-2xl bg-white border-2 border-neutral-100 font-black text-lg focus:border-orange-500" value={lineDraft.rate} onChange={(e) => setLineDraft({...lineDraft, rate: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-orange-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-700">Area</p>
                <p className="text-lg font-black text-orange-900 mt-1">{((Number(lineDraft.widthFt) + (2 * Number(lineDraft.margin || 0.1))) * (Number(lineDraft.heightFt) + (2 * Number(lineDraft.margin || 0.1))) || 0).toFixed(1)}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-700">Pipe</p>
                <p className="text-lg font-black text-blue-900 mt-1">{(Number(lineDraft.widthFt) * 2 * Number(lineDraft.quantity) || 0).toFixed(1)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Total</p>
                <p className="text-lg font-black text-emerald-900 mt-1">{((Number(lineDraft.widthFt) + (2 * Number(lineDraft.margin || 0.1))) * (Number(lineDraft.heightFt) + (2 * Number(lineDraft.margin || 0.1))) * Number(lineDraft.rate) * Number(lineDraft.quantity) || 0).toFixed(0)}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="h-14 rounded-2xl font-bold" onClick={() => setIsLineEditorOpen(false)}>Cancel</Button>
            <Button className="h-14 rounded-2xl font-black bg-neutral-900 text-white flex-1 hover:bg-orange-600 transition-colors" onClick={addLineToCart}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="border-none lg:border shadow-sm lg:shadow-md lg:rounded-[2rem] bg-white/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="px-4 py-4 md:px-8 md:py-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl md:text-2xl font-black tracking-tight">Touch Catalog</CardTitle>
                {priceLoading && <Loader2 className="animate-spin text-orange-600" size={20} />}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-8 md:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {pricedProducts.map((product) => (
                  <button
                    key={product.id}
                    className="group relative text-left bg-white border border-neutral-100 rounded-3xl p-5 cursor-pointer hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300 active:scale-[0.97]"
                    onClick={() => openLineEditor(product)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                        <Box size={24} />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Rate</p>
                        <p className="text-sm font-black text-neutral-900">Rs {product.effective_price}</p>
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-neutral-900 group-hover:text-orange-600 transition-colors mb-1">{product.name}</h3>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider line-clamp-1">{product.description}</p>
                    <div className="absolute bottom-4 right-5 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                       <PlusCircle className="text-orange-600" size={24} />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="order-1 lg:order-2">
          <Card className="sticky top-20 md:top-24 border-none lg:border shadow-sm lg:shadow-md lg:rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="px-4 py-4 md:px-6 md:py-6 border-b border-neutral-100 lg:border-none">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-black">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                  Active Cart
                </CardTitle>
                <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  {cart.length} SKUs
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-4 md:px-6">
              {cart.length === 0 ? (
                <div className="text-center py-12 lg:py-20">
                  <div className="w-20 h-20 bg-neutral-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-dashed border-neutral-200">
                    <ShoppingCart className="h-10 w-10 text-neutral-200" />
                  </div>
                  <p className="text-xs font-black text-neutral-400 uppercase tracking-[0.3em]">Cart Empty</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3 max-h-[35vh] lg:max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                    {cart.map((item) => (
                      <div key={item.id} className="group bg-neutral-50 p-4 rounded-3xl border border-neutral-100 flex items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-lg hover:shadow-neutral-100">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-neutral-900 truncate text-sm tracking-tight">{item.name}</h4>
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">{item.widthFt}x{item.heightFt} ft | Rs {item.effective_price.toFixed(2)}/sqft</p>
                          <p className="text-[10px] font-bold text-neutral-400 mt-0.5">Area {item.chargedAreaSqft.toFixed(1)} sqft incl. 3x3 wastage | Pipe {item.pipeLengthFt.toFixed(1)} ft</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-neutral-200/60 shadow-sm">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-orange-50 hover:text-orange-600"
                            onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" strokeWidth={3} />
                          </Button>
                          <span className="w-6 text-center text-xs font-black tabular-nums">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-orange-50 hover:text-orange-600"
                            onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" strokeWidth={3} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-6 border-t border-neutral-100 space-y-6">
                    <div className="flex justify-between items-center px-1">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-neutral-900 uppercase tracking-tighter">Gross Total</span>
                        <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Tax Inclusive</span>
                      </div>
                      <span className="text-3xl font-black text-orange-600 tabular-nums tracking-tighter">Rs {getTotal().toFixed(2)}</span>
                    </div>
                    <Button className="w-full h-16 rounded-[2rem] text-lg font-black bg-neutral-900 text-white shadow-2xl shadow-neutral-300 hover:bg-orange-600 transition-all active:scale-95" onClick={() => setIsCheckoutOpen(true)}>
                      <CreditCard className="mr-3 h-6 w-6" />
                      Finalize Order
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
