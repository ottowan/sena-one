import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'asia-southeast1' });

const db = getFirestore();
const auth = getAuth();

async function assertCallerIsAdminOrOwner(callerUid: string | undefined): Promise<void> {
    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'Sign-in required.');
    }
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const role = callerDoc.data()?.role;
    if (role !== 'admin' && role !== 'owner') {
        throw new HttpsError('permission-denied', 'Admin or owner role required.');
    }
}

// Resets another user's password. Firebase's client SDK can only let a user
// change their own password, so this needs the Admin SDK - the sole reason
// this app runs 2 Cloud Functions instead of staying 100% client-only.
export const adminResetUserPassword = onCall<{ uid: string; newPassword: string }>(async (request) => {
    await assertCallerIsAdminOrOwner(request.auth?.uid);

    const { uid, newPassword } = request.data;
    if (!uid || !newPassword || newPassword.length < 6) {
        throw new HttpsError('invalid-argument', 'uid and a newPassword of at least 6 characters are required.');
    }

    await auth.updateUser(uid, { password: newPassword });
    return { ok: true };
});

// Deletes another user's Auth account plus their Firestore identity docs.
// Also needs the Admin SDK for the same reason as above.
export const adminDeleteUserAccount = onCall<{ uid: string }>(async (request) => {
    await assertCallerIsAdminOrOwner(request.auth?.uid);

    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'uid is required.');
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    await auth.deleteUser(uid);

    const batch = db.batch();
    batch.delete(db.collection('users').doc(uid));
    if (userData?.username) {
        batch.delete(db.collection('username_lookup').doc(userData.username));
    }
    if (userData?.normalizedPhone) {
        batch.delete(db.collection('phone_lookup').doc(userData.normalizedPhone));
    }
    await batch.commit();

    return { ok: true };
});
