// One-off helper: enables the Email/Password sign-in provider via the
// Identity Platform Admin REST API, since the Firebase Console toggle
// wasn't flipped yet and the service account can't click UI buttons.
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = 'sena-one';

async function main() {
    const auth = new GoogleAuth({
        keyFile: path.join(__dirname, '..', 'service-account.json'),
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/identitytoolkit'],
    });
    const client = await auth.getClient();

    console.log('Current config...');
    const getRes = await client.request({
        url: `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`,
        method: 'GET',
    });
    console.log(JSON.stringify(getRes.data.signIn, null, 2));

    console.log('Enabling email/password sign-in...');
    await client.request({
        url: `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email`,
        method: 'PATCH',
        data: {
            signIn: {
                email: {
                    enabled: true,
                    passwordRequired: true,
                },
            },
        },
    });
    console.log('Done.');
}

main().catch((err) => {
    console.error('Failed:', err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
    process.exit(1);
});
