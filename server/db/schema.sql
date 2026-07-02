-- =====================================================================
-- EduGrade — PostgreSQL schema
-- ---------------------------------------------------------------------
-- Apply with:
--   psql -U postgres -d edugrade -f db/schema.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()/digest, optional
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive emails

-- ---------------------------------------------------------------------
-- ENUM types  (idempotent guards)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE submission_status AS ENUM (
            'submitted',
            'processing',
            'graded',
            'failed'
        );
    END IF;
END$$;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120)  NOT NULL,
    email           CITEXT        NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            user_role     NOT NULL DEFAULT 'student',
    status          user_status   NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ---------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    subject     VARCHAR(150) NOT NULL,
    teacher_id  INTEGER      NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

-- ---------------------------------------------------------------------
-- class_enrollments  (many-to-many: students <-> classes)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_enrollments (
    student_id  INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class   ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(student_id);

-- ---------------------------------------------------------------------
-- exams
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    id               SERIAL PRIMARY KEY,
    title            VARCHAR(200) NOT NULL,
    class_id         INTEGER      NOT NULL
                     REFERENCES classes(id) ON DELETE CASCADE,
    created_by       INTEGER      NOT NULL
                     REFERENCES users(id)   ON DELETE RESTRICT,
    scheduled_at     TIMESTAMPTZ,
    deadline         TIMESTAMPTZ,
    answer_key_text  TEXT,
    use_ai_key       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_class      ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_creator    ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled  ON exams(scheduled_at);

-- Question paper support
ALTER TABLE exams ADD COLUMN IF NOT EXISTS question_paper_text TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS question_paper_url VARCHAR(500);

-- ---------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
    id            SERIAL PRIMARY KEY,
    exam_id       INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url      TEXT,
    ocr_text      TEXT,
    score         NUMERIC(6, 2),
    feedback      TEXT,
    status        submission_status NOT NULL DEFAULT 'submitted',
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graded_at     TIMESTAMPTZ,
    UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_exam    ON submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status  ON submissions(status);

-- Add ocr_confidence column for tracking OCR quality
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ocr_confidence FLOAT DEFAULT NULL;

-- Add manually_graded status for teacher score overrides
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'manually_graded';

-- ---------------------------------------------------------------------
-- teacher_classes
-- Captured during teacher registration so admins can review the class
-- info that a teacher intends to manage. Once approved, rows here are
-- typically promoted into the `classes` table.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_classes (
    id          SERIAL PRIMARY KEY,
    teacher_id  INTEGER     NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
    class_name  VARCHAR(150) NOT NULL,
    subject     VARCHAR(150) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher ON teacher_classes(teacher_id);

COMMIT;
