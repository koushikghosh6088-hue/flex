import React from 'react';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface PrintBillProps {
  bill: {
    bill_number: string;
    created_at: string;
    customer_name?: string;
    customer_phone?: string;
    items: any[];
    subtotal?: number;
    discount?: number;
    discount_type?: string;
    total: number;
    payment_mode: string;
    tax_amount?: number;
  };
  settings: {
    company_name: string;
    company_address: string;
    company_phone: string;
    company_gst: string;
    logo_url?: string;
  };
  format?: 'a4' | 'thermal';
}

export const PrintBill = React.forwardRef<HTMLDivElement, PrintBillProps>(({ bill, settings, format = 'a4' }, ref) => {
  const subtotal = bill.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const discountAmount = bill.discount_type === 'flat' ? (bill.discount || 0) : (subtotal * (bill.discount || 0) / 100);

  // GST Calculations (from bill props if available)
  const taxableValue = bill.taxable_amount || (bill.total - (bill.tax_amount || 0));
  const cgst = bill.cgst || (bill.tax_amount ? bill.tax_amount / 2 : 0);
  const sgst = bill.sgst || (bill.tax_amount ? bill.tax_amount / 2 : 0);

  if (format === 'thermal') {
    return (
      <div ref={ref} className="p-4 bg-white text-black font-mono w-[80mm] text-[10px] space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-sm font-bold uppercase">{settings.company_name}</h1>
          <p className="text-[8px]">{settings.company_address}</p>
          <p className="text-[8px]">GST: {settings.company_gst}</p>
          <p className="text-[8px]">Ph: {settings.company_phone}</p>
        </div>
        
        <div className="border-b border-dashed border-black" />
        
        <div className="flex justify-between">
          <span>Bill: {bill.bill_number}</span>
          <span>{new Date(bill.created_at).toLocaleDateString()}</span>
        </div>
        
        <div className="border-b border-dashed border-black" />
        
        <div className="space-y-1">
          {bill.items.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between uppercase">
                <span className="font-bold">{item.name}</span>
                <span>{(item.quantity * item.rate).toFixed(2)}</span>
              </div>
              <div className="text-[8px] flex justify-between">
                <span>{item.quantity} x {item.rate.toFixed(2)}</span>
                {item.gst_rate > 0 && <span>(GST {item.gst_rate}%)</span>}
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-b border-dashed border-black" />
        
        <div className="space-y-1 text-right">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[8px] font-normal">
            <span>Taxable Val</span>
            <span>{taxableValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[8px] font-normal">
            <span>CGST</span>
            <span>{cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[8px] font-normal">
            <span>SGST</span>
            <span>{sgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-black mt-1">
            <span>TOTAL</span>
            <span>₹{bill.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="text-center pt-4 border-t border-dashed border-black">
          <p className="font-bold">Thank You! Visit Again</p>
          <p className="text-[6px] mt-1 italic">Software: AI-POS Ecosystem</p>
        </div>
        
        <style>{`@media print { .thermal-print { width: 80mm; } body { padding: 0 !important; margin: 0 !important; } }`}</style>
      </div>
    );
  }

  return (
    <div ref={ref} className="p-12 bg-white text-black font-sans max-w-[800px] mx-auto print:p-8">
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-neutral-900 pb-8 mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{settings.company_name}</h1>
          <div className="space-y-1 text-[11px] font-bold uppercase tracking-widest text-neutral-500 max-w-sm">
             <p>{settings.company_address}</p>
             <div className="flex gap-4 pt-2">
                <span>PH: {settings.company_phone}</span>
                <span>GST: {settings.company_gst}</span>
             </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
           {settings.logo_url && (
             <img src={settings.logo_url} alt="Logo" className="h-16 mb-4 object-contain" referrerPolicy="no-referrer" />
           )}
           <div className="bg-neutral-900 text-white px-6 py-3 rounded-xl inline-block mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Tax Invoice</p>
              <p className="text-xl font-black mt-1">#{bill.bill_number}</p>
           </div>
           <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
             {new Date(bill.created_at).toLocaleString('en-IN', { dateStyle: 'full' })}
           </p>
        </div>
      </div>

      <div className="flex justify-between items-start mb-12">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Bill To</p>
          <p className="text-lg font-black text-neutral-900 uppercase">{bill.customer_name || 'Counter Sale'}</p>
          <p className="text-sm font-bold text-neutral-500">PH: {bill.customer_phone || 'N/A'}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Payment Status</p>
          <Badge className="bg-green-600 text-white border-none py-1.5 px-4 rounded-full font-black text-[10px] uppercase tracking-widest">
             Paid via {bill.payment_mode}
          </Badge>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-10">
        <thead>
          <tr className="border-y-2 border-neutral-900">
            <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest">Description</th>
            <th className="py-4 text-center text-[10px] font-black uppercase tracking-widest">Qty</th>
            <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest">Rate</th>
            <th className="py-4 text-center text-[10px] font-black uppercase tracking-widest">GST%</th>
            <th className="py-4 text-right text-[10px] font-black uppercase tracking-widest">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {bill.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-4">
                <span className="font-black text-neutral-900 uppercase text-sm block">{item.name}</span>
                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{item.size}</span>
              </td>
              <td className="py-4 text-center tabular-nums font-bold">{item.quantity}</td>
              <td className="py-4 text-right tabular-nums font-bold">₹{item.rate.toFixed(2)}</td>
              <td className="py-4 text-center tabular-nums font-bold text-[10px] text-neutral-400">{item.gst_rate}%</td>
              <td className="py-4 text-right tabular-nums font-black">₹{(item.quantity * item.rate).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-end pt-8 border-t-2 border-neutral-100">
        <div className="w-full max-w-[320px] space-y-3">
          <div className="flex justify-between text-[10px] font-black text-neutral-400 uppercase tracking-widest">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-[10px] font-black text-orange-600 uppercase tracking-widest">
              <span>Discount</span>
              <span>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="h-px bg-neutral-100 my-4" />
          
          <div className="grid grid-cols-2 gap-y-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
             <span>Taxable Amt</span>
             <span className="text-right">₹{taxableValue.toFixed(2)}</span>
             <span>CGST</span>
             <span className="text-right">₹{cgst.toFixed(2)}</span>
             <span>SGST</span>
             <span className="text-right">₹{sgst.toFixed(2)}</span>
          </div>

          <div className="bg-neutral-900 text-white p-6 rounded-3xl flex justify-between items-center mt-6 shadow-2xl shadow-neutral-200">
            <div>
               <p className="text-[8px] font-black uppercase tracking-widest text-white/50 mb-1">Grand Total</p>
               <span className="text-3xl font-black tabular-nums">₹{bill.total.toFixed(2)}</span>
            </div>
            <Badge className="bg-white/10 text-white border-none py-1 px-3 text-[8px] font-black uppercase tracking-[0.2em]">{bill.payment_mode}</Badge>
          </div>
          
          <div className="pt-8 text-center space-y-2">
             <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Thank you for visiting {settings.company_name}!</p>
             <p className="text-[8px] font-bold text-neutral-200 uppercase tracking-widest">This is a system generated tax invoice</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
});

PrintBill.displayName = 'PrintBill';
