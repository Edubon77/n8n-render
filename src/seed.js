const db = require('./db');

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

function computeEntry({
  baseSalary,
  overtimeHours = 0,
  overtimeRate = 0,
  bonuses = 0,
  benefits = 0,
  deductions = 0,
  taxRate = 0.12,
  employerContributionRate = 0.02,
}) {
  const safeBaseSalary = toNumber(baseSalary);
  const safeOvertimeHours = toNumber(overtimeHours);
  const safeOvertimeRate = toNumber(overtimeRate);
  const safeBonuses = toNumber(bonuses);
  const safeBenefits = toNumber(benefits);
  const safeDeductions = toNumber(deductions);
  const safeTaxRate = toNumber(taxRate, 0.12);
  const safeEmployerContributionRate = toNumber(employerContributionRate, 0.02);

  const overtimePay = +(safeOvertimeHours * safeOvertimeRate).toFixed(2);
  const taxable = safeBaseSalary + overtimePay + safeBonuses;
  const taxWithheld = +(taxable * safeTaxRate).toFixed(2);
  const employerContribution = +(taxable * safeEmployerContributionRate).toFixed(2);
  const netPay = +(taxable - taxWithheld - safeDeductions + safeBenefits).toFixed(2);
  const employerCost = +(taxable + employerContribution + safeBenefits).toFixed(2);

  return {
    base_salary: safeBaseSalary,
    overtime_hours: safeOvertimeHours,
    overtime_rate: safeOvertimeRate,
    overtime_pay: overtimePay,
    bonuses: safeBonuses,
    benefits: safeBenefits,
    deductions: safeDeductions,
    tax_rate: safeTaxRate,
    employer_contribution_rate: safeEmployerContributionRate,
    tax_withheld: taxWithheld,
    net_pay: netPay,
    employer_contribution: employerContribution,
    employer_cost: employerCost,
  };
}

async function ensureEmployees() {
  const { count } = await get('SELECT COUNT(*) as count FROM employees');
  if (count > 0) {
    console.log('✔️  Colaboradores existentes, no se agregan duplicados.');
    return all('SELECT id, name, salary FROM employees');
  }

  console.log('➕ Insertando colaboradores de ejemplo...');
  const seedEmployees = [
    {
      name: 'Lupita Sánchez',
      email: 'lupita.sanchez@empresa.mx',
      role: 'People Lead',
      department: 'Recursos Humanos',
      salary: 48000,
      hire_date: '2023-04-01',
      bank_name: 'BBVA',
      bank_account: '012345678901234567',
    },
    {
      name: 'Rodolfo Vega',
      email: 'rodolfo.vega@empresa.mx',
      role: 'Sales Manager',
      department: 'Ventas',
      salary: 62000,
      hire_date: '2022-11-14',
      bank_name: 'Santander',
      bank_account: '765432109876543210',
    },
  ];

  for (const employee of seedEmployees) {
    await run(
      `INSERT INTO employees (name, email, role, department, salary, hire_date, bank_name, bank_account)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee.name,
        employee.email,
        employee.role,
        employee.department,
        employee.salary,
        employee.hire_date,
        employee.bank_name,
        employee.bank_account,
      ]
    );
  }

  return all('SELECT id, name, salary FROM employees');
}

async function ensureCycle(employees) {
  const { count } = await get('SELECT COUNT(*) as count FROM cycles');
  if (count > 0) {
    console.log('✔️  Ya existe al menos un ciclo de nómina.');
    return;
  }

  console.log('➕ Generando un ciclo de nómina de ejemplo...');
  const periodStart = new Date();
  periodStart.setDate(1);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(0);

  const cycleResult = await run(
    `INSERT INTO cycles (name, period_start, period_end, frequency, currency, status, notes)
     VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
    [
      'Nómina Demo Mensual',
      periodStart.toISOString().slice(0, 10),
      periodEnd.toISOString().slice(0, 10),
      'monthly',
      'MXN',
      'Incluye datos listos para cerrar tu primer nómina.',
    ]
  );

  for (const employee of employees) {
    const entry = computeEntry({ baseSalary: employee.salary });
    await run(
      `INSERT INTO payroll_entries (
         cycle_id,
         employee_id,
         base_salary,
         overtime_hours,
         overtime_rate,
         overtime_pay,
         bonuses,
         benefits,
         tax_rate,
         tax_withheld,
         deductions,
         employer_contribution_rate,
         employer_contribution,
         net_pay,
         employer_cost
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cycleResult.id,
        employee.id,
        entry.base_salary,
        entry.overtime_hours,
        entry.overtime_rate,
        entry.overtime_pay,
        entry.bonuses,
        entry.benefits,
        entry.tax_rate,
        entry.tax_withheld,
        entry.deductions,
        entry.employer_contribution_rate,
        entry.employer_contribution,
        entry.net_pay,
        entry.employer_cost,
      ]
    );
  }

  console.log('✅ Ciclo demo creado con', employees.length, 'colaboradores.');
}

async function main() {
  try {
    const employees = await ensureEmployees();
    await ensureCycle(employees);
    console.log('\nListo. Ejecuta `npm start` y abre http://localhost:3000 para explorar la demo.');
  } catch (error) {
    console.error('Error al preparar los datos de ejemplo:', error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
