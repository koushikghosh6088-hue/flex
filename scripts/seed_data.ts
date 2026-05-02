import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function seed() {
  console.log('--- Starting Data Seeding ---');

  // 1. Vendors
  const vendors = [
    { id: 'v1', name: 'National Paper Co.', contact_person: 'Amit Shah', phone: '9876543210', email: 'sales@nationalpaper.com', address: 'Bhiwandi, Maharashtra', opening_balance: 0, current_balance: 5000 },
    { id: 'v2', name: 'Ultra Inks Ltd', contact_person: 'Suresh Babu', phone: '9988776655', email: 'support@ultrainks.com', address: 'Sivakasi, TN', opening_balance: 0, current_balance: 0 },
    { id: 'v3', name: 'Flex Media Solutions', contact_person: 'Kiran Rao', phone: '9123456789', email: 'kiran@flexmedia.in', address: 'Okhla, Delhi', opening_balance: 1000, current_balance: 1000 }
  ];

  for (const v of vendors) {
    const { id, ...data } = v;
    await db.collection('vendors').doc(id).set(data);
  }

  // 2. Raw Materials
  const materials = [
    { id: 'm1', name: 'Frontlit Flex 340 GSM', unit: 'SQFT', central_stock: 5000, reorder_level: 1000, avg_unit_cost: 6.5 },
    { id: 'm2', name: 'Backlit Flex 440 GSM', unit: 'SQFT', central_stock: 2000, reorder_level: 500, avg_unit_cost: 12.0 },
    { id: 'm3', name: 'Solvent Ink - Cyan', unit: 'LTR', central_stock: 20, reorder_level: 5, avg_unit_cost: 850 },
    { id: 'm4', name: 'Solvent Ink - Magenta', unit: 'LTR', central_stock: 20, reorder_level: 5, avg_unit_cost: 850 },
    { id: 'm5', name: 'Solvent Ink - Yellow', unit: 'LTR', central_stock: 20, reorder_level: 5, avg_unit_cost: 850 },
    { id: 'm6', name: 'Solvent Ink - Black', unit: 'LTR', central_stock: 20, reorder_level: 5, avg_unit_cost: 850 },
    { id: 'm7', name: 'Eyelets (Brass)', unit: 'PCS', central_stock: 5000, reorder_level: 1000, avg_unit_cost: 0.4 },
    { id: 'm8', name: 'PVC Glue', unit: 'LTR', central_stock: 10, reorder_level: 2, avg_unit_cost: 320 },
    { id: 'm9', name: 'Wooden Frame Batten', unit: 'FT', central_stock: 1000, reorder_level: 200, avg_unit_cost: 15 },
    { id: 'm10', name: 'Iron Pipe 0.5 inch', unit: 'KG', central_stock: 500, reorder_level: 100, avg_unit_cost: 65 }
  ];

  for (const m of materials) {
    const { id, ...data } = m;
    await db.collection('raw_materials').doc(id).set(data);
  }

  // 3. Finished Products
  const products = [
    { id: 'p1', name: 'Standard Event Flex', product_code: 'FP-STD-01', barcode: '100001', size: '10x20 ft', selling_price: 1800, gst_rate: 18 },
    { id: 'p2', name: 'Premium Backlit Banner', product_code: 'FP-PRM-01', barcode: '100002', size: '4x6 ft', selling_price: 1200, gst_rate: 12 },
    { id: 'p3', name: 'Shop Signage Board', product_code: 'FP-SGN-01', barcode: '100003', size: '3x2 ft', selling_price: 450, gst_rate: 18 },
    { id: 'p4', name: 'Promotional X-Standee', product_code: 'FP-XST-01', barcode: '100004', size: '6x2.5 ft', selling_price: 750, gst_rate: 5 },
    { id: 'p5', name: 'Hoarding Flex (Large)', product_code: 'FP-HRD-01', barcode: '100005', size: '40x20 ft', selling_price: 8500, gst_rate: 18 }
  ];

  for (const p of products) {
    const { id, ...data } = p;
    await db.collection('finished_products').doc(id).set(data);
  }

  // 4. BOM for 10 Flex Banners (p1)
  const bomP1 = [
    { raw_material_id: 'm1', quantity_per_unit: 20, wastage_percent: 5 }, // 20 sqft per banner (base)
    { raw_material_id: 'm3', quantity_per_unit: 0.05, wastage_percent: 10 }, // ink
    { raw_material_id: 'm7', quantity_per_unit: 10, wastage_percent: 0 } // eyelets
  ];

  for (const item of bomP1) {
    await db.collection('finished_products').doc('p1').collection('bom').add(item);
  }

  // 5. Stores
  const stores = [
    { id: 'Store A', name: 'Mumbai Terminal A', code: 'MU-A', location: 'Andheri' },
    { id: 'Store B', name: 'Delhi Hub', code: 'DE-B', location: 'Okhla' },
    { id: 'Store C', name: 'Kolkata Outlet', code: 'KO-C', location: 'Salt Lake' }
  ];

  for (const s of stores) {
    const { id, ...data } = s;
    await db.collection('stores').doc(id).set(data);
  }

  // 6. Settings
  await db.collection('config').doc('settings').set({
    company_name: 'FlexFlow Manufacturing India',
    company_address: 'Industrial Area Phase 2, Mumbai, MH',
    company_phone: '+91 98765 43210',
    company_gst: '27AABCU1234F1Z5',
    default_gst_rate: 18,
    logo_url: 'https://cdn-icons-png.flaticon.com/512/2897/2897825.png'
  });

  console.log('--- Seeding Complete ---');
}

seed();
