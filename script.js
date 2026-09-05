let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let isEditing = false;
let chartInstance = null;

const form = document.getElementById('tx-form');
const txIdInput = document.getElementById('tx-id');
const descInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');

const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const filterFromDate = document.getElementById('filter-from-date');
const filterToDate = document.getElementById('filter-to-date');

const txList = document.getElementById('tx-list');
const selectMonth = document.getElementById('select-month');
const selectYear = document.getElementById('select-year');

const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function initSelectors() {
  const today = new Date();
  const currentYear = today.getFullYear();
  selectMonth.value = today.getMonth();

  selectYear.innerHTML = '';
  for (let y = currentYear - 5; y <= currentYear + 2; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === currentYear) option.selected = true;
    selectYear.appendChild(option);
  }
}

function formatDateToDDMMYYYY(isoDateStr) {
  if (!isoDateStr) return '';
  const [year, month, day] = isoDateStr.split('-');
  return `${day}-${month}-${year}`;
}

dateInput.value = new Date().toISOString().split('T')[0];

function saveAndRender() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  render();
}

function updateSummary() {
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expenses;

  const chosenMonth = parseInt(selectMonth.value, 10);
  const chosenYear = parseInt(selectYear.value, 10);

  const periodLabel = document.getElementById('selected-period-label');
  if (periodLabel) {
    periodLabel.textContent = `${monthNamesShort[chosenMonth]} ${chosenYear} Expense`;
  }

  const filteredMonthlyExpense = transactions
    .filter(t => t.type === 'expense')
    .filter(t => {
      if (!t.date) return false;
      const [yearStr, monthStr] = t.date.split('-');
      return (parseInt(monthStr, 10) - 1) === chosenMonth && parseInt(yearStr, 10) === chosenYear;
    })
    .reduce((acc, t) => acc + t.amount, 0);

  document.getElementById('total-bal').textContent = `₹${balance.toFixed(2)}`;
  document.getElementById('total-inc').textContent = `₹${income.toFixed(2)}`;
  document.getElementById('total-exp').textContent = `₹${expenses.toFixed(2)}`;
  document.getElementById('monthly-exp').textContent = `₹${filteredMonthlyExpense.toFixed(2)}`;
}

function renderChart() {
  const expenseData = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category.toLowerCase();
    const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
    expenseData[formattedCat] = (expenseData[formattedCat] || 0) + t.amount;
  });

  const labels = Object.keys(expenseData);
  const data = Object.values(expenseData);
  const ctx = document.getElementById('categoryChart').getContext('2d');

  if (chartInstance) chartInstance.destroy();
  if (labels.length === 0) return;

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function render() {
  updateSummary();
  renderChart();
  txList.innerHTML = '';

  const selectedType = filterType.value;
  const categorySearch = filterCategory.value.toLowerCase().trim();
  const fromDate = filterFromDate.value;
  const toDate = filterToDate.value;

  const filtered = transactions.filter(t => {
    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesCategory = !categorySearch || (t.category && t.category.toLowerCase().includes(categorySearch));
    
    let matchesDateRange = true;
    if (fromDate && fromDate.trim() !== '') {
      if (!t.date || t.date < fromDate) matchesDateRange = false;
    }
    if (toDate && toDate.trim() !== '') {
      if (!t.date || t.date > toDate) matchesDateRange = false;
    }

    return matchesType && matchesCategory && matchesDateRange;
  });

  if (filtered.length === 0) {
    txList.innerHTML = '<li style="text-align:center; color: var(--text-muted); padding: 1rem;">No transactions found.</li>';
    return;
  }

  filtered.forEach(t => {
    const li = document.createElement('li');
    li.className = `transaction-item ${t.type}`;
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(t.description)}</strong>
        <div style="font-size:0.75rem; color: var(--text-muted);">
          ${escapeHtml(t.category)} • ${formatDateToDDMMYYYY(t.date)}
        </div>
      </div>
      <div class="tx-right">
        <div class="tx-amount">₹${t.amount.toFixed(2)}</div>
        <div class="tx-actions">
          <button class="icon-btn edit-btn" onclick="startEdit('${t.id}')" title="Edit">Edit</button>
          <button class="icon-btn delete-btn" onclick="deleteTransaction('${t.id}')" title="Delete">Delete</button>
        </div>
      </div>
    `;
    txList.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function validateForm() {
  let isValid = true;
  document.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');
  document.querySelectorAll('input').forEach(el => el.classList.remove('invalid'));

  if (!descInput.value.trim()) { document.getElementById('desc-error').style.display = 'block'; descInput.classList.add('invalid'); isValid = false; }
  if (!amountInput.value || parseFloat(amountInput.value) <= 0) { document.getElementById('amount-error').style.display = 'block'; amountInput.classList.add('invalid'); isValid = false; }
  if (!categoryInput.value.trim()) { document.getElementById('category-error').style.display = 'block'; categoryInput.classList.add('invalid'); isValid = false; }
  if (!dateInput.value) { document.getElementById('date-error').style.display = 'block'; dateInput.classList.add('invalid'); isValid = false; }
  return isValid;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    id: isEditing ? txIdInput.value : Date.now().toString(),
    description: descInput.value.trim(),
    amount: parseFloat(parseFloat(amountInput.value).toFixed(2)),
    type: typeInput.value,
    category: categoryInput.value.trim(),
    date: dateInput.value
  };

  if (isEditing) {
    transactions = transactions.map(t => t.id === payload.id ? payload : t);
    resetForm();
  } else {
    transactions.unshift(payload);
  }

  form.reset();
  dateInput.value = new Date().toISOString().split('T')[0];
  saveAndRender();
});

window.startEdit = function(id) {
  const t = transactions.find(item => item.id === id);
  if (!t) return;

  isEditing = true;
  txIdInput.value = t.id;
  descInput.value = t.description;
  amountInput.value = t.amount;
  typeInput.value = t.type;
  categoryInput.value = t.category;
  dateInput.value = t.date;

  document.getElementById('form-title').textContent = 'Edit Transaction';
  submitBtn.textContent = 'Update Transaction';
  cancelBtn.style.display = 'block';
};

function resetForm() {
  isEditing = false;
  txIdInput.value = '';
  form.reset();
  dateInput.value = new Date().toISOString().split('T')[0];
  document.getElementById('form-title').textContent = 'Add Transaction';
  submitBtn.textContent = 'Add Transaction';
  cancelBtn.style.display = 'none';
}

cancelBtn.addEventListener('click', resetForm);

window.deleteTransaction = function(id) {
  transactions = transactions.filter(t => t.id !== id);
  if (isEditing && txIdInput.value === id) resetForm();
  saveAndRender();
};

selectMonth.addEventListener('change', updateSummary);
selectYear.addEventListener('change', updateSummary);
filterType.addEventListener('change', render);
filterCategory.addEventListener('input', render);
filterFromDate.addEventListener('change', render);
filterToDate.addEventListener('change', render);

initSelectors();
render();