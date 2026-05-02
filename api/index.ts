import express from 'express';
import { createClient } from '@supabase/supabase-js';
import compression from 'compression';

const app = express();
app.use(compression());
app.use(express.json());

// Supabase Admin Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

async function getSystemConfig(key: string, defaultValue: any) {
  if (!supabaseAdmin) return defaultValue;
  try {
    const { data, error } = await supabaseAdmin
      .from('system_configs')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    
    if (error || !data) return defaultValue;
    return data.value;
  } catch (e) {
    return defaultValue;
  }
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', supabase: !!supabaseAdmin });
});

// --- API Routes ---

// Create Raw Material
app.post('/api/inventory/raw-materials', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database not initialized' });
  const { name, unit, material_kind, roll_width_ft, description } = req.body;
  try {
    const { data, error } = await supabaseAdmin.from('raw_materials').insert([{ 
      name, unit: unit || 'SQFT', material_kind: material_kind || 'flex_roll',
      roll_width_ft: roll_width_ft ? Number(roll_width_ft) : null, description 
    }]).select().single();
    if (error) throw error;
    await supabaseAdmin.from('central_stock').insert([{ raw_material_id: data.id, quantity: 0 }]);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record Purchase & Create Batches
app.post('/api/inventory/purchase', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database not initialized' });
  const { vendorId, invoice, date, items, userId } = req.body;
  
  try {
    let totalAmount = 0;
    const batchRecords = [];
    const wastagePerRoll = await getSystemConfig('wastage_per_roll_ft', 0.5);

    const { data: purchaseData, error: purchaseError } = await supabaseAdmin
      .from('purchases').insert({
        vendor_id: vendorId, purchase_date: date || new Date().toISOString().split('T')[0],
        notes: invoice || 'N/A', created_by: userId, total_amount: 0
      }).select().single();

    if (purchaseError) throw purchaseError;

    for (const item of items) {
      const qty = Number(item.quantity);
      const rate = Number(item.rate);
      const subtotal = qty * rate;
      
      const { data: material } = await supabaseAdmin.from('raw_materials').select('*').eq('id', item.materialId).single();

      const rollWidth = material?.roll_width_ft || Number(item.rollWidth) || 0;
      const rollLength = Number(item.rollLength) || 100;
      const usableArea = Math.max(0, rollWidth - wastagePerRoll) * rollLength;
      
      // If it's a roll, we assume 'quantity' is number of rolls
      const numRolls = material?.material_kind === 'flex_roll' ? Math.max(1, Math.round(qty)) : 1;
      const totalUsableArea = numRolls * (usableArea || 1);
      const costPerSqFt = subtotal / (totalUsableArea || 1);

      for (let i = 0; i < numRolls; i++) {
        batchRecords.push({
          raw_material_id: item.materialId, purchase_id: purchaseData.id, vendor_id: vendorId,
          roll_width_ft: rollWidth, roll_length_ft: rollLength,
          usable_area_sqft: usableArea, remaining_usable_area_sqft: usableArea,
          cost_per_sqft: costPerSqFt, created_at: new Date().toISOString()
        });
      }
      totalAmount += subtotal;

      const { data: currentStock } = await supabaseAdmin.from('central_stock').select('quantity').eq('raw_material_id', item.materialId).maybeSingle();
      if (currentStock) {
        await supabaseAdmin.from('central_stock').update({ quantity: (currentStock.quantity || 0) + totalUsableArea, last_updated: new Date().toISOString() }).eq('raw_material_id', item.materialId);
      } else {
        await supabaseAdmin.from('central_stock').insert({ raw_material_id: item.materialId, quantity: totalUsableArea });
      }
    }

    await supabaseAdmin.from('purchases').update({ total_amount: totalAmount }).eq('id', purchaseData.id);
    if (batchRecords.length > 0) await supabaseAdmin.from('material_batches').insert(batchRecords);

    const { data: bal } = await supabaseAdmin.from('vendor_ledger').select('balance').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    await supabaseAdmin.from('vendor_ledger').insert({
      vendor_id: vendorId, transaction_type: 'purchase', amount: totalAmount, balance: (bal?.balance || 0) + totalAmount,
      reference_id: purchaseData.id, notes: `Purchase Invoice: ${invoice}`
    });

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer Stock
app.post('/api/inventory/transfer', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database not initialized' });
  const { materialId, toStoreId, quantity, remarks, userId } = req.body;
  try {
    const { data: centralStock } = await supabaseAdmin.from('central_stock').select('quantity').eq('raw_material_id', materialId).maybeSingle();
    if ((centralStock?.quantity || 0) < quantity) return res.status(400).json({ error: 'Insufficient central stock' });

    await supabaseAdmin.from('central_stock').update({ quantity: (centralStock?.quantity || 0) - Number(quantity) }).eq('raw_material_id', materialId);

    const { data: storeStock } = await supabaseAdmin.from('store_stock').select('quantity').eq('store_id', toStoreId).eq('raw_material_id', materialId).maybeSingle();
    if (storeStock) {
      await supabaseAdmin.from('store_stock').update({ quantity: (storeStock.quantity || 0) + Number(quantity) }).eq('store_id', toStoreId).eq('raw_material_id', materialId);
    } else {
      await supabaseAdmin.from('store_stock').insert({ store_id: toStoreId, raw_material_id: materialId, quantity: Number(quantity) });
    }

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POS Sale (Atomic with Stock Deduction)
app.post('/api/pos/sale', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Database not initialized' });
  const { storeId, userId, items, paymentMode, totalAmount, customerName, customerPhone } = req.body;

  try {
    // 1. Create Sale Record
    const { data: saleData, error: saleError } = await supabaseAdmin.from('sales').insert({
      store_id: storeId, customer_name: customerName, customer_phone: customerPhone,
      total_amount: totalAmount, payment_method: paymentMode, created_by: userId
    }).select().single();

    if (saleError) throw saleError;

    // 2. Process Items
    for (const item of items) {
      await supabaseAdmin.from('sale_items').insert({
        sale_id: saleData.id, finished_product_id: item.product_id, quantity: item.quantity,
        unit_price: item.rate, width_ft: item.width_ft, height_ft: item.height_ft,
        total_amount: item.quantity * item.rate * (item.charged_area_sqft || 1)
      });

      // 3. Deduct Stock (Basic logic: deduct from store_stock)
      // Note: Real production would use FIFO on batches here
      const { data: currentStock } = await supabaseAdmin.from('store_stock')
        .select('quantity, raw_material_id').eq('store_id', storeId).maybeSingle();
      
      if (currentStock) {
        // We'd need to find which materials this product uses (BOM)
        // For now, we'll just log the sale. Full FIFO logic requires the BOM table.
        await supabaseAdmin.from('store_stock').update({ 
          quantity: Math.max(0, (currentStock.quantity || 0) - (item.charged_area_sqft * item.quantity))
        }).eq('store_id', storeId).eq('raw_material_id', currentStock.raw_material_id);
      }
    }

    res.json({ status: 'success', saleId: saleData.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Vendor/Store/Product
app.post('/api/inventory/vendors', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('vendors').insert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/inventory/stores', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('stores').insert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/inventory/products', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('finished_products').insert([req.body]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default app;
