-- =============================================================================
-- Mục đích: Khởi tạo cấu trúc PostgreSQL và dữ liệu mẫu hệ thống quản lý trường.
-- Kiến trúc: Database Layer; đồng bộ DDL, migration và backfill từ:
-- members/member3_Backend_DB/school-management-nodejs/src/config/db.js
-- Tác giả cập nhật: Codex | Ngày cập nhật: 2026-11-14.
-- db.js không chứa bộ seed đầy đủ; giữ danh mục, lớp và học sinh mẫu hiện có,
-- chuẩn hóa tài khoản theo vai trò backend: BGH, GVCN, GV, HS và PH.
-- Mật khẩu tài khoản mẫu: 123456 (bcrypt, cost 10); dùng cho môi trường demo.
-- Giao dịch đảm bảo lỗi SQL sẽ hủy toàn bộ thay đổi của lần chạy.
-- =============================================================================
BEGIN;

-- CẤU TRÚC VÀ MIGRATION: giữ kiểu dữ liệu, mặc định, khóa và chỉ mục của db.js.
-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG & PHÂN QUYỀN RBAC
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG HỒ SƠ HỌC SINH TOÀN TRƯỜNG
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_code VARCHAR(30) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  gender VARCHAR(10),
  dob VARCHAR(20),
  class_name VARCHAR(30),
  parent_name VARCHAR(100),
  parent_phone VARCHAR(20),
  gpa NUMERIC(3, 1),
  academic_rank VARCHAR(30),
  status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 3. BẢNG SỔ ĐIỂM ĐIỆN TỬ THEO QUY CHẾ THÔNG TƯ 22/2021/TT-BGDĐT
CREATE TABLE IF NOT EXISTS grade_books (
  id SERIAL PRIMARY KEY,
  student_id INT,
  student_code VARCHAR(30) NOT NULL,
  student_name VARCHAR(100),
  class_name VARCHAR(30),
  subject_name VARCHAR(50),
  semester VARCHAR(10),
  school_year VARCHAR(20),
  score_oral NUMERIC(3, 1),         -- Điểm kiểm tra miệng (hệ số 1)
  score_15m NUMERIC(3, 1),          -- Điểm kiểm tra 15 phút (hệ số 1)
  score_1hour NUMERIC(3, 1),        -- Điểm kiểm tra 1 tiết (hệ số 2)
  score_mid_term NUMERIC(3, 1),     -- Điểm đánh giá giữa kỳ (hệ số 2)
  score_final_term NUMERIC(3, 1),   -- Điểm đánh giá cuối kỳ (hệ số 3)
  average_score NUMERIC(3, 1),      -- Điểm trung bình môn học kỳ
  grade_letter VARCHAR(20),         -- Đánh giá xếp loại môn học (Đạt / Chưa đạt)
  status VARCHAR(20) DEFAULT 'APPROVED' -- Trạng thái: DRAFT / APPROVED / LOCKED
);

-- 4. BẢNG ĐIỂM DANH CHUYÊN CẦN HÀNG NGÀY
CREATE TABLE IF NOT EXISTS attendances (
  id SERIAL PRIMARY KEY,
  student_id INT,
  student_code VARCHAR(30) NOT NULL,
  student_name VARCHAR(100),
  class_name VARCHAR(30),
  att_date VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL,      -- PRESENT / LATE / ABSENT
  note TEXT
);

-- 5. BẢNG ĐƠN XIN NGHỈ PHÉP TỪ PHỤ HUYNH
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  student_id INT,
  student_code VARCHAR(30) NOT NULL,
  student_name VARCHAR(100),
  class_name VARCHAR(30),
  from_date VARCHAR(20),
  to_date VARCHAR(20),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING / APPROVED / REJECTED
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. BẢNG THEO DÕI HỌC PHÍ & BIÊN LAI THU TIỀN
CREATE TABLE IF NOT EXISTS tuitions (
  id SERIAL PRIMARY KEY,
  student_code VARCHAR(30) NOT NULL,
  student_name VARCHAR(100),
  class_name VARCHAR(30),
  semester VARCHAR(10),
  school_year VARCHAR(20),
  amount_due NUMERIC(12, 2),        -- Số tiền học phí phải đóng
  amount_paid NUMERIC(12, 2) DEFAULT 0, -- Số tiền thực tế đã nộp
  status VARCHAR(20) DEFAULT 'UNPAID',  -- PAID / PARTIAL / UNPAID
  receipt_no VARCHAR(50)            -- Số biên lai hóa đơn điện tử
);

-- 7. BẢNG DANH MỤC LỚP HỌC
CREATE TABLE IF NOT EXISTS school_classes (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(30) UNIQUE NOT NULL,
  grade_level INT,                  -- Khối lớp: 10, 11, 12
  gvcn_name VARCHAR(100)            -- Tên giáo viên chủ nhiệm phụ trách
);

