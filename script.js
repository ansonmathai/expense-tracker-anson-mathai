// State Management
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let isEditing = false;

// DOM Elements
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
const txList = document.getElementById('tx-list');

// Set default date to today
// dateInput.valueToDate = new Date();
dateInput.value = new Date().toISOString().split('T')[0];

// Save to LocalStorage & Render
function saveAndRender() {
localStorage.setItem('transactions', JSON.stringify(transactions));
render();
}

// Calculate Totals
function updateSummary() {
const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
const balance = income - expenses;

document.getElementById('total-balance').textContent = `₹${balance.toFixed(2)}`;
document.getElementById('total-income').textContent = `₹${income.toFixed(2)}`;
document.getElementById('total-expenses').textContent = `₹${expenses.toFixed(2)}`;
}

// Render Transaction List
function render() {
updateSummary();
txList.innerHTML = '';

const selectedType = filterType.value;
const categorySearch = filterCategory.value.toLowerCase().trim();

const filtered = transactions.filter(t => {
    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesCategory = t.category.toLowerCase().includes(categorySearch);
    return matchesType && matchesCategory;
});

if (filtered.length === 0) {
    txList.innerHTML = '<li style="text-align:center; color: var(--text-muted);">No transactions found.</li>';
    return;
}

filtered.forEach(t => {
    const li = document.createElement('li');
    li.className = `transaction-item ${t.type}`;
    li.innerHTML = `
    <div>
        <strong>${escapeHtml(t.description)}</strong>
        <div style="font-size:0.75rem; color: var(--text-muted);">
        ${escapeHtml(t.category)} • ${t.date}
        </div>
    </div>
    <div style="text-align: right;">
        <div style="font-weight: bold;">${t.type === 'income' ? '+' : '-'}₹${t.amount.toFixed(2)}</div>
        <div class="tx-actions">
        <button class="action-btn edit-btn" onclick="startEdit('${t.id}')">Edit</button>
        <button class="action-btn delete-btn" onclick="deleteTransaction('${t.id}')">Delete</button>
        </div>
    </div>
    `;
    txList.appendChild(li);
});
}

// Helper: XSS Protection
function escapeHtml(str) {
return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Form Validation
function validateForm() {
let isValid = true;

if (!descInput.value.trim()) {
    document.getElementById('desc-error').style.display = 'block';
    isValid = false;
} else { document.getElementById('desc-error').style.display = 'none'; }

if (!amountInput.value || parseFloat(amountInput.value) <= 0) {
    document.getElementById('amount-error').style.display = 'block';
    isValid = false;
} else { document.getElementById('amount-error').style.display = 'none'; }

if (!categoryInput.value.trim()) {
    document.getElementById('category-error').style.display = 'block';
    isValid = false;
} else { document.getElementById('category-error').style.display = 'none'; }

if (!dateInput.value) {
    document.getElementById('date-error').style.display = 'block';
    isValid = false;
} else { document.getElementById('date-error').style.display = 'none'; }

return isValid;
}

// Add / Edit Submission
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

// Start Edit Mode
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

// Reset Form Mode
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

// Delete Transaction
window.deleteTransaction = function(id) {
transactions = transactions.filter(t => t.id !== id);
if (isEditing && txIdInput.value === id) resetForm();
saveAndRender();
};

// Event Listeners for Filters
filterType.addEventListener('change', render);
filterCategory.addEventListener('input', render);

// Initial Render
render();