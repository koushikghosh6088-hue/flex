import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const adminDb = getFirestore(firebaseConfig.firestoreDatabaseId);
const adminAuth = getAuth();

const usersToCreate = [
  {
    name: 'Koushik Owner',
    email: 'owner@flexstock.com',
    role: 'owner',
    store_id: null,
    pin: '882026',
    password: 'password123'
  },
  {
    name: 'Rahul Sharma',
    email: 'managerA@flexstock.com',
    role: 'store_manager',
    store_id: 'Store A',
    pin: '112233',
    password: 'password123'
  },
  {
    name: 'Priya Das',
    email: 'managerB@flexstock.com',
    role: 'store_manager',
    store_id: 'Store B',
    pin: '223344',
    password: 'password123'
  },
  {
    name: 'Amit Roy',
    email: 'managerC@flexstock.com',
    role: 'store_manager',
    store_id: 'Store C',
    pin: '334455',
    password: 'password123'
  }
];

async function bootstrap() {
  console.log('--- Starting User Bootstrap ---');
  
  for (const u of usersToCreate) {
    try {
      console.log(`Processing: ${u.email}...`);
      
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(u.email);
        console.log(`User ${u.email} already exists in Auth. Updating...`);
        await adminAuth.updateUser(userRecord.uid, {
          password: u.password,
          displayName: u.name
        });
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          userRecord = await adminAuth.createUser({
            email: u.email,
            password: u.password,
            displayName: u.name,
            emailVerified: true
          });
          console.log(`Created Auth user: ${u.email}`);
        } else {
          throw err;
        }
      }

      const pinHash = await bcrypt.hash(u.pin, 10);
      
      await adminDb.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        name: u.name,
        email: u.email,
        role: u.role,
        store_id: u.store_id,
        pin_hash: pinHash,
        created_at: new Date().toISOString(),
        is_active: true
      });
      
      console.log(`Firestore document created for ${u.email} with PIN: ${u.pin}`);
    } catch (error) {
      console.error(`Failed to create user ${u.email}:`, error);
    }
  }
  
  console.log('--- Bootstrap Complete ---');
}

bootstrap();
