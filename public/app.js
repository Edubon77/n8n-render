const statsGrid = document.getElementById('statsGrid');
const latestEntriesList = document.getElementById('latestEntries');
const timezoneLabel = document.getElementById('timezoneLabel');
const refreshDashboardBtn = document.getElementById('refreshDashboard');
const openGuideBtn = document.getElementById('openGuide');
const quickstartPanel = document.getElementById('quickstartPanel');
const quickstartBackdrop = document.getElementById('quickstartBackdrop');
const closeGuideBtn = document.getElementById('closeGuide');
const ackGuideBtn = document.getElementById('ackGuide');

const employeeTable = document.getElementById('employeeTable');
const employeeForm = document.getElementById('employeeForm');
const toggleEmployeeFormBtn = document.getElementById('toggleEmployeeForm');
const cancelEmployeeBtn = document.getElementById('cancelEmployee');

const cycleGrid = document.getElementById('cycleGrid');
const cycleForm = document.getElementById('cycleForm');
const toggleCycleFormBtn = document.getElementById('toggleCycleForm');
const cancelCycleBtn = document.getElementById('cancelCycle');

const cycleDetails = document.getElementById('cycleDetails');
const cycleDetailsTitle = document.getElementById('cycleDetailsTitle');
const cycleDetailsMeta = document.getElementById('cycleDetailsMeta');
const closeCycleDetailsBtn = document.getElementById('closeCycleDetails');
const entriesTable = document.getElementById('entriesTable');
const entryRowTemplate = document.getElementById('entryRowTemplate');

const toast = document.getElementById('toast');

const QUICKSTART_KEY = 'nominas.quickstartDismissed';

let defaultCurrency = 'MXN';
function formatCurrency(value, currency = defaultCurrency) {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch (error) {
    return `${Number(value).toFixed(2)} ${currency}`;
  }
}

function setTimezoneLabel() {
  const now = new Date();
  timezoneLabel.textContent = `Zona horaria: ${Intl.DateTimeFormat().resolvedOptions().timeZone} · ${now.toLocaleString()}`;
}

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.classList.remove('hidden', 'error');
  if (type === 'error') {
    toast.style.background = 'rgba(248, 113, 113, 0.95)';
    toast.style.color = '#fee2e2';
  } else {
    toast.style.background = 'rgba(2, 132, 199, 0.95)';
    toast.style.color = '#e0f2fe';
  }
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Error inesperado');
  }

  return response.json();
}

function openQuickstart() {
  if (!quickstartPanel || !quickstartBackdrop) return;
  quickstartPanel.classList.remove('hidden');
  quickstartBackdrop.classList.remove('hidden');
  quickstartBackdrop.setAttribute('aria-hidden', 'false');
  quickstartPanel.setAttribute('aria-hidden', 'false');
  quickstartPanel.focus();
}

function closeQuickstart(markDismissed = false) {
  if (!quickstartPanel || !quickstartBackdrop) return;
  quickstartPanel.classList.add('hidden');
  quickstartBackdrop.classList.add('hidden');
  quickstartBackdrop.setAttribute('aria-hidden', 'true');
  quickstartPanel.setAttribute('aria-hidden', 'true');
  if (markDismissed) {
    try {
      localStorage.setItem(QUICKSTART_KEY, 'true');
    } catch (error) {
      console.warn('No se pudo persistir la preferencia de la guía', error);
    }
  }
}

function renderStats(stats) {
  statsGrid.innerHTML = '';
  const statDefinitions = [
    { key: 'total_employees', label: 'Colaboradores' },
    { key: 'draft_cycles', label: 'Nóminas en curso' },
    { key: 'processed_cycles', label: 'Nóminas cerradas' },
    { key: 'total_payroll', label: 'Total pagado' },
    { key: 'total_employer_cost', label: 'Costo patronal' },
  ];

  statDefinitions.forEach((stat) => {
    const value = stats?.[stat.key] ?? 0;
    const formatted = stat.key.includes('total_') ? formatCurrency(value) : value;
    const card = document.createElement('article');
    card.className = 'stat-card';
    card.innerHTML = `<span>${stat.label}</span><strong>${formatted}</strong>`;
    statsGrid.appendChild(card);
  });
}

