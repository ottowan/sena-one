// One-off helper: creates the composite indexes from firestore.indexes.json
// directly via the Firestore Admin REST API, bypassing `firebase deploy`'s
// serviceusage.services.get preflight check (see deploy-firestore-rules.cjs).
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = 'sena-one';

async function main() {
    const auth = new GoogleAuth({
        keyFile: path.join(__dirname, '..', 'service-account.json'),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();

    const { indexes } = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'firestore.indexes.json'), 'utf-8')
    );

    for (const index of indexes) {
        const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/collectionGroups/${index.collectionGroup}/indexes`;
        const body = {
            queryScope: index.queryScope,
            fields: index.fields.map((f) => ({ fieldPath: f.fieldPath, order: f.order })),
        };
        try {
            await client.request({ url, method: 'POST', data: body });
            console.log(`Created index on ${index.collectionGroup}:`, index.fields.map((f) => `${f.fieldPath} ${f.order}`).join(', '));
        } catch (err) {
            const message = err.response?.data?.error?.message || err.message;
            if (message.includes('already exists')) {
                console.log(`Index already exists on ${index.collectionGroup}:`, index.fields.map((f) => f.fieldPath).join(', '));
            } else {
                console.error(`Failed to create index on ${index.collectionGroup}:`, message);
            }
        }
    }
}

main().catch((err) => {
    console.error('Failed:', err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
    process.exit(1);
});
