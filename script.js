// --- CONFIGURATION
const APP_PASSWORD = "1234";
const GOOGLE_SHEETS_WEBAPP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// --- STATE MANAGEMENT
let shopDirectory = JSON.parse(localStorage.getItem('watalappan_shop_directory')) || [
    { name: "Main Shop", phone: "0771234567" },
    { name: "Town Bakery", phone: "0719876543" }
];

let productsMap = JSON.parse(localStorage.getItem('watalappan_products_map')) || {
    "වටලප්පන්": [150, 90, 10, 1],
    "පුඩිං": [70, 40, 0, 0],
    "කැරමල්": [180, 110, 0, 0]
};

let salesData = JSON.parse(localStorage.getItem('watalappan_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('watalappan_expenses')) || [];
let stockHistory = JSON.parse(localStorage.getItem('watalappan_stock_history')) || [];
let creditPayments = JSON.parse(localStorage.getItem('watalappan_credit_payments')) || [];

// DOM ELEMENTS
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const salesDateInput = document.getElementById('sales-date');
const shopSelect = document.getElementById('shop-select');
const itemsContainer = document.getElementById('items-container');
const totalPriceDisplay = document.getElementById('total-price-display');
const salesForm = document.getElementById('sales-form');
const sendBillCheckbox = document.getElementById('send-bill-checkbox');
const sharingOptionsWrapper = document.getElementById('sharing-options-wrapper');

// -- APP LIFECYCLE
document.addEventListener("DOMContentLoaded", () => {
    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (passwordInput.value.trim() === APP_PASSWORD) {
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initApp();
    } else {
        loginError.textContent = 'වැරදි මුරපදයක්!';
        passwordInput.value = "";
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    appContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    passwordInput.value = "";
});

function initApp() {
    if(salesDateInput) salesDateInput.value = new Date().toISOString().split('T')[0];
    document.getElementById('stock-date').value = new Date().toISOString().split('T')[0];
    populateDropdowns();
    if(itemsContainer) {
        itemsContainer.innerHTML = '';
        addItemRow();
    }
    renderStockOverview();
}

function populateDropdowns() {
    if(shopSelect) {
        shopSelect.innerHTML = '';
        shopDirectory.forEach(s => {
            shopSelect.add(new Option(s.name, s.name));
        });
    }
    const stockItemSelect = document.getElementById('stock-item-select');
    if(stockItemSelect) {
        stockItemSelect.innerHTML = '';
        Object.keys(productsMap).forEach(t => {
            stockItemSelect.add(new Option(t, t));
        });
    }
}

window.switchTab = function(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active-content'));
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active-content');
    }
    
    const evt = window.event;
    if (evt && evt.target && evt.target.classList.contains('tab-btn')) {
        evt.target.classList.add('active');
    }
    if(tabId === 'tab-entry') {
        updateLiveTotal();
    }
};

window.addItemRow = function() {
    const rowId = 'row_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    const rowCard = document.createElement('div');
    rowCard.className = 'item-row-card';
    rowCard.id = rowId;
    let optionsHtml = '';
    Object.keys(productsMap).forEach(prodName => {
        optionsHtml += `<option value="${prodName}">${prodName}</option>`;
    });
    rowCard.innerHTML = `
        <div class="card" style="position:relative; margin-top:10px;">
            <button type="button" class="btn-danger" style="position:absolute; right:10px; top:10px; padding:2px 8px;" onclick="removeItemRow('${rowId}')">X</button>
            <div class="form-group">
                <label>භාණ්ඩ වර්ගය:</label>
                <select class="row-item-select" onchange="updateLiveTotal()">${optionsHtml}</select>
            </div>
            <div class="form-group-row">
                <div class="form-group"><label>Qty:</label><input type="number" class="row-qty-input" min="0" value="0" oninput="updateLiveTotal()"></div>
                <div class="form-group"><label>Free:</label><input type="number" class="row-free-input" min="0" value="0" oninput="updateLiveTotal()"></div>
                <div class="form-group"><label>Return:</label><input type="number" class="row-ret-input" min="0" value="0" oninput="updateLiveTotal()"></div>
            </div>
        </div>
    `;
    itemsContainer.appendChild(rowCard);
    updateLiveTotal();
};

window.removeItemRow = function (rowId) {
    const rows = itemsContainer.getElementsByClassName('item-row-card');
    if(rows.length <= 1) {
        alert("බිලකට අවම වශයෙන් එක භාණ්ඩ වර්ගයක්වත් තිබිය යුතුය.");
        return;
    }
    const targetRow = document.getElementById(rowId);
    if(targetRow) {
        targetRow.remove();
        updateLiveTotal();
    }
};

function calculateCurrentStock() {
    let totalBuilt = {};
    let remainingStock = {};
    Object.keys(productsMap).forEach(t => {
        totalBuilt[t] = 0; remainingStock[t] = 0;
    });
    stockHistory.forEach(h => {
        if(totalBuilt[h.item] !== undefined) {
            totalBuilt[h.item] += (parseInt(h.prevBal) || 0) + (parseInt(h.qty) || 0);
        }
    });
    Object.keys(totalBuilt).forEach(k => { remainingStock[k] = totalBuilt[k]; });
    salesData.forEach(s => {
        if(s.itemsList && Array.isArray(s.itemsList)) {
            s.itemsList.forEach(si => {
                if (remainingStock[si.item] !== undefined) {
                    remainingStock[si.item] -= si.qty;
                }
            });
        }
    });
    return { totalBuilt, remainingStock };
}

function updateLiveTotal() {
    let overallBillNetTotal = 0;
    const rows = itemsContainer.getElementsByClassName('item-row-card');
    for(let row of rows) {
        const itemSelect = row.querySelector('.row-item-select');
        const qtyInput = row.querySelector('.row-qty-input');
        const freeInput = row.querySelector('.row-free-input');
        const retInput = row.querySelector('.row-ret-input');
        
        const item = itemSelect.value;
        const qty = parseInt(qtyInput.value) || 0;
        const freeQty = parseInt(freeInput.value) || 0;
        const retQty = parseInt(retInput.value) || 0;
        
        const price = productsMap[item] ? parseFloat(productsMap[item][0]) : 0;
        const finalBillableQty = Math.max(0, qty - freeQty - retQty);
        overallBillNetTotal += (finalBillableQty * price);
    }
    totalPriceDisplay.textContent = `රු. ${overallBillNetTotal.toFixed(2)}`;
}

function renderStockOverview() {
    const stock = calculateCurrentStock();
    const tbody = document.getElementById('stock-overview-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    Object.keys(productsMap).forEach(prod => {
        const built = stock.totalBuilt[prod] || 0;
        const remaining = stock.remainingStock[prod] || 0;
        const sold = built - remaining;
        tbody.innerHTML += `<tr><td>${prod}</td><td>${built}</td><td>${sold}</td><td>${remaining}</td></tr>`;
    });
}

if(sendBillCheckbox) {
    sendBillCheckbox.addEventListener('change', () => {
        if(sendBillCheckbox.checked) {
            sharingOptionsWrapper.classList.remove('hidden');
        } else {
            sharingOptionsWrapper.classList.add('hidden');
        }
    });
}
