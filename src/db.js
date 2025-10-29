const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'payroll.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT,
      department TEXT,
      salary REAL NOT NULL,
      hire_date TEXT,
      bank_name TEXT,
      bank_account TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      frequency TEXT DEFAULT 'monthly',
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'draft',
      tax_rate REAL DEFAULT 0.12,
      benefits_rate REAL DEFAULT 0.04,
      employer_contribution_rate REAL DEFAULT 0.02,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payroll_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      base_salary REAL NOT NULL,
      overtime_hours REAL DEFAULT 0,
      overtime_rate REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      bonuses REAL DEFAULT 0,
      benefits REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0.12,
      tax_withheld REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      employer_contribution_rate REAL DEFAULT 0.02,
      employer_contribution REAL DEFAULT 0,
      net_pay REAL DEFAULT 0,
      employer_cost REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);
});

module.exports = db;
