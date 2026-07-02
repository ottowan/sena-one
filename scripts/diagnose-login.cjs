const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const sa = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf-8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const auth = getAuth();

async function main() {
    const usersSnap = await db.collection('users').get();
    const phoneLookupSnap = await db.collection('phone_lookup').get();
    const usernameLookupSnap = await db.collection('username_lookup').get();

    const phoneLookup = new Map(phoneLookupSnap.docs.map((d) => [d.id, d.data()]));
    const usernameLookup = new Map(usernameLookupSnap.docs.map((d) => [d.id, d.data()]));

    let issues = 0;
    for (const doc of usersSnap.docs) {
        const uid = doc.id;
        const data = doc.data();
        const problems = [];

        // Check Auth account exists and email matches
        let authUser;
        try {
            authUser = await auth.getUser(uid);
        } catch {
            problems.push('NO AUTH ACCOUNT');
        }
        if (authUser && authUser.email !== data.email) {
            problems.push(`AUTH EMAIL MISMATCH: auth=${authUser.email} vs firestore=${data.email}`);
        }

        // Check phone_lookup
        if (data.normalized_phone) {
            const pl = phoneLookup.get(data.normalized_phone);
            if (!pl) {
                problems.push(`NO phone_lookup entry for ${data.normalized_phone}`);
            } else if (pl.uid !== uid || pl.email !== data.email) {
                problems.push(`phone_lookup MISMATCH: ${JSON.stringify(pl)}`);
            }
        }

        // Check username_lookup
        if (data.username) {
            const ul = usernameLookup.get(data.username);
            if (!ul) {
                problems.push(`NO username_lookup entry for ${data.username}`);
            } else if (ul.uid !== uid || ul.email !== data.email) {
                problems.push(`username_lookup MISMATCH: ${JSON.stringify(ul)}`);
            }
        }

        if (problems.length > 0) {
            issues++;
            console.log(`--- ${uid} (phone=${data.phone}, username=${data.username}, role=${data.role}) ---`);
            problems.forEach((p) => console.log('  ' + p));
        }
    }

    console.log(`\nTotal users: ${usersSnap.docs.length}, issues found: ${issues}`);
}

main().catch((err) => {
    console.error('FAILED', err);
    process.exit(1);
});
