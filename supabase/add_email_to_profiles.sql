-- 1. เพิ่มคอลัมน์ email เข้าไปในตาราง profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. ดึงข้อมูล email จาก auth.users มาใส่ใน profiles (Backfill)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 3. (Optional) สร้าง Trigger เพื่อให้ email อัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลงใน auth.users
CREATE OR REPLACE FUNCTION public.handle_user_email_sync() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_update ON auth.users;
CREATE TRIGGER on_auth_user_email_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- หมายเหตุ: หากคุณมี Trigger สำหรับการสร้าง User ใหม่ (เช่น handle_new_user) 
-- อย่าลืมไปแก้ไขให้มัน Insert email เข้ามาด้วยนะครับ
