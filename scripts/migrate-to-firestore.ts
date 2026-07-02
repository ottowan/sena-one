// One-off local migration: public/pglite-seed/*.json -> Firestore + Firebase Auth.
// Run locally with a service account: `npm run migrate:firestore -- --dry-run`
// Requires GOOGLE_APPLICATION_CREDENTIALS (service account JSON) or
// `gcloud auth application-default login` credentials. Never deployed.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, '..', 'public', 'pglite-seed');
const DEFAULT_PASSWORD = process.env.DEFAULT_ACCOUNT_PASSWORD || 'sP@ssw0rd';
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_LIMIT = 450; // stay under Firestore's 500-write batch cap

function normalizePhone(value: string | null | undefined): string {
    return String(value || '').replace(/\D/g, '');
}

function normalizeMonth(month: string): string {
    return month.length >= 7 ? month.slice(0, 7) : month;
}

function loadSeed<T = any>(table: string): T[] {
    const filePath = path.join(SEED_DIR, `${table}.json`);
    return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function credentialFromEnv() {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath) {
        const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
        return cert(serviceAccount);
    }
    return undefined; // falls back to Application Default Credentials
}

if (!getApps().length) {
    initializeApp({ credential: credentialFromEnv() });
}

const db = getFirestore();
const auth = getAuth();

async function commitInChunks(writes: Array<(batch: FirebaseFirestore.WriteBatch) => void>) {
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
        const chunk = writes.slice(i, i + BATCH_LIMIT);
        if (DRY_RUN) continue;
        const batch = db.batch();
        chunk.forEach((write) => write(batch));
        await batch.commit();
    }
}

async function migrateSimpleCollection(table: string, idField = 'id') {
    const rows = loadSeed(table);
    console.log(`[${table}] ${rows.length} rows`);
    const writes = rows.map((row: any) => (batch: FirebaseFirestore.WriteBatch) => {
        const { [idField]: id, ...rest } = row;
        batch.set(db.collection(table).doc(String(id)), rest);
    });
    await commitInChunks(writes);
}

async function migrateHistoryMeter() {
    const rows = loadSeed('history_meter');
    console.log(`[history_meter] ${rows.length} rows`);
    const seenIds = new Set<string>();
    const writes: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
    for (const row of rows) {
        const month = normalizeMonth(row.month);
        const docId = `${row.room_id}_${month}`;
        if (seenIds.has(docId)) {
            console.warn(`  duplicate room/month, last one wins: ${docId}`);
        }
        seenIds.add(docId);
        const rest: Record<string, unknown> = { ...row };
        delete rest.id;
        writes.push((batch) => batch.set(db.collection('history_meter').doc(docId), { ...rest, month }));
    }
    await commitInChunks(writes);
}

async function migrateWithTenantUid(
    table: string,
    tenantIdField: string,
    tenantUserUidByTenantId: Map<string, string | null>
) {
    const rows = loadSeed(table);
    console.log(`[${table}] ${rows.length} rows`);
    const writes = rows.map((row: any) => (batch: FirebaseFirestore.WriteBatch) => {
        const rest: Record<string, unknown> = { ...row };
        delete rest.id;
        const tenantUid = tenantUserUidByTenantId.get(row[tenantIdField]) ?? null;
        batch.set(db.collection(table).doc(String(row.id)), { ...rest, tenant_uid: tenantUid });
    });
    await commitInChunks(writes);
}

async function migratePayments(
    tenantUserUidByTenantId: Map<string, string | null>,
    invoiceById: Map<string, any>
) {
    const rows = loadSeed('payments');
    console.log(`[payments] ${rows.length} rows`);
    const writes = rows.map((row: any) => (batch: FirebaseFirestore.WriteBatch) => {
        const { id, ...rest } = row;
        const invoice = invoiceById.get(row.invoice_id);
        const tenantUid = invoice ? tenantUserUidByTenantId.get(invoice.tenant_id) ?? null : null;
        batch.set(db.collection('payments').doc(String(id)), {
            ...rest,
            tenant_uid: tenantUid,
            room_id: invoice?.room_id ?? null,
        });
    });
    await commitInChunks(writes);
}

