const path = require('path');
const { GoogleAuth } = require('google-auth-library');

async function main() {
    const auth = new GoogleAuth({
        keyFile: path.join(__dirname, '..', 'service-account.json'),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const res = await client.request({
        url: 'https://firestore.googleapis.com/v1/projects/sena-one/databases/(default)/collectionGroups/-/indexes',
        method: 'GET',
    });
    const idx = res.data.indexes || [];
    const building = idx.filter((i) => i.state === 'CREATING');
    console.log('building:', building.length, '/ total:', idx.length);
    process.exit(building.length === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error('FAILED', err.message);
    process.exit(2);
});
