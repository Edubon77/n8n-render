const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function toNumber(value, fallback = 0) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function frequencyDivisor(frequency = 'monthly') {
  const mapping = {
    monthly: 1,
    semimonthly: 2,
    biweekly: 2,
    fortnightly: 2,
    weekly: 4,
    daily: 30,
  };
  return mapping[frequency] || 1;
}

function calculateEntry(entry) {
  const baseSalary = toNumber(entry.base_salary);
  const overtimeHours = toNumber(entry.overtime_hours);
  const overtimeRate = toNumber(entry.overtime_rate);
  const bonuses = toNumber(entry.bonuses);
  const benefits = toNumber(entry.benefits);
  const deductions = toNumber(entry.deductions);
  const taxRate = toNumber(entry.tax_rate, 0.12);
  const employerContributionRate = toNumber(entry.employer_contribution_rate, 0.02);

  const overtimePay = +(overtimeHours * overtimeRate).toFixed(2);
  const taxable = baseSalary + overtimePay + bonuses;
  const taxWithheld = +(taxable * taxRate).toFixed(2);
  const employerContribution = +(taxable * employerContributionRate).toFixed(2);
  const netPay = +(taxable - taxWithheld - deductions + benefits).toFixed(2);
  const employerCost = +(taxable + employerContribution + benefits).toFixed(2);

  return {
    ...entry,
    base_salary: baseSalary,
    overtime_hours: overtimeHours,
    overtime_rate: overtimeRate,
    bonuses,
    benefits,
    deductions,
    tax_rate: taxRate,
    employer_contribution_rate: employerContributionRate,
    overtime_pay: overtimePay,
    tax_withheld: taxWithheld,
    employer_contribution: employerContribution,
    net_pay: netPay,
    employer_cost: employerCost,
  };
}

app.get('/api/employees', async (_req, res) => {
  try {
    const employees = await all(
      `SELECT id, name, email, role, department, salary, hire_date, bank_name, bank_account, created_at
       FROM employees
       ORDER BY created_at DESC`
    );
    res.json({ data: employees });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener colaboradores', details: error.message });
  }
});

