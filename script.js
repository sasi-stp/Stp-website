           
// --- CONFIGURATION ---
const APP_PASSWORD = "1234"; 
const GOOGLE_SHEETS_WEBAPP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// --- STATE MANAGEMENT ---
// Updated shops array to look up phone directory details
let shopDirectory = JSON.parse(localStorage.getItem('watalappan_shop_directory')) || [
    { name: "Main Shop", phone: "0771234567" },
    { name: "Town Bakery", phone: "0719876543" }
];

// Map contains [Selling Price, Cost Price per Unit]
let productsMap = JSON.parse(localStorage.getItem('watalappan_products_map')) || {
    "වටලප්පන්": [150, 90], 
    "යෝගට්": [70, 40], 
    "ජෙලි යෝගට්": [90, 50], 
    "කැරමල් පුඩිං": [180, 110]
};

let salesData = JSON.parse(localStorage.getItem('watalappan_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('watalappan_expenses')) || [];
let stockHistory = JSON.parse(localStorage.getItem('watalappan_stock_history')) || [];

// --- DOM ELEMENTS ---
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

const salesDateInput = document.getElementById('sales-date');
const itemTypeSelect = document.getElementById('item-type');
const shopSelect = document.getElementById('shop-select');
const filterShopSelect = document.getElementById('filter-shop-select');
const filterProductSelect = document.getElementById('filter-product-select');
const filterTimeSelect = document.getElementById('filter-time-select');
const pnlProductFilterSelect = document.getElementById('pnl-product-filter-select');

const quantityInput = document.getElementById('quantity');
const returnQuantityInput = document.getElementById('return-quantity');
const totalPriceDisplay = document.getElementById('total-price-display');
const salesForm = document.getElementById('sales-form');
const salesTableBody = document.getElementById('sales-table-body');

// --- APP LIFECYCLE ---
document.addEventListener("DOMContentLoaded", () => {
    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (passwordInput.value === APP_PASSWORD) {
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
    populateDropdowns();
    renderShops();
    renderProductsSettings();
    renderSalesTable();
    renderStockOverview();
    renderExpenseTable();
    renderCreditTable();
    renderMonthlyPnL();
    updateFilteredAnalytics();
    updateLiveTotal();
    
    [filterShopSelect, filterProductSelect, filterTimeSelect].forEach(el => {
        el.addEventListener('change', updateFilteredAnalytics);
    });
}

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-content'));
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-content');
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
};

function populateDropdowns() {
    itemTypeSelect.innerHTML = '';
    const stockItemSelect = document.getElementById('stock-item-select');
    stockItemSelect.innerHTML = '';
    
    const prevFilterProduct = filterProductSelect.value || "ALL";
    const prevPnlFilterProduct = pnlProductFilterSelect.value || "ALL";

    filterProductSelect.innerHTML = '<option value="ALL">== සියලුම භාණ්ඩ ==</option>';
    pnlProductFilterSelect.innerHTML = '<option value="ALL">== සියලුම භාණ්ඩ (මුළු වාර්තාව) ==</option>';
    
    Object.keys(productsMap).forEach(t => {
        itemTypeSelect.add(new Option(t, t));
        stockItemSelect.add(new Option(t, t));
        filterProductSelect.add(new Option(t, t));
        pnlProductFilterSelect.add(new Option(t, t));
    });

    filterProductSelect.value = prevFilterProduct;
    pnlProductFilterSelect.value = prevPnlFilterProduct;
}

// --- DYNAMIC STOCK CALCULATION MECHANICS ---
function calculateCurrentStock() {
    let totalBuilt = {};
    let remainingStock = {};
    
    Object.keys(productsMap).forEach(t => {
        totalBuilt[t] = 0; remainingStock[t] = 0;
    });
    
    stockHistory.forEach(h => {
        if(totalBuilt[h.item] !== undefined) totalBuilt[h.item] += h.qty;
    });

    Object.keys(totalBuilt).forEach(k => { remainingStock[k] = totalBuilt[k]; });

    salesData.forEach(s => {
        if(remainingStock[s.item] !== undefined) remainingStock[s.item] -= s.qty;
    });

    return { totalBuilt, remainingStock };
}

function updateLiveTotal() {
    const item = itemTypeSelect.value;
    if(!item) return;
    const qty = parseInt(quantityInput.value) || 0;
    const retQty = parseInt(returnQuantityInput.value) || 0;
    
    const stock = calculateCurrentStock();
    const avail = stock.remainingStock[item] || 0;
    
    document.getElementById('stock-available-lbl').textContent = `තොගයේ ඇත: ${avail}`;
    const total = Math.max(0, qty - retQty) * getUnitPrice(item);
    totalPriceDisplay.textContent = `රු. ${total.toFixed(2)}`;
}
[quantityInput, returnQuantityInput, itemTypeSelect].forEach(el => el.addEventListener('input', updateLiveTotal));

function getUnitPrice(type) {
    return productsMap[type] ? parseFloat(productsMap[type][0]) : 0;
}
function getUnitCost(type) {
    return productsMap[type] ? parseFloat(productsMap[type][1]) : 0;
}

// --- PRODUCT REGISTRATION WITH PRODUCTION COST ---
document.getElementById('add-product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-prod-name');
    const priceInput = document.getElementById('new-prod-price');
    const costInput = document.getElementById('new-prod-cost');
    
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const cost = parseFloat(costInput.value);
    
    if(name && !isNaN(price) && !isNaN(cost)) {
        productsMap[name] = [price, cost];
        localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
        
        populateDropdowns();
        renderProductsSettings();
        renderStockOverview();
        updateLiveTotal();
        
        nameInput.value = ''; priceInput.value = ''; costInput.value = '';
        alert(`✅ '${name}' සාර්ථකව ඇතුළත් කරගත්තා!`);
    }
});

function renderProductsSettings() {
    const tbody = document.getElementById('products-settings-body');
    tbody.innerHTML = '';
    Object.keys(productsMap).forEach(name => {
        tbody.innerHTML += `
            <tr>
                <td><b>${name}</b></td>
                <td>රු. ${productsMap[name][0]}</td>
                <td style="color:#795548;">රු. ${productsMap[name][1]}</td>
                <td><span class="delete-btn" onclick="deleteProduct('${name}')">❌</span></td>
            </tr>`;
    });
}

window.deleteProduct = function(name) {
    if(confirm(`"${name}" පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?`)) {
        delete productsMap[name];
        localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
        populateDropdowns(); renderProductsSettings(); renderStockOverview(); updateLiveTotal();
    }
};

// --- SHOP REGISTRATION WITH DYNAMIC PHONE NUMBER ---
document.getElementById('add-shop-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let nameVal = document.getElementById('new-shop-name').value.t
