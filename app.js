// --- CONFIGURATION ---
const APP_PASSWORD = "mywatalappan123"; // ඔබට අවශ්‍ය Password එක මෙතනට දාන්න.

// --- STATE MANAGEMENT (Local Storage used to save shops and data) ---
let shops = JSON.parse(localStorage.getItem('watalappan_shops')) || ["Main Shop", "Town Bakery"];
let salesData = JSON.parse(localStorage.getItem('watalappan_sales')) || [];

// --- DOM ELEMENTS ---
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const salesDateInput = document.getElementById('sales-date');
const itemTypeSelect = document.getElementById('item-type');
const shopSelect = document.getElementById('shop-select');
const quantityInput = document.getElementById('quantity');
const totalPriceDisplay = document.getElementById('total-price-display');
const salesForm = document.getElementById('sales-form');
const salesTableBody = document.getElementById('sales-table-body');

const newShopInput = document.getElementById('new-shop-name');
const addShopBtn = document.getElementById('add-shop-btn');
const shopListUI = document.getElementById('shop-list');
const exportBtn = document.getElementById('export-btn');

// --- LOGIN MECHANISM ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (passwordInput.value === APP_PASSWORD) {
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initApp();
    } else {
        loginError.textContent = "❌ වැරදි මුරපදයක්! නැවත උත්සාහ කරන්න.";
        passwordInput.value = "";
    }
});

logoutBtn.addEventListener('click', () => {
    appContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    passwordInput.value = "";
    loginError.textContent = "";
});

// --- APP INITIALIZATION ---
function initApp() {
    // 1. Set Automatic Today's Date
    const today = new Date().toISOString().split('T')[0];
    salesDateInput.value = today;

    // 2. Load Shops & Tables
    renderShops();
    renderSalesTable();
    updateLiveTotal();
}

// --- PRICE CALCULATION LOGIC ---
function getUnitPrice(itemType) {
    switch(itemType) {
        case 'වටලප්පන්': return parseFloat(document.getElementById('price-watalappan').value) || 0;
        case 'යෝගට්': return parseFloat(document.getElementById('price-yogurt').value) || 0;
        case 'ජෙලි යෝගට්': return parseFloat(document.getElementById('price-jelly').value) || 0;
        case 'කැරමල් පුඩිං': return parseFloat(document.getElementById('price-caramel').value) || 0;
        default: return 0;
    }
}

function updateLiveTotal() {
    const item = itemTypeSelect.value;
    const qty = parseInt(quantityInput.value) || 0;
    const unitPrice = getUnitPrice(item);
    const total = qty * unitPrice;
    totalPriceDisplay.textContent = `රු. ${total.toFixed(2)}`;
}

// Listeners for Live Price Update
itemTypeSelect.addEventListener('change', updateLiveTotal);
quantityInput.addEventListener('input', updateLiveTotal);
['price-watalappan', 'price-yogurt', 'price-jelly', 'price-caramel'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateLiveTotal);
});

// --- SHOP MANAGEMENT ---
function renderShops() {
    // Update Dropdown
    shopSelect.innerHTML = '';
    // Update Sidebar List
    shopListUI.innerHTML = '';

    shops.forEach((shop, index) => {
        // Add to Dropdown
        let option = document.createElement('option');
        option.value = shop;
        option.textContent = shop;
        shopSelect.appendChild(option);

        // Add to Sidebar Settings List
        let li = document.createElement('li');
        li.innerHTML = `<span>${shop}</span> <span class="delete-btn" onclick="deleteShop(${index})">❌</span>`;
        shopListUI.appendChild(li);
    });
}

addShopBtn.addEventListener('click', () => {
    const shopName = newShopInput.value.trim();
    if(shopName && !shops.includes(shopName)) {
        shops.push(shopName);
        localStorage.setItem('watalappan_shops', JSON.stringify(shops));
        renderShops();
        newShopInput.value = '';
    }
});

window.deleteShop = function(index) {
    shops.splice(index, 1);
    localStorage.setItem('watalappan_shops', JSON.stringify(shops));
    renderShops();
};

// --- SALES DATA ENTRY ---
salesForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const item = itemTypeSelect.value;
    const qty = parseInt(quantityInput.value);
    const unitPrice = getUnitPrice(item);
    
    const record = {
        id: Date.now(),
        date: salesDateInput.value,
        shop: shopSelect.value,
        item: item,
        qty: qty,
        unitPrice: unitPrice,
        total: qty * unitPrice
    };

    if(!record.shop) {
        alert("කරුණාකර ප්‍රථමයෙන් කඩයක් ඇතුළත් කර තෝරන්න!");
        return;
    }

    salesData.push(record);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    
    renderSalesTable();
    quantityInput.value = 1;
    updateLiveTotal();
});

function renderSalesTable() {
    salesTableBody.innerHTML = '';
    salesData.forEach(row => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.shop}</td>
            <td>${row.item}</td>
            <td>${row.qty}</td>
            <td>${row.unitPrice.toFixed(2)}</td>
            <td>${row.total.toFixed(2)}</td>
            <td><span class="delete-btn" onclick="deleteRecord(${row.id})">🗑️</span></td>
        `;
        salesTableBody.appendChild(tr);
    });
}

window.deleteRecord = function(id) {
    salesData = salesData.filter(item => item.id !== id);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    renderSalesTable();
};

// --- EXCEL (XLSX) EXPORT FUNCTIONALITY ---
exportBtn.addEventListener('click', () => {
    if(salesData.length === 0) {
        alert("බාගත කිරීමට දත්ත කිසිවක් නැත!");
        return;
    }

    // Format Data for Excel
    const excelRows = salesData.map(item => ({
        "දිනය (Date)": item.date,
        "කඩේ නම (Shop Name)": item.shop,
        "වර්ගය (Item)": item.item,
        "ප්‍රමාණය (Quantity)": item.qty,
        "ඒකක මිල (Unit Price)": item.unitPrice,
        "මුළු මුදල (Total Price)": item.total
    }));

    // Generate Sheet using SheetJS
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Records");

    // Download file
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Watalappan_Sales_${todayStr}.xlsx`);
});
