export const db = {};
export const auth = { currentUser: { uid: 'preview' } };
export const storage = {};
export const functions = {};
export const STORAGE_ENABLED = false;
export const createSecondaryAuthContext = () => ({ auth: {}, dispose: async () => {} });
