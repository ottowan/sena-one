import { supabase } from '../lib/supabase';
import type { Payment, PaymentFormData } from '../types';

export const paymentService = {
    // Record a new payment
    createPayment: async (
        paymentData: PaymentFormData,
        slipFile?: File
    ): Promise<Payment> => {
        let receiptImageUrl = '';

        // 1. Upload slip image if provided
        if (slipFile) {
            // Check if bucket exists, if not we might fail. User should have created 'payment-slips'
            const fileExt = slipFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('payment-slips')
                .upload(filePath, slipFile);

            if (uploadError) {
                console.error('Error uploading slip:', uploadError);
                throw new Error('ไม่สามารถอัปโหลดสลิปได้: ' + uploadError.message);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('payment-slips')
                .getPublicUrl(filePath);

            receiptImageUrl = publicUrl;
        }

        // 2. Create payment record
        const { data, error } = await supabase
            .from('payments')
            .insert({
                invoice_id: paymentData.invoice_id,
                amount: paymentData.amount,
                payment_method: paymentData.payment_method,
                payment_date: paymentData.payment_date,
                notes: paymentData.notes,
                receipt_image_url: receiptImageUrl,
                created_by: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single();

        if (error) throw error;

        // 3. Update invoice status to 'paid' if full amount (or logic could be partial, but let's assume full for now)
        // Check invoice total first? For now, we just mark as paid if payment is recorded.
        // Or should we let the user decide? The requirement implies simple status tracking.
        // Let's safe-guard: Update invoice status to 'paid'.

        await supabase
            .from('invoices')
            .update({ status: 'paid' })
            .eq('id', paymentData.invoice_id);

        return data as Payment;
    },

    // Get payments for an invoice
    getPaymentsByInvoiceId: async (invoiceId: string): Promise<Payment[]> => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('invoice_id', invoiceId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Payment[];
    }
};