-- 8. BẢNG DANH MỤC MÔN HỌC
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  credits INT DEFAULT 1
);
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  class_id   VARCHAR(30) NOT NULL,
  week_start VARCHAR(20) NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period     INT NOT NULL CHECK (period BETWEEN 1 AND 10),
  subject_name VARCHAR(100),
  teacher_name VARCHAR(100),
  room         VARCHAR(50),
  time_range   VARCHAR(30),
  UNIQUE (class_id, week_start, day_of_week, period)
);
CREATE TABLE IF NOT EXISTS grade_book_closures (
  id           SERIAL PRIMARY KEY,
  class_id     VARCHAR(30) NOT NULL,
  class_name   VARCHAR(30) NOT NULL,
  gvcn_name    VARCHAR(100),
  semester     VARCHAR(10) NOT NULL DEFAULT 'HK1',
  school_year  VARCHAR(20) NOT NULL DEFAULT '2024-2025',
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  approved_at  TIMESTAMPTZ,
  UNIQUE (class_id, semester, school_year)
);
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT,
  type        VARCHAR(30)  NOT NULL DEFAULT 'general',
  sender_id   VARCHAR(50),
  recipients  TEXT[],
  sent_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  status      VARCHAR(20)  NOT NULL DEFAULT 'sent'
);
CREATE TABLE IF NOT EXISTS parent_messages (
  id          SERIAL PRIMARY KEY,
  student_id  VARCHAR(30) NOT NULL,
  class_name  VARCHAR(30),
  from_role   VARCHAR(10)  NOT NULL DEFAULT 'gv',
  message     TEXT         NOT NULL,
  sent_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB        NOT NULL,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON users (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens (user_id);

ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS homeroom_teacher_id INTEGER REFERENCES users(id);

-- UNIQUE constraint để UPSERT grade_books hoạt động đúng (tránh duplicate rows)
ALTER TABLE grade_books
  ADD COLUMN IF NOT EXISTS school_year VARCHAR(20);
ALTER TABLE grade_books
  ADD COLUMN IF NOT EXISTS score_oral_2 NUMERIC(3,1);
ALTER TABLE grade_books
  ADD COLUMN IF NOT EXISTS score_15m_2  NUMERIC(3,1);
ALTER TABLE grade_books
  ADD COLUMN IF NOT EXISTS teacher_name VARCHAR(100);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_grade_books_student_subject_class_sem_year'
  ) THEN
    ALTER TABLE grade_books
      ADD CONSTRAINT uq_grade_books_student_subject_class_sem_year
      UNIQUE (student_code, subject_name, class_name, semester, school_year);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS school_classes_homeroom_unique
  ON school_classes (homeroom_teacher_id)
  WHERE homeroom_teacher_id IS NOT NULL;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_role VARCHAR(30);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_class VARCHAR(30);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_semester VARCHAR(10);

CREATE TABLE IF NOT EXISTS schedule_templates (
  id           SERIAL PRIMARY KEY,
  class_id     VARCHAR(30) NOT NULL,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period       INT NOT NULL CHECK (period BETWEEN 1 AND 10),
  subject_name VARCHAR(100),
  teacher_name VARCHAR(100),
  room         VARCHAR(50),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, day_of_week, period)
);
ALTER TABLE schedule_templates ADD COLUMN IF NOT EXISTS subject_name VARCHAR(100);
ALTER TABLE schedule_templates ADD COLUMN IF NOT EXISTS teacher_name VARCHAR(100);
ALTER TABLE schedule_templates ADD COLUMN IF NOT EXISTS room VARCHAR(50);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_attendances_student_class_date'
  ) THEN
    ALTER TABLE attendances
      ADD CONSTRAINT uq_attendances_student_class_date
      UNIQUE (student_code, class_name, att_date);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS parent_students (
  id SERIAL PRIMARY KEY,
  parent_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_code VARCHAR(30) NOT NULL REFERENCES students(student_code) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'Phụ huynh',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_user_id, student_code)
);

