/**
 * Firebase Auth + Firestore Seed — sga-esinsa-astrojs
 *
 * 1. Creates 5 auth users via REST API
 * 2. Signs in with Firebase client SDK
 * 3. Seeds Firestore as authenticated user
 *
 * Run: bunx tsx seed.ts
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ── Config ────────────────────────────────────────────────────
const API_KEY = process.env.PUBLIC_FIREBASE_API_KEY;
const AUTH_DOMAIN = process.env.PUBLIC_FIREBASE_AUTH_DOMAIN;
const PROJECT_ID = process.env.PUBLIC_FIREBASE_PROJECT_ID;
const STORAGE_BUCKET = process.env.PUBLIC_FIREBASE_STORAGE_BUCKET;
const MESSAGING_SENDER_ID = process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const APP_ID = process.env.PUBLIC_FIREBASE_APP_ID;

if (!API_KEY) {
  console.error('Missing PUBLIC_FIREBASE_* env vars — check your .env file');
  process.exit(1);
}

const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: APP_ID,
};

// ── Users ─────────────────────────────────────────────────────
const users = [
  { email: 'admin@esinsa.com', password: 'Admin123!', displayName: 'Admin ESINSA' },
  { email: 'operator@esinsa.com', password: 'Operator123!', displayName: 'Operator ESINSA' },
  { email: 'warehouse@esinsa.com', password: 'Warehouse123!', displayName: 'Warehouse Manager' },
  { email: 'logistics@esinsa.com', password: 'Logistics123!', displayName: 'Logistics User' },
  { email: 'viewer@esinsa.com', password: 'Viewer123!', displayName: 'Viewer User' },
];

// ── Inventory ─────────────────────────────────────────────────
const INVENTORY = [
  { nutcode: 'NUT0004001', desc: 'Junta espiral DN80 PN16', type: 'Juntas', stock: 45, loc: 'A-01-03', minStock: 100 },
  { nutcode: 'NUT0004002', desc: 'Junta espiral DN100 PN16', type: 'Juntas', stock: 120, loc: 'A-01-04', minStock: 80 },
  { nutcode: 'NUT0004003', desc: 'Junta plana DN50 PN10', type: 'Juntas', stock: 310, loc: 'A-02-01', minStock: 150 },
  { nutcode: 'NUT0004004', desc: 'Junta torica O-Ring 50x3 NBR', type: 'Juntas', stock: 580, loc: 'A-02-02', minStock: 200 },
  { nutcode: 'NUT0004005', desc: 'Junta torica O-Ring 80x4 FKM', type: 'Juntas', stock: 85, loc: 'A-02-03', minStock: 100 },
  { nutcode: 'NUT0002001', desc: 'Esparrago M10x40 A4-80', type: 'Esparragos', stock: 1200, loc: 'B-01-01', minStock: 500 },
  { nutcode: 'NUT0002002', desc: 'Esparrago M12x80 A4-80', type: 'Esparragos', stock: 420, loc: 'B-01-02', minStock: 300 },
  { nutcode: 'NUT0002003', desc: 'Esparrago M16x100 A4-80', type: 'Esparragos', stock: 180, loc: 'B-01-03', minStock: 200 },
  { nutcode: 'NUT0002004', desc: 'Esparrago M20x120 A2-70', type: 'Esparragos', stock: 95, loc: 'B-01-04', minStock: 100 },
  { nutcode: 'NUT0001001', desc: 'Tuerca hexagonal M10 A4', type: 'Tuercas', stock: 2400, loc: 'B-02-01', minStock: 1000 },
  { nutcode: 'NUT0001002', desc: 'Tuerca hexagonal M12 A4', type: 'Tuercas', stock: 1800, loc: 'B-02-02', minStock: 800 },
  { nutcode: 'NUT0001003', desc: 'Tuerca hexagonal M16 A4', type: 'Tuercas', stock: 650, loc: 'B-02-03', minStock: 400 },
  { nutcode: 'NUT0001004', desc: 'Tuerca autoblocante M10 A2', type: 'Tuercas', stock: 320, loc: 'B-02-04', minStock: 200 },
  { nutcode: 'NUT0003001', desc: 'Tornillo sin fin M8x30', type: 'Tornillos sin fin', stock: 750, loc: 'C-01-01', minStock: 300 },
  { nutcode: 'NUT0003002', desc: 'Tornillo sin fin M10x40', type: 'Tornillos sin fin', stock: 480, loc: 'C-01-02', minStock: 250 },
  { nutcode: 'NUT0007001', desc: 'Kit brida DN50 PN16', type: 'Cajas/Embalaje', stock: 45, loc: 'D-01-01', minStock: 30 },
  { nutcode: 'NUT0007002', desc: 'Kit brida DN80 PN16', type: 'Cajas/Embalaje', stock: 28, loc: 'D-01-02', minStock: 20 },
  { nutcode: 'NUT0007010', desc: 'Kit brida DN100 PN16', type: 'Cajas/Embalaje', stock: 15, loc: 'D-01-03', minStock: 15 },
];

const ORDERS = [
  { number: '#1001', customer: 'Industrias Tarraco SL', status: 'paid', amount: 2450, date: '2026-07-20', items: ['NUT0004001', 'NUT0002001', 'NUT0001001'] },
  { number: '#1002', customer: 'Gaskets Iberica SA', status: 'pending', amount: 890, date: '2026-07-22', items: ['NUT0004003', 'NUT0004004'] },
  { number: '#1003', customer: 'Sellados del Mediterraneo', status: 'paid', amount: 3200, date: '2026-07-18', items: ['NUT0004002', 'NUT0002002', 'NUT0001002'] },
  { number: '#1004', customer: 'TecnoJunta SL', status: 'refunded', amount: 340, date: '2026-07-15', items: ['NUT0003001'] },
  { number: '#1005', customer: 'Prefabricados Catalonia', status: 'paid', amount: 1680, date: '2026-07-23', items: ['NUT0002003', 'NUT0001003'] },
  { number: '#1006', customer: 'Almacenes Riu Clar', status: 'pending', amount: 560, date: '2026-07-24', items: ['NUT0007001'] },
  { number: '#1007', customer: 'Construccions Reus SL', status: 'paid', amount: 4100, date: '2026-07-19', items: ['NUT0004001', 'NUT0004002', 'NUT0002001', 'NUT0002002'] },
  { number: '#1008', customer: 'Industrias Tarraco SL', status: 'processing', amount: 1250, date: '2026-07-25', items: ['NUT0001001', 'NUT0001002'] },
  { number: '#1009', customer: 'Distribuciones Camp SL', status: 'paid', amount: 780, date: '2026-07-21', items: ['NUT0007002'] },
  { number: '#1010', customer: 'Gaskets Iberica SA', status: 'shipped', amount: 1950, date: '2026-07-17', items: ['NUT0004005', 'NUT0002003', 'NUT0001004'] },
];

const CUSTOMERS = [
  { code: 'CLI001', name: 'Marcos Fernandez', email: 'marcos@tarracoind.com', company: 'Industrias Tarraco SL', phone: '+34 977 123 456', plan: 'Enterprise', status: 'active' },
  { code: 'CLI002', name: 'Laura Vidal', email: 'laura@gasketsiberica.com', company: 'Gaskets Iberica SA', phone: '+34 977 234 567', plan: 'Team', status: 'active' },
  { code: 'CLI003', name: 'Antonio Roca', email: 'antonio@selladosmed.com', company: 'Sellados del Mediterraneo', phone: '+34 977 345 678', plan: 'Enterprise', status: 'active' },
  { code: 'CLI004', name: 'Carmen Puig', email: 'carmen@tecnunjunta.com', company: 'TecnoJunta SL', phone: '+34 977 456 789', plan: 'Starter', status: 'trial' },
  { code: 'CLI005', name: 'Jordi Sole', email: 'jordi@prefabricadoscat.com', company: 'Prefabricados Catalonia', phone: '+34 977 567 890', plan: 'Team', status: 'active' },
  { code: 'CLI006', name: 'Marta Blanca', email: 'marta@riuclar.com', company: 'Almacenes Riu Clar', phone: '+34 977 678 901', plan: 'Starter', status: 'past-due' },
  { code: 'CLI007', name: 'Pere Mas', email: 'pere@construccionsreus.com', company: 'Construccions Reus SL', phone: '+34 977 789 012', plan: 'Enterprise', status: 'active' },
  { code: 'CLI008', name: 'Nuria Soler', email: 'nuria@distribucionescamp.com', company: 'Distribuciones Camp SL', phone: '+34 977 890 123', plan: 'Team', status: 'active' },
];

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  ESINSA WMS — Firebase Seed Script');
  console.log('═══════════════════════════════════════════════');

  // Step 1: Create auth users
  console.log('\n🔐 Seeding Firebase Auth users...\n');
  for (const user of users) {
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password, displayName: user.displayName, returnSecureToken: true }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.error.message === 'EMAIL_EXISTS') {
          console.log(`  ⏭  ${user.email} — already exists`);
        } else {
          console.log(`  ✗  ${user.email} — ${data.error.message}`);
        }
      } else {
        console.log(`  ✓  ${user.email} — created`);
      }
    } catch (err: any) {
      console.log(`  ✗  ${user.email} — ${err.message}`);
    }
  }

  // Step 2: Sign in with Firebase client SDK and seed Firestore
  console.log('\n🔑 Signing in with Firebase client SDK...');
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, 'admin@esinsa.com', 'Admin123!');
    console.log('  ✓ Signed in as admin@esinsa.com\n');

    // Seed inventory
    console.log('  📋 inventory:');
    let invCount = 0;
    for (const item of INVENTORY) {
      try {
        await addDoc(collection(db, 'inventory'), {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        invCount++;
      } catch (e: any) {
        console.log(`    ✗ ${item.nutcode}: ${e.message}`);
        break;
      }
    }
    console.log(`     ✓ ${invCount}/${INVENTORY.length} items`);

    // Seed customers
    console.log('  👥 customers:');
    let custCount = 0;
    for (const customer of CUSTOMERS) {
      try {
        await addDoc(collection(db, 'customers'), {
          ...customer,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        custCount++;
      } catch (e: any) {
        console.log(`    ✗ ${customer.code}: ${e.message}`);
        break;
      }
    }
    console.log(`     ✓ ${custCount}/${CUSTOMERS.length} customers`);

    // Seed orders
    console.log('  📋 orders:');
    let ordCount = 0;
    for (const order of ORDERS) {
      try {
        await addDoc(collection(db, 'orders'), {
          ...order,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        ordCount++;
      } catch (e: any) {
        console.log(`    ✗ ${order.number}: ${e.message}`);
        break;
      }
    }
    console.log(`     ✓ ${ordCount}/${ORDERS.length} orders`);

  } catch (err: any) {
    console.log(`\n  ⚠  Firestore error: ${err.message}`);
    console.log('     Auth users are ready. You can seed Firestore from the app.');
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ Seed complete!');
  console.log('═══════════════════════════════════════════════');
  console.log('\n  Test credentials:');
  for (const u of users) {
    console.log(`    ${u.email} / ${u.password}`);
  }
  console.log('');
}

main().catch(console.error);
