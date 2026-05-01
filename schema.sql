-- -- ============================================================
-- --  PAYROLL SAAS — Multi-Tenant PostgreSQL Schema
-- -- ============================================================

-- -- 1. COMPANIES (one row per registered company)
-- CREATE TABLE companies (
--     company_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     name          VARCHAR(150) NOT NULL,
--     email         VARCHAR(150) NOT NULL UNIQUE,
--     password_hash VARCHAR(255),                    -- NULL for Google OAuth users
--     logo_url      VARCHAR(500),
--     industry      VARCHAR(100),
--     country       VARCHAR(100) DEFAULT 'India',
--     currency      VARCHAR(10)  DEFAULT 'INR',
--     google_id     VARCHAR(255) UNIQUE,             -- Google OAuth sub
--     is_active     SMALLINT DEFAULT 1,
--     created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- 2. DEPARTMENTS (scoped to company)
-- CREATE TABLE departments (
--     dept_id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
--     dept_name   VARCHAR(100) NOT NULL,
--     location    VARCHAR(100),
--     manager_id  INTEGER,
--     created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT uq_dept UNIQUE (company_id, dept_name)
-- );

-- -- 3. EMPLOYEES (scoped to company)
-- CREATE TABLE employees (
--     emp_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
--     dept_id     INTEGER REFERENCES departments(dept_id),
--     first_name  VARCHAR(50) NOT NULL,
--     last_name   VARCHAR(50) NOT NULL,
--     email       VARCHAR(150) NOT NULL,
--     phone       VARCHAR(20),
--     hire_date   DATE NOT NULL,
--     job_title   VARCHAR(100),
--     status      VARCHAR(20) DEFAULT 'ACTIVE'
--                 CHECK (status IN ('ACTIVE','INACTIVE','ON_LEAVE')),
--     created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT uq_emp_email UNIQUE (company_id, email)
-- );

-- -- Manager FK (ON DELETE SET NULL to prevent hard-delete crashes)
-- ALTER TABLE departments
--     ADD CONSTRAINT fk_dept_manager
--     FOREIGN KEY (manager_id) REFERENCES employees(emp_id) ON DELETE SET NULL;

-- -- 4. SALARY STRUCTURES
-- CREATE TABLE salary_structures (
--     structure_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     company_id   INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
--     emp_id       INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
--     basic_salary NUMERIC(12,2) NOT NULL,
--     hra          NUMERIC(12,2) DEFAULT 0,
--     da           NUMERIC(12,2) DEFAULT 0,
--     ta           NUMERIC(12,2) DEFAULT 0,
--     medical      NUMERIC(12,2) DEFAULT 0,
--     pf_percent   NUMERIC(5,2) DEFAULT 12,
--     tax_percent  NUMERIC(5,2) DEFAULT 10,
--     effective_from DATE NOT NULL,
--     is_current   SMALLINT DEFAULT 1,
--     CONSTRAINT uq_sal_current UNIQUE (emp_id, is_current)
-- );

-- -- 5. ATTENDANCE
-- CREATE TABLE attendance (
--     att_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
--     emp_id      INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
--     att_date    DATE NOT NULL,
--     status      VARCHAR(20) DEFAULT 'PRESENT'
--                 CHECK (status IN ('PRESENT','ABSENT','HALF_DAY','LEAVE')),
--     check_in    TIMESTAMP,
--     check_out   TIMESTAMP,
--     CONSTRAINT uq_att UNIQUE (company_id, emp_id, att_date)
-- );

-- -- 6. LEAVES
-- CREATE TABLE leaves (
--     leave_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
--     emp_id      INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
--     leave_type  VARCHAR(30) CHECK (leave_type IN ('CASUAL','SICK','EARNED','MATERNITY','PATERNITY')),
--     from_date   DATE NOT NULL,
--     to_date     DATE NOT NULL,
--     days        INTEGER GENERATED ALWAYS AS ((to_date - from_date + 1)) STORED,
--     reason      VARCHAR(500),
--     status      VARCHAR(20) DEFAULT 'PENDING'
--                 CHECK (status IN ('PENDING','APPROVED','REJECTED')),
--     applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- 7. PAYROLL
-- CREATE TABLE payroll (
--     payroll_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
--     company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
--     emp_id          INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
--     pay_month       INTEGER NOT NULL,
--     pay_year        INTEGER NOT NULL,
--     basic_salary    NUMERIC(12,2) DEFAULT 0,
--     hra             NUMERIC(12,2) DEFAULT 0,
--     da              NUMERIC(12,2) DEFAULT 0,
--     ta              NUMERIC(12,2) DEFAULT 0,
--     medical         NUMERIC(12,2) DEFAULT 0,
--     gross_salary    NUMERIC(12,2) GENERATED ALWAYS AS ((basic_salary + hra + da + ta + medical)) STORED,
--     pf_deduction    NUMERIC(12,2) DEFAULT 0,
--     tax_deduction   NUMERIC(12,2) DEFAULT 0,
--     other_deductions NUMERIC(12,2) DEFAULT 0,
--     net_salary      NUMERIC(12,2) DEFAULT 0,
--     days_worked     INTEGER DEFAULT 0,
--     days_in_month   INTEGER DEFAULT 0,
--     status          VARCHAR(20) DEFAULT 'PROCESSED'
--                     CHECK (status IN ('PENDING','PROCESSED','PAID')),
--     processed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT uq_payroll UNIQUE (company_id, emp_id, pay_month, pay_year)
-- );

-- -- ============================================================
-- -- INDEXES
-- -- ============================================================
-- CREATE INDEX idx_emp_company   ON employees(company_id);
-- CREATE INDEX idx_emp_dept      ON employees(dept_id);
-- CREATE INDEX idx_dept_company  ON departments(company_id);
-- CREATE INDEX idx_att_company   ON attendance(company_id, emp_id, att_date);
-- CREATE INDEX idx_pay_company   ON payroll(company_id, pay_year, pay_month);
-- CREATE INDEX idx_leave_company ON leaves(company_id, emp_id);
-- CREATE INDEX idx_sal_emp       ON salary_structures(emp_id, is_current);

-- -- ============================================================
-- -- VIEWS
-- -- ============================================================

-- -- Employee full details view
-- CREATE OR REPLACE VIEW vw_employees AS
-- SELECT
--     e.emp_id, e.company_id,
--     e.first_name || ' ' || e.last_name AS full_name,
--     e.first_name, e.last_name, e.email, e.phone,
--     e.hire_date, e.job_title, e.status,
--     d.dept_id, d.dept_name,
--     ss.basic_salary,
--     COALESCE(ss.hra,0) AS hra,
--     COALESCE(ss.da,0)  AS da,
--     COALESCE(ss.ta,0)  AS ta,
--     COALESCE(ss.medical,0) AS medical,
--     COALESCE(ss.pf_percent,12)  AS pf_percent,
--     COALESCE(ss.tax_percent,10) AS tax_percent,
--     COALESCE(ss.basic_salary,0) + COALESCE(ss.hra,0) + COALESCE(ss.da,0) +
--     COALESCE(ss.ta,0) + COALESCE(ss.medical,0) AS gross_salary
-- FROM employees e
-- LEFT JOIN departments       d  ON d.dept_id  = e.dept_id
-- LEFT JOIN salary_structures ss ON ss.emp_id  = e.emp_id AND ss.is_current = 1;

-- -- Payroll summary view
-- CREATE OR REPLACE VIEW vw_payroll AS
-- SELECT
--     p.payroll_id, p.company_id, p.pay_month, p.pay_year, p.status,
--     e.emp_id, e.full_name, e.job_title, e.dept_name,
--     p.basic_salary, p.hra, p.da, p.ta, p.medical,
--     p.gross_salary, p.pf_deduction, p.tax_deduction,
--     p.other_deductions, p.net_salary,
--     p.days_worked, p.days_in_month, p.processed_at
-- FROM payroll p
-- JOIN vw_employees e ON e.emp_id = p.emp_id AND e.company_id = p.company_id;

-- -- ============================================================
-- -- PROCEDURE — Process Monthly Payroll
-- -- ============================================================
-- CREATE OR REPLACE PROCEDURE process_payroll(
--     p_company_id INTEGER,
--     p_month      INTEGER,
--     p_year       INTEGER
-- )
-- LANGUAGE plpgsql
-- AS $$
-- DECLARE
--     v_days_in_month INTEGER;
-- BEGIN
--     v_days_in_month := EXTRACT(DAY FROM (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day'));

--     FOR emp IN (
--         SELECT e.emp_id,
--                COALESCE(ss.basic_salary,0) AS basic_salary,
--                COALESCE(ss.hra,0) AS hra,
--                COALESCE(ss.da,0)  AS da,
--                COALESCE(ss.ta,0)  AS ta,
--                COALESCE(ss.medical,0) AS medical,
--                COALESCE(ss.pf_percent,12) AS pf_percent,
--                COALESCE(ss.tax_percent,10) AS tax_percent
--         FROM employees e
--         JOIN salary_structures ss
--           ON ss.emp_id = e.emp_id AND ss.is_current = 1
--         WHERE e.company_id = p_company_id
--           AND e.status = 'ACTIVE'
--     ) LOOP
--         DECLARE
--             v_days_worked NUMERIC;
--             v_gross       NUMERIC(12,2);
--             v_pf_ded      NUMERIC(12,2);
--             v_tax_ded     NUMERIC(12,2);
--             v_net         NUMERIC(12,2);
--             v_ratio       NUMERIC(10,6);
--         BEGIN
--             SELECT COALESCE(
--                 SUM(CASE WHEN status = 'PRESENT' THEN 1
--                          WHEN status = 'HALF_DAY' THEN 0.5
--                          ELSE 0 END),
--                 v_days_in_month
--             )
--             INTO v_days_worked
--             FROM attendance
--             WHERE company_id = p_company_id
--               AND emp_id = emp.emp_id
--               AND EXTRACT(MONTH FROM att_date) = p_month
--               AND EXTRACT(YEAR FROM att_date) = p_year;

--             v_gross := emp.basic_salary + emp.hra + emp.da + emp.ta + emp.medical;

--             IF v_days_worked < v_days_in_month THEN
--                 v_ratio := v_days_worked / v_days_in_month;
--                 v_gross := ROUND(v_gross * v_ratio, 2);
--             END IF;

--             v_pf_ded := ROUND(emp.basic_salary * emp.pf_percent / 100, 2);
--             v_tax_ded := ROUND(v_gross * emp.tax_percent / 100, 2);
--             v_net := v_gross - v_pf_ded - v_tax_ded;

--             INSERT INTO payroll (
--                 company_id, emp_id, pay_month, pay_year,
--                 basic_salary, hra, da, ta, medical,
--                 pf_deduction, tax_deduction, net_salary,
--                 days_worked, days_in_month, status, processed_at
--             ) VALUES (
--                 p_company_id, emp.emp_id, p_month, p_year,
--                 emp.basic_salary, emp.hra, emp.da, emp.ta, emp.medical,
--                 v_pf_ded, v_tax_ded, v_net,
--                 v_days_worked, v_days_in_month, 'PROCESSED', CURRENT_TIMESTAMP
--             )
--             ON CONFLICT (company_id, emp_id, pay_month, pay_year)
--             DO UPDATE SET
--                 basic_salary = EXCLUDED.basic_salary,
--                 hra = EXCLUDED.hra,
--                 da = EXCLUDED.da,
--                 ta = EXCLUDED.ta,
--                 medical = EXCLUDED.medical,
--                 pf_deduction = EXCLUDED.pf_deduction,
--                 tax_deduction = EXCLUDED.tax_deduction,
--                 net_salary = EXCLUDED.net_salary,
--                 days_worked = EXCLUDED.days_worked,
--                 days_in_month = EXCLUDED.days_in_month,
--                 status = EXCLUDED.status,
--                 processed_at = EXCLUDED.processed_at;
--         END;
--     END LOOP;
-- END;
-- $$;




-- ============================================================
--  PAYROLL SAAS — Multi-Tenant PostgreSQL Schema
-- ============================================================

-- 1. COMPANIES (one row per registered company)
CREATE TABLE companies (
    company_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255),                    -- NULL for Google OAuth users
    logo_url      VARCHAR(500),
    industry      VARCHAR(100),
    country       VARCHAR(100) DEFAULT 'India',
    currency      VARCHAR(10)  DEFAULT 'INR',
    google_id     VARCHAR(255) UNIQUE,             -- Google OAuth sub
    is_active     BOOLEAN DEFAULT true,            -- PG UPGRADE: Native Boolean
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEPARTMENTS (scoped to company)
CREATE TABLE departments (
    dept_id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    dept_name   VARCHAR(100) NOT NULL,
    location    VARCHAR(100),
    manager_id  INTEGER,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept UNIQUE (company_id, dept_name)
);

-- 3. EMPLOYEES (scoped to company)
CREATE TABLE employees (
    emp_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    dept_id     INTEGER REFERENCES departments(dept_id),
    first_name  VARCHAR(50) NOT NULL,
    last_name   VARCHAR(50) NOT NULL,
    email       VARCHAR(150) NOT NULL,
    phone       VARCHAR(20),
    hire_date   DATE NOT NULL,
    job_title   VARCHAR(100),
    status      VARCHAR(20) DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE','INACTIVE','ON_LEAVE')),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_emp_email UNIQUE (company_id, email)
);

-- Manager FK (ON DELETE SET NULL to prevent hard-delete crashes)
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_manager
    FOREIGN KEY (manager_id) REFERENCES employees(emp_id) ON DELETE SET NULL;

-- 4. SALARY STRUCTURES
CREATE TABLE salary_structures (
    structure_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id   INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    emp_id       INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    basic_salary NUMERIC(12,2) NOT NULL,
    hra          NUMERIC(12,2) DEFAULT 0,
    da           NUMERIC(12,2) DEFAULT 0,
    ta           NUMERIC(12,2) DEFAULT 0,
    medical      NUMERIC(12,2) DEFAULT 0,
    pf_percent   NUMERIC(5,2) DEFAULT 12,
    tax_percent  NUMERIC(5,2) DEFAULT 10,
    effective_from DATE NOT NULL,
    is_current   BOOLEAN DEFAULT true -- PG UPGRADE: Native Boolean
);

-- 5. ATTENDANCE
CREATE TABLE attendance (
    att_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    emp_id      INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    att_date    DATE NOT NULL,
    status      VARCHAR(20) DEFAULT 'PRESENT'
                CHECK (status IN ('PRESENT','ABSENT','HALF_DAY','LEAVE')),
    check_in    TIMESTAMP,
    check_out   TIMESTAMP,
    CONSTRAINT uq_att UNIQUE (company_id, emp_id, att_date)
);

-- 6. LEAVES
CREATE TABLE leaves (
    leave_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    emp_id      INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    leave_type  VARCHAR(30) CHECK (leave_type IN ('CASUAL','SICK','EARNED','MATERNITY','PATERNITY')),
    from_date   DATE NOT NULL,
    to_date     DATE NOT NULL,
    days        INTEGER GENERATED ALWAYS AS ((to_date - from_date + 1)) STORED,
    reason      VARCHAR(500),
    status      VARCHAR(20) DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PAYROLL
CREATE TABLE payroll (
    payroll_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    emp_id          INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
    pay_month       INTEGER NOT NULL,
    pay_year        INTEGER NOT NULL,
    basic_salary    NUMERIC(12,2) DEFAULT 0,
    hra             NUMERIC(12,2) DEFAULT 0,
    da              NUMERIC(12,2) DEFAULT 0,
    ta              NUMERIC(12,2) DEFAULT 0,
    medical         NUMERIC(12,2) DEFAULT 0,
    gross_salary    NUMERIC(12,2) GENERATED ALWAYS AS ((basic_salary + hra + da + ta + medical)) STORED,
    pf_deduction    NUMERIC(12,2) DEFAULT 0,
    tax_deduction   NUMERIC(12,2) DEFAULT 0,
    other_deductions NUMERIC(12,2) DEFAULT 0,
    net_salary      NUMERIC(12,2) DEFAULT 0,
    days_worked     NUMERIC(5,2)  DEFAULT 0, -- PG UPGRADE: Changed to Numeric to support half days (e.g., 20.5)
    days_in_month   INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'PROCESSED'
                    CHECK (status IN ('PENDING','PROCESSED','PAID')),
    processed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payroll UNIQUE (company_id, emp_id, pay_month, pay_year)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_emp_company   ON employees(company_id);
CREATE INDEX idx_emp_dept      ON employees(dept_id);
CREATE INDEX idx_dept_company  ON departments(company_id);
CREATE INDEX idx_att_company   ON attendance(company_id, emp_id, att_date);
CREATE INDEX idx_pay_company   ON payroll(company_id, pay_year, pay_month);
CREATE INDEX idx_leave_company ON leaves(company_id, emp_id);

-- PG UPGRADE: Partial index so an employee can have infinite 'false' salary histories, but only ONE 'true' current salary.
CREATE UNIQUE INDEX uq_sal_current ON salary_structures (emp_id) WHERE is_current = true;

-- ============================================================
-- VIEWS
-- ============================================================

-- Employee full details view
CREATE OR REPLACE VIEW vw_employees AS
SELECT
    e.emp_id, e.company_id,
    CONCAT_WS(' ', e.first_name, e.last_name) AS full_name, -- PG UPGRADE: Safe null handling
    e.first_name, e.last_name, e.email, e.phone,
    e.hire_date, e.job_title, e.status,
    d.dept_id, d.dept_name,
    ss.basic_salary,
    COALESCE(ss.hra,0) AS hra,
    COALESCE(ss.da,0)  AS da,
    COALESCE(ss.ta,0)  AS ta,
    COALESCE(ss.medical,0) AS medical,
    COALESCE(ss.pf_percent,12)  AS pf_percent,
    COALESCE(ss.tax_percent,10) AS tax_percent,
    COALESCE(ss.basic_salary,0) + COALESCE(ss.hra,0) + COALESCE(ss.da,0) +
    COALESCE(ss.ta,0) + COALESCE(ss.medical,0) AS gross_salary
FROM employees e
LEFT JOIN departments       d  ON d.dept_id  = e.dept_id
LEFT JOIN salary_structures ss ON ss.emp_id  = e.emp_id AND ss.is_current = true; -- PG UPGRADE: Boolean check

-- Payroll summary view
CREATE OR REPLACE VIEW vw_payroll AS
SELECT
    p.payroll_id, p.company_id, p.pay_month, p.pay_year, p.status,
    e.emp_id, e.full_name, e.job_title, e.dept_name,
    p.basic_salary, p.hra, p.da, p.ta, p.medical,
    p.gross_salary, p.pf_deduction, p.tax_deduction,
    p.other_deductions, p.net_salary,
    p.days_worked, p.days_in_month, p.processed_at
FROM payroll p
JOIN vw_employees e ON e.emp_id = p.emp_id AND e.company_id = p.company_id;