app.post('/api/employees', async (req, res) => {
  const { name, email, role, department, salary, hireDate, bankName, bankAccount } = req.body;

  if (!name || !salary) {
    return res.status(400).json({ error: 'Nombre y salario son obligatorios' });
  }

  const normalizedSalary = toNumber(salary);
  if (normalizedSalary <= 0) {
    return res.status(400).json({ error: 'El salario debe ser mayor a cero' });
  }

  try {
    const result = await run(
      `INSERT INTO employees (name, email, role, department, salary, hire_date, bank_name, bank_account)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    , [
      name.trim(),
      email ? email.trim() : null,
      role ? role.trim() : null,
      department ? department.trim() : null,
      normalizedSalary,
      hireDate || null,
      bankName ? bankName.trim() : null,
      bankAccount ? bankAccount.trim() : null,
    ]);

    const employee = await get(
      `SELECT id, name, email, role, department, salary, hire_date, bank_name, bank_account, created_at
       FROM employees WHERE id = ?`,
      [result.id]
    );

    res.status(201).json({ data: employee });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear el colaborador', details: error.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, department, salary, hireDate, bankName, bankAccount } = req.body;

  try {
    const existing = await get('SELECT * FROM employees WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }

    const updatedSalary = salary !== undefined ? toNumber(salary, existing.salary) : existing.salary;
    if (updatedSalary <= 0) {
      return res.status(400).json({ error: 'El salario debe ser mayor a cero' });
    }

    await run(
      `UPDATE employees
       SET name = ?, email = ?, role = ?, department = ?, salary = ?, hire_date = ?, bank_name = ?, bank_account = ?
       WHERE id = ?`,
      [
        name !== undefined ? name.trim() : existing.name,
        email !== undefined ? email?.trim() || null : existing.email,
        role !== undefined ? role?.trim() || null : existing.role,
        department !== undefined ? department?.trim() || null : existing.department,
        updatedSalary,
        hireDate !== undefined ? hireDate || null : existing.hire_date,
        bankName !== undefined ? bankName?.trim() || null : existing.bank_name,
        bankAccount !== undefined ? bankAccount?.trim() || null : existing.bank_account,
        id,
      ]
    );

    const employee = await get(
      `SELECT id, name, email, role, department, salary, hire_date, bank_name, bank_account, created_at
       FROM employees WHERE id = ?`,
      [id]
    );
    res.json({ data: employee });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el colaborador', details: error.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await run('DELETE FROM employees WHERE id = ?', [id]);
    if (!result.changes) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar el colaborador', details: error.message });
  }
});

app.get('/api/cycles', async (_req, res) => {
  try {
    const cycles = await all(
      `SELECT c.*, 
              ROUND(COALESCE(SUM(e.net_pay), 0), 2) AS total_net_pay,
              ROUND(COALESCE(SUM(e.employer_cost), 0), 2) AS total_employer_cost,
              COUNT(e.id) AS total_entries
       FROM cycles c
       LEFT JOIN payroll_entries e ON e.cycle_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json({ data: cycles });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ciclos de nómina', details: error.message });
  }
});

app.post('/api/cycles', async (req, res) => {
  const {
    name,
    periodStart,
    periodEnd,
    frequency = 'monthly',
    currency = 'USD',
    taxRate = 0.12,
    benefitsRate = 0.04,
    employerContributionRate = 0.02,
    notes
  } = req.body;

  if (!periodStart || !periodEnd) {
    return res.status(400).json({ error: 'Las fechas de inicio y fin son obligatorias' });
  }

  try {
    const employees = await all('SELECT * FROM employees ORDER BY id ASC');
    if (!employees.length) {
      return res.status(400).json({ error: 'Necesitas al menos un colaborador para generar una nómina' });
    }

    const cycleResult = await run(
      `INSERT INTO cycles (name, period_start, period_end, frequency, currency, status, tax_rate, benefits_rate, employer_contribution_rate, notes)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`
    , [
      name ? name.trim() : `Nómina ${periodStart} - ${periodEnd}`,
      periodStart,
      periodEnd,
      frequency,
      currency,
      toNumber(taxRate, 0.12),
      toNumber(benefitsRate, 0.04),
      toNumber(employerContributionRate, 0.02),
      notes || null,
    ]);

    const cycleId = cycleResult.id;
    const divisor = frequencyDivisor(frequency);

    for (const employee of employees) {
      const baseSalary = +(toNumber(employee.salary) / divisor).toFixed(2);
      const entryData = calculateEntry({
        cycle_id: cycleId,
        employee_id: employee.id,
        base_salary: baseSalary,
        overtime_hours: 0,
        overtime_rate: 0,
        bonuses: 0,
        benefits: +(baseSalary * toNumber(benefitsRate, 0.04)).toFixed(2),
        tax_rate: toNumber(taxRate, 0.12),
        deductions: 0,
        employer_contribution_rate: toNumber(employerContributionRate, 0.02),
        notes: null,
      });

      await run(
        `INSERT INTO payroll_entries (
          cycle_id, employee_id, base_salary, overtime_hours, overtime_rate, overtime_pay,
          bonuses, benefits, tax_rate, tax_withheld, deductions,
          employer_contribution_rate, employer_contribution, net_pay, employer_cost, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [
        cycleId,
        employee.id,
        entryData.base_salary,
        entryData.overtime_hours,
        entryData.overtime_rate,
        entryData.overtime_pay,
        entryData.bonuses,
        entryData.benefits,
        entryData.tax_rate,
        entryData.tax_withheld,
        entryData.deductions,
        entryData.employer_contribution_rate,
        entryData.employer_contribution,
        entryData.net_pay,
        entryData.employer_cost,
        entryData.notes,
      ]);
    }

    const cycle = await get('SELECT * FROM cycles WHERE id = ?', [cycleId]);
    res.status(201).json({ data: cycle });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear la nómina', details: error.message });
  }
});

app.get('/api/cycles/:id/entries', async (req, res) => {
  const { id } = req.params;
  try {
    const cycle = await get('SELECT * FROM cycles WHERE id = ?', [id]);
    if (!cycle) {
      return res.status(404).json({ error: 'Nómina no encontrada' });
    }

    const entries = await all(
      `SELECT e.*, emp.name AS employee_name, emp.role AS employee_role, emp.department AS employee_department
       FROM payroll_entries e
       JOIN employees emp ON emp.id = e.employee_id
       WHERE e.cycle_id = ?
       ORDER BY emp.name ASC`,
      [id]
    );

    res.json({ data: { cycle, entries } });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron cargar los movimientos de la nómina', details: error.message });
  }
});

app.put('/api/entries/:id', async (req, res) => {
  const { id } = req.params;
  const {
    overtimeHours,
    overtimeRate,
    bonuses,
    benefits,
    deductions,
    taxRate,
    employerContributionRate,
    notes
  } = req.body;

  try {
    const existing = await get('SELECT * FROM payroll_entries WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    const updatedEntry = calculateEntry({
      ...existing,
      overtime_hours: overtimeHours !== undefined ? toNumber(overtimeHours, existing.overtime_hours) : existing.overtime_hours,
      overtime_rate: overtimeRate !== undefined ? toNumber(overtimeRate, existing.overtime_rate) : existing.overtime_rate,
      bonuses: bonuses !== undefined ? toNumber(bonuses, existing.bonuses) : existing.bonuses,
      benefits: benefits !== undefined ? toNumber(benefits, existing.benefits) : existing.benefits,
      deductions: deductions !== undefined ? toNumber(deductions, existing.deductions) : existing.deductions,
      tax_rate: taxRate !== undefined ? toNumber(taxRate, existing.tax_rate) : existing.tax_rate,
      employer_contribution_rate: employerContributionRate !== undefined ? toNumber(employerContributionRate, existing.employer_contribution_rate) : existing.employer_contribution_rate,
      notes: notes !== undefined ? notes : existing.notes,
    });

    await run(
      `UPDATE payroll_entries
       SET overtime_hours = ?, overtime_rate = ?, overtime_pay = ?,
           bonuses = ?, benefits = ?, tax_rate = ?, tax_withheld = ?, deductions = ?,
           employer_contribution_rate = ?, employer_contribution = ?,
           net_pay = ?, employer_cost = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        updatedEntry.overtime_hours,
        updatedEntry.overtime_rate,
        updatedEntry.overtime_pay,
        updatedEntry.bonuses,
        updatedEntry.benefits,
        updatedEntry.tax_rate,
        updatedEntry.tax_withheld,
        updatedEntry.deductions,
        updatedEntry.employer_contribution_rate,
        updatedEntry.employer_contribution,
        updatedEntry.net_pay,
        updatedEntry.employer_cost,
        updatedEntry.notes,
        id,
      ]
    );

    const refreshed = await get(
      `SELECT e.*, emp.name AS employee_name, emp.role AS employee_role, emp.department AS employee_department
       FROM payroll_entries e
       JOIN employees emp ON emp.id = e.employee_id
       WHERE e.id = ?`,
      [id]
    );
    res.json({ data: refreshed });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el movimiento', details: error.message });
  }
});

app.post('/api/cycles/:id/process', async (req, res) => {
  const { id } = req.params;
  try {
    const cycle = await get('SELECT * FROM cycles WHERE id = ?', [id]);
    if (!cycle) {
      return res.status(404).json({ error: 'Nómina no encontrada' });
    }

    await run(
      `UPDATE cycles SET status = 'processed', processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    const processed = await get('SELECT * FROM cycles WHERE id = ?', [id]);
    res.json({ data: processed });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo procesar la nómina', details: error.message });
  }
});

app.get('/api/dashboard', async (_req, res) => {
  try {
    const [stats] = await all(`
      SELECT
        (SELECT COUNT(*) FROM employees) AS total_employees,
        (SELECT COUNT(*) FROM cycles WHERE status = 'draft') AS draft_cycles,
        (SELECT COUNT(*) FROM cycles WHERE status = 'processed') AS processed_cycles,
        ROUND((SELECT COALESCE(SUM(net_pay), 0) FROM payroll_entries), 2) AS total_payroll,
        ROUND((SELECT COALESCE(SUM(employer_cost), 0) FROM payroll_entries), 2) AS total_employer_cost
    `);

    const latestEntries = await all(
      `SELECT e.id, emp.name AS employee_name, c.name AS cycle_name, e.net_pay, e.updated_at
       FROM payroll_entries e
       JOIN employees emp ON emp.id = e.employee_id
       JOIN cycles c ON c.id = e.cycle_id
       ORDER BY e.updated_at DESC
       LIMIT 5`
    );

    res.json({ data: { stats, latestEntries } });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron obtener los indicadores', details: error.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor de nóminas listo en http://localhost:${PORT}`);
});
