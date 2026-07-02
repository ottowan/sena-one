// One-off helper: deploys firestore.rules directly via the Firebase Rules
// REST API, bypassing `firebase deploy`'s serviceusage.services.get
// preflight check (which the firebase-adminsdk service account isn't
// granted by default, even though it can use Firestore/Rules APIs fine).
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = 'sena-one';

async function main() {
    const auth = new GoogleAuth({
        keyFile: path.join(__dirname, '..', 'service-account.json'),
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
    });
    const client = await auth.getClient();

    const rulesSource = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf-8');

    console.log('Creating ruleset...');
    const createRes = await client.request({
        url: `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
        method: 'POST',
        data: {
            source: {
                files: [{ name: 'firestore.rules', content: rulesSource }],
            },
        },
    });
    const rulesetName = createRes.data.name;
    console.log('Created ruleset:', rulesetName);

    console.log('Releasing ruleset to cloud.firestore...');
    await client.request({
        url: `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
        method: 'PATCH',
        data: {
            release: {
                name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
                rulesetName,
            },
        },
    });
    console.log('Firestore rules deployed successfully.');
}

main().catch((err) => {
    console.error('Failed:', err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
    process.exit(1);
});
