// Utility functions สำหรับ format ข้อมูล

/**
 * Format ตัวเลขเป็นรูปแบบเงินบาท
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Format วันที่เป็นรูปแบบไทย
 */
export const formatDate = (date: string | Date, format: 'short' | 'long' = 'short'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (format === 'long') {
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(d);
    }

    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
};

/**
 * Format วันที่และเวลา
 */
export const formatDateTime = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
};

/**
 * Format เบอร์โทรศัพท์
 */
export const formatPhoneNumber = (phone: string): string => {
    // ลบอักขระที่ไม่ใช่ตัวเลข
    const cleaned = phone.replace(/\D/g, '');

    // Format เป็น 0XX-XXX-XXXX
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    return phone;
};

/**
 * Format หมายเลขบัตรประชาชน
 */
export const formatIdCard = (idCard: string): string => {
    // ลบอักขระที่ไม่ใช่ตัวเลข
    const cleaned = idCard.replace(/\D/g, '');

    // Format เป็น X-XXXX-XXXXX-XX-X
    if (cleaned.length === 13) {
        return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 12)}-${cleaned.slice(12)}`;
    }

    return idCard;
};

/**
 * คำนวณจำนวนวันระหว่างสองวันที่
 */
export const daysBetween = (date1: string | Date, date2: string | Date): number => {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};

/**
 * ตรวจสอบว่าวันที่หมดอายุหรือไม่
 */
export const isExpired = (date: string | Date): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d < new Date();
};

/**
 * ตรวจสอบว่าวันที่ใกล้หมดอายุหรือไม่ (ภายใน X วัน)
 */
export const isExpiringSoon = (date: string | Date, days: number = 30): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const diffDays = daysBetween(today, d);

    return diffDays <= days && d >= today;
};

/**
 * สร้าง initials จากชื่อ
 */
export const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

/**
 * Truncate ข้อความที่ยาวเกินไป
 */
export const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
};

/**
 * Generate สี random สำหรับ avatar
 */
export const getRandomColor = (seed: string): string => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    ];

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};