-- 9. BẢNG GIAO DỊCH THANH TOÁN HỌC PHÍ (PAYMENTS & AUDIT RECONCILIATION)
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(50) UNIQUE NOT NULL,
  tuition_id INT NOT NULL REFERENCES tuitions(id) ON DELETE CASCADE,
  student_code VARCHAR(30) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'VIETQR',
  bank_bin VARCHAR(10) DEFAULT '970422',
  bank_account_no VARCHAR(50) DEFAULT '0388888888',
  bank_transaction_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, PENDING, PAID, REJECTED, EXPIRED
  receipt_no VARCHAR(50) UNIQUE,
  payer_name VARCHAR(100),
  payer_phone VARCHAR(20),
  proof_image TEXT,
  note TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_tuition_id ON payments(tuition_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_code ON payments(order_code);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(20) NOT NULL DEFAULT 'GVCN';
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS sender_id INT REFERENCES users(id);
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Chuẩn hóa tin nhắn do BGH gửi về đúng kênh BGH
UPDATE parent_messages
SET conversation_type = 'BGH'
WHERE from_role = 'bgh' AND (conversation_type IS NULL OR conversation_type != 'BGH');

-- ĐỒNG BỘ SCHEMA CŨ: bỏ các mặc định và khóa ngoại không có trong db.js.
-- Các thao tác này giữ dữ liệu hiện có, cho phép giá trị NULL giống backend.
ALTER TABLE school_classes ALTER COLUMN grade_level DROP NOT NULL;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_class_name_fkey;
ALTER TABLE students ALTER COLUMN gpa DROP DEFAULT;
ALTER TABLE students ALTER COLUMN academic_rank DROP DEFAULT;
ALTER TABLE grade_books DROP CONSTRAINT IF EXISTS grade_books_student_id_fkey;
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_student_id_fkey;
-- Ràng buộc cùng nội dung đã được tạo theo tên trong db.js ở phần trên.
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS uq_attendance_student_date;
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_student_id_fkey;
ALTER TABLE grade_books ALTER COLUMN semester DROP DEFAULT;
ALTER TABLE grade_books ALTER COLUMN school_year DROP DEFAULT;
ALTER TABLE grade_books ALTER COLUMN score_oral DROP DEFAULT;
ALTER TABLE grade_books ALTER COLUMN score_15m DROP DEFAULT;
ALTER TABLE grade_books ALTER COLUMN score_1hour DROP DEFAULT;
ALTER TABLE grade_books ALTER COLUMN score_mid_term DROP DEFAULT;
ALTER TABLE grade_books ALTER COLUMN score_final_term DROP DEFAULT;
ALTER TABLE grade_books ALTER COLUMN average_score DROP DEFAULT;
ALTER TABLE grade_books ALTER COLUMN grade_letter DROP DEFAULT;
ALTER TABLE tuitions ALTER COLUMN semester DROP DEFAULT;
ALTER TABLE tuitions ALTER COLUMN school_year DROP DEFAULT;
ALTER TABLE tuitions ALTER COLUMN amount_due DROP DEFAULT;

-- Giữ các chỉ mục tra cứu bổ sung đang có.
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_grade_books_search ON grade_books(student_code, subject_name, semester);
CREATE INDEX IF NOT EXISTS idx_attendances_class_date ON attendances(class_name, att_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_code, status);
CREATE INDEX IF NOT EXISTS idx_tuitions_student ON tuitions(student_code, status);

-- DỮ LIỆU MẪU: không ghi đè bản ghi đã tồn tại khi chạy lại.
INSERT INTO subjects (code, name, credits) VALUES
('MATH', 'Toán Học', 2),
('LIT', 'Ngữ Văn', 2),
('ENG', 'Tiếng Anh', 2),
('PHYS', 'Vật Lý', 1),
('CHEM', 'Hóa Học', 1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO school_classes (class_name, grade_level, gvcn_name) VALUES
('10A1', 10, 'Nguyễn Văn An'),
('10A2', 10, 'Lê Thị Mai')
ON CONFLICT (class_name) DO NOTHING;

INSERT INTO users (username, password, full_name, role) VALUES
('admin', '$2a$10$MXOy7Gwjhe.wE0Cz6Pm98.f1fXPMlN9wgoj0OqJT47PSWVbBlqXse', 'Ban Giám Hiệu Admin', 'BGH'),
('gvcn', '$2a$10$MXOy7Gwjhe.wE0Cz6Pm98.f1fXPMlN9wgoj0OqJT47PSWVbBlqXse', 'Nguyễn Văn An (GVCN 10A1)', 'GVCN'),
('gvbm', '$2a$10$MXOy7Gwjhe.wE0Cz6Pm98.f1fXPMlN9wgoj0OqJT47PSWVbBlqXse', 'Trần Thị Bình (GVBM Toán)', 'GV'),
('student', '$2a$10$MXOy7Gwjhe.wE0Cz6Pm98.f1fXPMlN9wgoj0OqJT47PSWVbBlqXse', 'Nguyễn Thị Ánh', 'HS'),
('parent', '$2a$10$MXOy7Gwjhe.wE0Cz6Pm98.f1fXPMlN9wgoj0OqJT47PSWVbBlqXse', 'Nguyễn Thị Hương (Phụ huynh)', 'PH')
ON CONFLICT (username) DO NOTHING;

INSERT INTO students (student_code, full_name, gender, dob, class_name, parent_name, parent_phone, gpa, academic_rank, status) VALUES
('HS001', 'Nguyễn Thị Ánh', 'Nữ', '2008-05-12', '10A1', 'Nguyễn Thị Hương', '0901234567', 8.7, 'Giỏi', 'ACTIVE'),
('HS002', 'Trần Văn Bảo', 'Nam', '2008-03-22', '10A1', 'Trần Văn Hùng', '0907654321', 6.8, 'Khá', 'ACTIVE'),
('HS003', 'Lê Thị Cẩm', 'Nữ', '2008-11-10', '10A1', 'Lê Văn Tâm', '0912345678', 4.5, 'Yếu', 'ACTIVE'),
('HS004', 'Phạm Hữu Dũng', 'Nam', '2008-01-15', '10A1', 'Phạm Thị Lan', '0922334455', 8.5, 'Giỏi', 'ACTIVE'),
('HS005', 'Đặng Thị Giang', 'Nữ', '2008-07-08', '10A2', 'Đặng Văn Nam', '0933445566', 7.2, 'Khá', 'ACTIVE')
ON CONFLICT (student_code) DO NOTHING;

-- Chuẩn hóa vai trò của dữ liệu đã được tạo bằng schema.sql phiên bản cũ.
-- Chỉ ánh xạ các giá trị ROLE_* cũ; giữ nguyên vai trò backend đã hợp lệ.
UPDATE users SET role = CASE role
  WHEN 'ROLE_ADMIN' THEN 'BGH'
  WHEN 'ROLE_HOMEROOM_TEACHER' THEN 'GVCN'
  WHEN 'ROLE_SUBJECT_TEACHER' THEN 'GV'
  WHEN 'ROLE_STUDENT' THEN 'HS'
  WHEN 'ROLE_PARENT' THEN 'PH'
END
WHERE role IN ('ROLE_ADMIN', 'ROLE_HOMEROOM_TEACHER', 'ROLE_SUBJECT_TEACHER',
               'ROLE_STUDENT', 'ROLE_PARENT');

-- Chỉ sửa chuỗi giả lập chưa phải bcrypt của bộ seed cũ, giữ mật khẩu khác.
UPDATE users
SET password = '$2a$10$MXOy7Gwjhe.wE0Cz6Pm98.f1fXPMlN9wgoj0OqJT47PSWVbBlqXse'
WHERE password IN ('$2a$10$wN3/sK.7Y4x1z...demo_admin',
                   '$2a$10$wN3/sK.7Y4x1z...demo_gvcn',
                   '$2a$10$wN3/sK.7Y4x1z...demo_gvbm',
                   '$2a$10$wN3/sK.7Y4x1z...demo_student',
                   '$2a$10$wN3/sK.7Y4x1z...demo_parent');

-- Tài khoản được db.js sử dụng để bổ sung liên kết phụ huynh với HS001.
INSERT INTO users (username, password, full_name, role)
VALUES ('ph.hs0001', '$2a$10$MXOy7Gwjhe.wE0Cz6Pm98.f1fXPMlN9wgoj0OqJT47PSWVbBlqXse',
        'Nguyễn Thị Hương (PH HS001)', 'PH')
ON CONFLICT (username) DO NOTHING;

-- Liên kết tài khoản phụ huynh mẫu cũ để tra cứu đúng học sinh.
INSERT INTO parent_students (parent_user_id, student_code, relationship)
SELECT id, 'HS001', 'Phụ huynh' FROM users WHERE username = 'parent'
ON CONFLICT (parent_user_id, student_code) DO NOTHING;

-- BACKFILL: chạy sau seed để tìm được tài khoản, học sinh và lớp mẫu.
-- Lịch cố định lấy tuần mới nhất; phân công GVCN chỉ điền khi còn trống.
INSERT INTO schedule_templates (class_id, day_of_week, period, subject_name, teacher_name, room)
SELECT DISTINCT ON (class_id, day_of_week, period)
  class_id, day_of_week, period, subject_name, teacher_name, room
FROM schedules
WHERE subject_name IS NOT NULL
ORDER BY class_id, day_of_week, period, week_start DESC
ON CONFLICT (class_id, day_of_week, period) DO UPDATE SET
  subject_name = EXCLUDED.subject_name,
  teacher_name = EXCLUDED.teacher_name,
  room         = EXCLUDED.room,
  updated_at   = NOW();

UPDATE school_classes sc
SET homeroom_teacher_id = u.id
FROM users u
WHERE u.role = 'GVCN'
  AND u.full_name LIKE sc.gvcn_name || '%'
  AND sc.homeroom_teacher_id IS NULL;

INSERT INTO parent_students (parent_user_id, student_code, relationship)
SELECT u.id, 'HS001', 'Phụ huynh'
FROM users u
WHERE u.username = 'ph.hs0001'
ON CONFLICT (parent_user_id, student_code) DO NOTHING;

COMMIT;
