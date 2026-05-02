import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const adminAuth = getAuth();

async function list() {
  try {
    const listUsersResult = await adminAuth.listUsers(10);
    console.log('Users found:', listUsersResult.users.length);
  } catch (error) {
    console.error('List users failed:', error);
  }
}

list();
