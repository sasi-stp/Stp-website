// --- CONFIGURATION ---
const APP_PASSWORD = "1234"; 
const GOOGLE_SHEETS_WEBAPP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// --- STATE MANAGEMENT ---
let shopDirectory = JSON.parse(localStorage.getItem('watalappan_shop_directory')) || [
    { name: "Main Shop", phone: "0771234567" },
    { name: "Town Bakery", phone: "0719876543" }
];

let productsMap = JSON.parse(localStorage.getItem('watalappan_products_map')) || {
    "වටලප්පන්": [150, 90, 10, 1], 
    "යෝගට්": [70, 40, 0, 0], 
    "ජෙලි යෝගට්": [90, 50, 0, 0], 
    "කැරමල් පුඩිං": [180, 110, 0, 0]
};

let salesData = JSON.parse(localStorage.getItem('watalappan_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('watalappan_expenses')) || [];
let stockHistory = JSON.parse(localStorage.getItem('watalappan_stock_history')) || [];
let creditPayments = JSON.parse(localStorage.getItem('watalappan_credit_payments')) || [];

// --- DOM ELEMENTS ---
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

const salesDateInput = document.getElementById('sales-date');
const shopSelect = document.getElementById('shop-select');
const filterShopSelect = document.getElementById('filter-shop-select');
const filterProductSelect = document.getElementById('filter-product-select');
const filterTimeSelect = document.getElementById('filter-time-select');
const pnlProductFilterSelect = document.getElementById('pnl-product-filter-select');

const itemsContainer = document.getElementById('items-container');
const totalPriceDisplay = document.getElementById('total-price-display');
const salesForm = document.getElementById('sales-form');
const salesTableBody = document.getElementById('sales-table-body');
const billPreviewBox = document.getElementById('bill-preview-box');

const sendBillCheckbox = document.getElementById('send-bill-checkbox');
const sharingOptionsWrapper = document.getElementById('sharing-options-wrapper');

// --- APP LIFECYCLE ---
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
        loginError.textContent = "❌ වැරදි මුරපදයක්!";
        passwordInput.value = "";
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    appContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    passwordInput.value = "";
});

function initApp() {
    salesDateInput.value = new Date().toISOString().split('T')[0];
    document.getElementById('stock-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    
    populateDropdowns();
    renderShops();
    renderProductsSettings();
    
    itemsContainer.innerHTML = '';
    addItemRow();
    
    renderSalesTable();
    renderStockOverview();
    renderStockHistoryTable();
    renderExpenseTable();
    renderCreditTable();
    renderMonthlyPnL();
    updateFilteredAnalytics();
    
    [filterShopSelect, filterProductSelect, filterTimeSelect].forEach(el => {
        el.addEventListener('change', updateFilteredAnalytics);
    });
    
    pnlProductFilterSelect.addEventListener('change', renderMonthlyPnL);

    sendBillCheckbox.addEventListener('change', () => {
        if(sendBillCheckbox.checked) {
            sharingOptionsWrapper.classList.remove('hidden');
        } else {
            sharingOptionsWrapper.classList.add('hidden');
        }
    });

    document.getElementById('stock-item-select').addEventListener('change', updateStockPrevBalPreview);
}

function populateDropdowns() {
    shopSelect.innerHTML = '';
    filterShopSelect.innerHTML = '<option value="ALL">== සියලුම කඩවල් ==</option>';
    document.getElementById('credit-shop-select').innerHTML = '';
    
    const stockItemSelect = document.getElementById('stock-item-select');
    stockItemSelect.innerHTML = '';
    
    const prevFilterProduct = filterProductSelect.value || "ALL";
    const prevPnlFilterProduct = pnlProductFilterSelect.value || "ALL";

    filterProductSelect.innerHTML = '<option value="ALL">== සියලුම භාණ්ඩ ==</option>';
    pnlProductFilterSelect.innerHTML = '<option value="ALL">== සියලුම භාණ්ඩ (මුළු වාර්තාව) ==</option>';
    
    shopDirectory.forEach(s => {
        shopSelect.add(new Option(s.name, s.name));
        filterShopSelect.add(new Option(s.name, s.name));
        document.getElementById('credit-shop-select').add(new Option(s.name, s.name));
    });

    Object.keys(productsMap).forEach(t => {
        stockItemSelect.add(new Option(t, t));
        filterProductSelect.add(new Option(t, t));
        pnlProductFilterSelect.add(new Option(t, t));
    });

    filterProductSelect.value = prevFilterProduct;
    pnlProductFilterSelect.value = prevPnlFilterProduct;
}

// --- TAB NAVIGATION FUNCTION ---
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
    } else {
        buttons.forEach(btn => {
            if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)) {
                btn.classList.add('active');
            }
        });
    }

    if(tabId === 'tab-entry') {
        updateLiveTotal();
    } else if(tabId === 'tab-analytics') {
        updateFilteredAnalytics();
    } else if(tabId === 'tab-pnl') {
        renderMonthlyPnL();
    }
};

// --- DYNAMIC MULTI-ITEM GRID STRUCTURE ---
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
        <button type="button" class="btn-remove-row" onclick="removeItemRow('${rowId}')">✖</button>
        <div class="form-group">
            <label>භාණ්ඩ වර්ගය:</label>
            <select class="row-item-select" onchange="updateLiveTotal()">${optionsHtml}</select>
            <small class="row-scheme-lbl" style="color: #ff9800; font-weight: bold; margin-top: 2px;"></small>
        </div>
        <div class="form-group-row-three">
            <div class="form-group">
                <label>දැමූ ප්‍රමාණය (Qty):</label>
                <input type="number" class="row-qty-input" min="0" value="0" oninput="updateLiveTotal()">
                <small class="row-stock-lbl" style="color: blue; font-weight: bold; margin-top: 2px;">තොගයේ ඇත: 0</small>
            </div>
            <div class="form-group">
                <label>Free ප්‍රමාණය:</label>
                <input type="number" class="row-free-input" min="0" value="0" oninput="updateLiveTotal()">
            </div>
            <div class="form-group">
                <label>Return ප්‍රමාණය:</label>
                <input type="number" class="row-ret-input" min="0" value="0" oninput="updateLiveTotal()">
           