function renderLatestEntries(entries) {
  latestEntriesList.innerHTML = '';
  if (!entries?.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Aún no hay movimientos registrados.';
    empty.style.justifyContent = 'center';
    empty.style.color = 'var(--muted)';
    latestEntriesList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <div>
        <strong>${entry.employee_name}</strong>
        <span class="muted">${entry.cycle_name}</span>
      </div>
      <div class="figure">${formatCurrency(entry.net_pay)}</div>
    `;
    latestEntriesList.appendChild(item);
  });
}

function renderEmployees(employees) {
  employeeTable.innerHTML = '';
  if (!employees.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6" style="text-align:center;color:var(--muted);padding:2rem;">Agrega a tu primer colaborador.</td>`;
    employeeTable.appendChild(row);
    return;
  }

  employees.forEach((employee) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="employee-card">
          <strong>${employee.name}</strong>
          <small>${employee.email || ''}</small>
        </div>
      </td>
      <td>${employee.role || '—'}</td>
      <td>${employee.department || '—'}</td>
      <td class="figure">${formatCurrency(employee.salary)}</td>
      <td>${employee.bank_name || '—'}</td>
      <td>
        <button class="small ghost" data-action="delete" data-id="${employee.id}">Eliminar</button>
      </td>
    `;
    employeeTable.appendChild(row);
  });
}

function renderCycles(cycles) {
  cycleGrid.innerHTML = '';
  if (!cycles.length) {
    const empty = document.createElement('div');
    empty.className = 'cycle-card';
    empty.innerHTML = `<header><strong>Sin nóminas</strong></header><p style="color:var(--muted);">Genera un nuevo ciclo para calcular percepciones brutales.</p>`;
    cycleGrid.appendChild(empty);
    return;
  }

  cycles.forEach((cycle) => {
    const card = document.createElement('article');
    card.className = 'cycle-card';
    card.innerHTML = `
      <header>
        <strong>${cycle.name || 'Nómina sin título'}</strong>
        <span class="status-tag ${cycle.status}">${cycle.status}</span>
      </header>
      <span class="muted">${cycle.period_start} → ${cycle.period_end}</span>
      <span class="muted">${cycle.total_entries} colaboradores</span>
      <footer>
        <div class="figures">
          <span>Pagos netos</span>
          <strong class="figure">${formatCurrency(cycle.total_net_pay || 0, cycle.currency || defaultCurrency)}</strong>
        </div>
        <div class="figures">
          <span>Costo total</span>
          <strong class="figure">${formatCurrency(cycle.total_employer_cost || 0, cycle.currency || defaultCurrency)}</strong>
        </div>
        <div class="action-group">
          <button class="small" data-action="details" data-id="${cycle.id}">Ver detalle</button>
          ${cycle.status === 'draft' ? `<button class="small" data-action="process" data-id="${cycle.id}">Cerrar</button>` : ''}
        </div>
      </footer>
    `;
    cycleGrid.appendChild(card);
  });
}

function populateEntryRow(row, entry, currency = defaultCurrency) {
  row.dataset.entryId = entry.id;
  row.querySelector('[data-field="employee_name"]').textContent = entry.employee_name;
  row.querySelector('[data-field="employee_role"]').textContent = entry.employee_role || '—';
  row.querySelector('[data-field="employee_department"]').textContent = entry.employee_department || '—';
  row.querySelector('[data-field="base_salary"]').textContent = formatCurrency(entry.base_salary, currency);
  row.querySelector('[data-field="overtime_pay"]').textContent = formatCurrency(entry.overtime_pay, currency);
  row.querySelector('[data-field="net_pay"]').textContent = formatCurrency(entry.net_pay, currency);
  row.querySelector('[data-field="employer_cost"]').textContent = formatCurrency(entry.employer_cost, currency);

  row.querySelector('[data-input="overtime_hours"]').value = entry.overtime_hours;
  row.querySelector('[data-input="overtime_rate"]').value = entry.overtime_rate;
  row.querySelector('[data-input="bonuses"]').value = entry.bonuses;
  row.querySelector('[data-input="benefits"]').value = entry.benefits;
  row.querySelector('[data-input="deductions"]').value = entry.deductions;
  row.querySelector('[data-input="tax_rate"]').value = entry.tax_rate;
  row.querySelector('[data-input="employer_contribution_rate"]').value = entry.employer_contribution_rate;

  const saveButton = row.querySelector('[data-action="save"]');
  const isProcessed = cycleDetails.dataset.status === 'processed';
  saveButton.disabled = isProcessed;
  row.querySelectorAll('input').forEach((input) => {
    input.disabled = isProcessed;
  });
}

async function loadDashboard() {
  try {
    const { data } = await fetchJSON('/api/dashboard');
    renderStats(data.stats || {});
    renderLatestEntries(data.latestEntries || []);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadEmployees() {
  try {
    const { data } = await fetchJSON('/api/employees');
    renderEmployees(data);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadCycles() {
  try {
    const { data } = await fetchJSON('/api/cycles');
    if (data?.length) {
      defaultCurrency = data[0].currency || defaultCurrency;
    }
    renderCycles(data);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadCycleEntries(cycleId) {
  try {
    const { data } = await fetchJSON(`/api/cycles/${cycleId}/entries`);
    const { cycle, entries } = data;
    cycleDetails.dataset.id = cycle.id;
    cycleDetails.dataset.status = cycle.status;
    defaultCurrency = cycle.currency || 'MXN';
    cycleDetails.dataset.currency = defaultCurrency;
    cycleDetails.classList.remove('hidden');
    cycleDetailsTitle.textContent = cycle.name || 'Nómina sin título';
    cycleDetailsMeta.textContent = `${cycle.period_start} → ${cycle.period_end} · ${cycle.currency} · ${cycle.status}`;

    entriesTable.innerHTML = '';
    entries.forEach((entry) => {
      const fragment = entryRowTemplate.content.cloneNode(true);
      const row = fragment.querySelector('tr');
      populateEntryRow(row, entry, defaultCurrency);
      entriesTable.appendChild(fragment);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleEmployeeSubmit(event) {
  event.preventDefault();
  const formData = new FormData(employeeForm);
  const payload = Object.fromEntries(formData.entries());
  payload.salary = parseFloat(payload.salary);

  try {
    await fetchJSON('/api/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    showToast('Colaborador agregado.');
    employeeForm.reset();
    employeeForm.classList.add('hidden');
    loadEmployees();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleCycleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(cycleForm);
  const payload = Object.fromEntries(formData.entries());
  ['taxRate', 'benefitsRate', 'employerContributionRate'].forEach((key) => {
    if (payload[key]) payload[key] = parseFloat(payload[key]);
  });

  try {
    await fetchJSON('/api/cycles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    showToast('Nómina generada.');
    cycleForm.reset();
    cycleForm.classList.add('hidden');
    await Promise.all([loadCycles(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleEntryUpdate(row) {
  const entryId = row.dataset.entryId;
  const inputs = row.querySelectorAll('[data-input]');
  const payload = {};

  inputs.forEach((input) => {
    const value = input.value;
    payload[input.dataset.input.replace(/-/g, '_')] = value !== '' ? parseFloat(value) : null;
  });

  try {
    const { data } = await fetchJSON(`/api/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify({
        overtimeHours: payload.overtime_hours,
        overtimeRate: payload.overtime_rate,
        bonuses: payload.bonuses,
        benefits: payload.benefits,
        deductions: payload.deductions,
        taxRate: payload.tax_rate,
        employerContributionRate: payload.employer_contribution_rate,
      }),
    });

    populateEntryRow(row, data, cycleDetails.dataset.currency || defaultCurrency);
    showToast('Movimiento actualizado.');
    loadCycles();
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleProcessCycle(cycleId) {
  if (!confirm('¿Deseas cerrar esta nómina?')) return;
  try {
    await fetchJSON(`/api/cycles/${cycleId}/process`, { method: 'POST' });
    showToast('Nómina procesada.');
    cycleDetails.classList.add('hidden');
    await Promise.all([loadCycles(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleDeleteEmployee(id) {
  if (!confirm('¿Eliminar este colaborador? Se borrarán sus registros en nómina.')) return;
  try {
    await fetchJSON(`/api/employees/${id}`, { method: 'DELETE' });
    showToast('Colaborador eliminado.');
    await Promise.all([loadEmployees(), loadCycles(), loadDashboard()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function toggleForm(form) {
  form.classList.toggle('hidden');
}

function attachEventListeners() {
  setTimezoneLabel();
  refreshDashboardBtn.addEventListener('click', () => {
    setTimezoneLabel();
    loadDashboard();
  });
  toggleEmployeeFormBtn.addEventListener('click', () => toggleForm(employeeForm));
  cancelEmployeeBtn.addEventListener('click', () => employeeForm.classList.add('hidden'));
  toggleCycleFormBtn.addEventListener('click', () => toggleForm(cycleForm));
  cancelCycleBtn.addEventListener('click', () => cycleForm.classList.add('hidden'));
  employeeForm.addEventListener('submit', handleEmployeeSubmit);
  cycleForm.addEventListener('submit', handleCycleSubmit);
  closeCycleDetailsBtn.addEventListener('click', () => cycleDetails.classList.add('hidden'));

  if (openGuideBtn) {
    openGuideBtn.addEventListener('click', () => {
      openQuickstart();
    });
  }
  if (closeGuideBtn) {
    closeGuideBtn.addEventListener('click', () => closeQuickstart());
  }
  if (ackGuideBtn) {
    ackGuideBtn.addEventListener('click', () => closeQuickstart(true));
  }
  if (quickstartBackdrop) {
    quickstartBackdrop.addEventListener('click', () => closeQuickstart());
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && quickstartPanel && !quickstartPanel.classList.contains('hidden')) {
      closeQuickstart();
    }
  });

  employeeTable.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="delete"]');
    if (button) {
      handleDeleteEmployee(button.dataset.id);
    }
  });

  cycleGrid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const cycleId = button.dataset.id;
    if (button.dataset.action === 'details') {
      loadCycleEntries(cycleId);
    }
    if (button.dataset.action === 'process') {
      handleProcessCycle(cycleId);
    }
  });

  entriesTable.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="save"]');
    if (button) {
      const row = button.closest('tr');
      handleEntryUpdate(row);
    }
  });

  try {
    const dismissed = localStorage.getItem(QUICKSTART_KEY) === 'true';
    if (!dismissed) {
      setTimeout(() => openQuickstart(), 300);
    }
  } catch (error) {
    console.warn('No se pudo leer el estado de la guía rápida', error);
    setTimeout(() => openQuickstart(), 300);
  }
}

attachEventListeners();
Promise.all([loadDashboard(), loadEmployees(), loadCycles()]);