async function migrateRooms(tenantUserUidByTenantId: Map<string, string | null>) {
    const rows = loadSeed('rooms');
    console.log(`[rooms] ${rows.length} rows`);
    const writes = rows.map((row: any) => (batch: FirebaseFirestore.WriteBatch) => {
        const { id, ...rest } = row;
        const currentTenantUid = row.current_tenant_id
            ? tenantUserUidByTenantId.get(row.current_tenant_id) ?? null
            : null;
        batch.set(db.collection('rooms').doc(String(id)), { ...rest, current_tenant_uid: currentTenantUid });
    });
    await commitInChunks(writes);
}

async function migrateUsers() {
    const users = loadSeed('users');
    const profiles = loadSeed('profiles');
    const profileById = new Map(profiles.map((p: any) => [p.id, p]));

    console.log(`[users] ${users.length} rows (+ ${profiles.length} profiles merged)`);
    let adminCount = 0;

    for (const user of users) {
        const profile = profileById.get(user.id);
        const email = profile?.email || `${randomUUID()}@sena-one.local`;
        const normalizedPhone = normalizePhone(user.phone);

        if (user.role === 'admin') adminCount += 1;

        if (DRY_RUN) {
            console.log(`  [dry-run] would create auth user uid=${user.id} email=${email}`);
            continue;
        }

        try {
            await auth.getUser(user.id);
            console.log(`  auth user ${user.id} already exists, skipping create`);
        } catch {
            await auth.createUser({
                uid: user.id,
                email,
                password: DEFAULT_PASSWORD,
                emailVerified: true,
                displayName: user.full_name,
            });
        }

        const batch = db.batch();
        batch.set(db.collection('users').doc(user.id), {
            phone: user.phone,
            normalized_phone: normalizedPhone,
            username: user.username || null,
            full_name: user.full_name,
            role: user.role,
            email,
            id_card_number: profile?.id_card_number ?? null,
            id_card_image_url: profile?.id_card_image_url ?? null,
            created_at: user.created_at,
            updated_at: user.updated_at,
        });
        if (normalizedPhone) {
            batch.set(db.collection('phone_lookup').doc(normalizedPhone), { uid: user.id, email });
        }
        if (user.username) {
            batch.set(db.collection('username_lookup').doc(user.username), { uid: user.id, email });
        }
        await batch.commit();
    }

    const orphanedProfiles = profiles.filter((p: any) => !users.some((u: any) => u.id === p.id));
    if (orphanedProfiles.length) {
        console.warn(`  ${orphanedProfiles.length} profiles.json rows have no matching users.json row - not imported, review manually:`);
        orphanedProfiles.forEach((p: any) => console.warn(`    ${p.id} (${p.full_name}, ${p.email})`));
    }

    if (adminCount === 0) {
        console.warn('  No admin users found in seed data. Create one manually if needed.');
    }
}

async function main() {
    console.log(DRY_RUN ? '--- DRY RUN (no writes) ---' : '--- LIVE RUN ---');

    const tenants = loadSeed('tenants');
    const tenantUserUidByTenantId = new Map<string, string | null>(
        tenants.map((t: any) => [t.id, t.user_id ?? null])
    );

    const invoices = loadSeed('invoices');
    const invoiceById = new Map(invoices.map((inv: any) => [inv.id, inv]));

    // tenants.user_id already IS the auth uid post-migration, so rules can read
    // resource.data.user_id directly - no extra tenant_uid denormalization needed here.
    await migrateSimpleCollection('tenants');

    await migrateUsers();
    await migrateRooms(tenantUserUidByTenantId);
    await migrateWithTenantUid('contracts', 'tenant_id', tenantUserUidByTenantId);
    await migrateWithTenantUid('invoices', 'tenant_id', tenantUserUidByTenantId);
    await migrateWithTenantUid('deposits', 'tenant_id', tenantUserUidByTenantId);
    await migrateWithTenantUid('maintenance_requests', 'tenant_id', tenantUserUidByTenantId);
    await migratePayments(tenantUserUidByTenantId, invoiceById);
    await migrateHistoryMeter();
    await migrateSimpleCollection('notifications');
    await migrateSimpleCollection('bookings');
    await migrateSimpleCollection('app_settings');
    await migrateSimpleCollection('position_rent_rates', 'position_level');

    console.log(DRY_RUN ? '--- DRY RUN complete, no data written ---' : '--- Migration complete ---');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
