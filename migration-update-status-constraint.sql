-- Migration: Update status constraint to include new subscription statuses
-- Description: Cập nhật constraint CHECK cho cột status để cho phép 2 trạng thái mới: 'in_period' và 'expired_period'
-- Date: 2024

-- Bước 1: Tìm tên constraint hiện tại (chạy query này trước để xem tên constraint)
-- SELECT conname FROM pg_constraint 
-- WHERE conrelid = 'accounts'::regclass 
-- AND contype = 'c' 
-- AND pg_get_constraintdef(oid) LIKE '%status%';

-- Bước 2: Xóa constraint cũ (thay 'accounts_status_check' bằng tên constraint thực tế nếu khác)
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_status_check;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_status_fkey; -- Nếu có foreign key
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_accounts_status; -- Tên khác có thể có

-- Bước 3: Xóa tất cả check constraints liên quan đến status (nếu không biết tên chính xác)
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'accounts'::regclass 
        AND contype = 'c'
        AND (
            conname LIKE '%status%' 
            OR pg_get_constraintdef(oid) LIKE '%status%'
        )
    LOOP
        EXECUTE 'ALTER TABLE accounts DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Bước 4: Thêm constraint mới với tất cả các giá trị status
ALTER TABLE accounts 
ADD CONSTRAINT accounts_status_check 
CHECK (status IN ('active', 'inactive', 'pending', 'in_period', 'expired_period'));

-- Bước 5: Thêm comment
COMMENT ON CONSTRAINT accounts_status_check ON accounts IS 
'Kiểm tra trạng thái tài khoản hợp lệ: active, inactive, pending, in_period (khách đang dùng), expired_period (khách quá hạn)';

-- Kiểm tra: Xác nhận constraint đã được tạo
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'accounts'::regclass 
AND conname = 'accounts_status_check';

