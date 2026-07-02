import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { nowIso, withId } from '../lib/firestoreUtils';
import type { Payment, PaymentFormData } from '../types';

export const paymentService = {
    createPayment: async (paymentData: PaymentFormData, slipFile?: File): Promise<Payment> => {
        let receiptImageUrl = '';

        if (slipFile) {
            const fileExt = slipFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const storageRef = ref(storage, `payment-slips/${fileName}`);
            await uploadBytes(storageRef, slipFile);
            receiptImageUrl = await getDownloadURL(storageRef);
        }

        const invoiceSnap = await getDoc(doc(db, 'invoices', paymentData.invoice_id));
        if (!invoiceSnap.exists()) throw new Error('Invoice not found');
        const invoice = invoiceSnap.data();

        const paymentRef = doc(collection(db, 'payments'));
        const payload = {
            invoice_id: paymentData.invoice_id,
            amount: paymentData.amount,
            payment_method: paymentData.payment_method,
            payment_date: paymentData.payment_date,
            notes: paymentData.notes,
            receipt_image_url: receiptImageUrl,
            created_by: auth.currentUser?.uid ?? null,
            tenant_uid: invoice.tenant_uid ?? null,
            room_id: invoice.room_id ?? null,
            created_at: nowIso(),
        };
        await setDoc(paymentRef, payload);

        await updateDoc(doc(db, 'invoices', paymentData.invoice_id), { status: 'paid' });

        return { id: paymentRef.id, ...payload } as unknown as Payment;
    },

    getPaymentsByInvoiceId: async (invoiceId: string): Promise<Payment[]> => {
        const snap = await getDocs(
            query(collection(db, 'payments'), where('invoice_id', '==', invoiceId), orderBy('created_at', 'desc'))
        );
        return snap.docs.map((d) => withId<Payment>(d));
    },
};
