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

const adminDb = getFirestore();

async function test() {
  try {
    const collections = await adminDb.listCollections();
    console.log('Collections:', collections.map(c => c.id));
    console.log('Firestore is working!');
  } catch (error) {
    console.error('Firestore failed:', error);
  }
}

test();
