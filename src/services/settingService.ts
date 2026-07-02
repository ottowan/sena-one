import { collection, doc, documentId, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { nowIso } from '../lib/firestoreUtils';
import type { AppSettings, RentRate } from '../types';

const APP_SETTINGS_DOC_ID = 'singleton';

export const settingService = {
    getRentRates: async (): Promise<RentRate[]> => {
        const snap = await getDocs(query(collection(db, 'position_rent_rates'), orderBy(documentId(), 'asc')));
        return snap.docs.map((d) => ({ position_level: d.id, ...d.data() }) as RentRate);
    },

    updateRentRate: async (position_level: string, rent_amount: number, common_fee: number): Promise<void> => {
        await setDoc(
            doc(db, 'position_rent_rates', position_level),
            { rent_amount, common_fee, updated_at: nowIso() },
            { merge: true }
        );
    },

    getAppSettings: async (): Promise<AppSettings> => {
        const snap = await getDoc(doc(db, 'app_settings', APP_SETTINGS_DOC_ID));
        if (!snap.exists()) {
            return {
                id: 1,
                common_fee: 0,
                water_rate: 18,
                water_maintenance_fee: 0,
                electricity_rate: 8,
                updated_at: nowIso(),
            };
        }
        return { id: 1, ...snap.data() } as AppSettings;
    },

    updateAppSettings: async (settings: Partial<AppSettings>): Promise<void> => {
        const rest = { ...settings };
        delete rest.id;
        await setDoc(
            doc(db, 'app_settings', APP_SETTINGS_DOC_ID),
            { ...rest, updated_at: nowIso() },
            { merge: true }
        );
    },
};
