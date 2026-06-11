// --- CONFIGURATION ---
const APP_PASSWORD = "1234"; 

// --- STATE MANAGEMENT ---
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
const filterShopSelect = document.getElementById('filter-shop-select');
const filterTimeSelect = document.getElementById('filter-time-select');

const quantityInput = document.getElementById('quantity');
const returnQuantityInput = document.getElementById('return-quantity');
const totalPriceDisplay = document.getElementById('total-price-display');
const salesForm = document.getElementById('sales-form');
const salesTableBody = document.getElementById('sales-table-body');

const newShopInput = document.getElementById('new-shop-name');
const addShopBtn = document.getElementById('add-shop-btn');
const shopListUI = document.getElementById('shop-list');
const exportBtn = document.getElementById('export-btn');

// --- LOGIN MECHANICS (මුලින්ම හැමවිටම Login පෙන්වයි) ---
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

function initApp() {
    const today = new Date().toISOString().split('T')[0];
    salesDateInput.value = today;

    renderShops();
    renderSalesTable();
    updateFilteredAnalytics();
    updateLiveTotal();
}

// --- TAB SWITCHER FUNCTION ---
window.switchTab = function(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active-content');
    });
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-nav button, .tabs-nav .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show current tab content & active button
    document.getElementById(tabId).classList.add('active-content');
    
    // Find the clicked button and highlight it
    const eventTarget = event.currentTarget;
    if(eventTarget) {
        eventTarget.classList.add('active');
    }
};

// --- PRICE MECHANICS ---
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
    const retQty = parseInt(returnQuantityInput.value) || 0;
    const unitPrice = getUnitPrice(item);
    
    const netQty = Math.max(0, qty - retQty); 
    const total = netQty * unitPrice;
    
    totalPriceDisplay.textContent = `රු. ${total.toFixed(2)}`;
}

[quantityInput, returnQuantityInput, itemTypeSelect].forEach(el => el.addEventListener('input', updateLiveTotal));
['price-watalappan', 'price-yogurt', 'price-jelly', 'price-caramel'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateLiveTotal);
});

// --- SHOP MANAGEMENT ---
function renderShops() {
    shopSelect.innerHTML = '';
    filterShopSelect.innerHTML = ''; 
    shopListUI.innerHTML = '';

    let allOption = document.createElement('option');
    allOption.value = "ALL";
    allOption.textContent = "== සියලුම කඩවල් (All) ==";
    filterShopSelect.appendChild(allOption);

    shops.forEach((shop, index) => {
        let option = document.createElement('option');
        option.value = shop; option.textContent = shop;
        shopSelect.appendChild(option);

        let filterOption = option.cloneNode(true);
        filterShopSelect.appendChild(filterOption);

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
        updateFilteredAnalytics();
        newShopInput.value = '';
    }
});

window.deleteShop = function(index) {
    shops.splice(index, 1);
    localStorage.setItem('watalappan_shops', JSON.stringify(shops));
    renderShops();
    updateFilteredAnalytics();
};

// --- DATA SAVE ---
salesForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const item = itemTypeSelect.value;
    const qty = parseInt(quantityInput.value);
    const retQty = parseInt(returnQuantityInput.value) || 0;
    const unitPrice = getUnitPrice(item);
    const netQty = Math.max(0, qty - retQty);
    const payMode = document.querySelector('input[name="payment-method"]:checked').value;

    const record = {
        id: Date.now(),
        date: salesDateInput.value,
        shop: shopSelect.value,
        item: item,
        qty: qty,
        retQty: retQty,
        netQty: netQty,
        unitPrice: unitPrice,
        payMode: payMode, 
        returnLoss: retQty * unitPrice, 
        total: netQty * unitPrice
    };

    if(!record.shop) {
        alert("කරුණාකර කඩයක් තෝරන්න!");
        return;
    }

    salesData.push(record);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    
    renderSalesTable();
    updateFilteredAnalytics();
    
    quantityInput.value = 1;
    returnQuantityInput.value = 0;
    updateLiveTotal();
    
    alert("✅ දත්ත සාර්ථකව ඇතුළත් කළා! 'සටහන්' Tab එකෙන් බලාගන්න.");
});

function renderSalesTable() {
    salesTableBody.innerHTML = '';
    salesData.forEach(row => {
        let tr = document.createElement('tr');
        const modeBadge = row.payMode === 'Credit' ? `<span style="color:orange; font-weight:bold;">ණය</span>` : `මුදල්`;
        
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.shop}</td>
            <td>${row.item}</td>
            <td>${row.qty}</td>
            <td style="color:red; font-weight:bold;">${row.retQty}</td>
            <td>${row.netQty}</td>
            <td>${modeBadge}</td>
            <td>${row.unitPrice.toFixed(0)}</td>
            <td><b>${row.total.toFixed(0)}</b></td>
            <td><span class="delete-btn" onclick="deleteRecord(${row.id})">🗑️</span></td>
        `;
        salesTableBody.appendChild(tr);
    });
}

window.deleteRecord = function(id) {
    if(confirm("මෙම දත්තය මකා දැමීමට අවශ්‍යද?")) {
        salesData = salesData.filter(item => item.id !== id);
        localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
        renderSalesTable();
        updateFilteredAnalytics();
    }
};

// --- ANALYTICS FILTER ---
function updateFilteredAnalytics() {
    const targetShop = filterShopSelect.value;
    const timePeriod = filterTimeSelect.value;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let soldQty = 0;
    let totalIncome = 0;
    let returnQty = 0;
    let returnLoss = 0;

    salesData.forEach(item => {
        const itemDate = new Date(item.date);
        const itemDateStr = item.date;

        if (targetShop !== "ALL" && item.shop !== targetShop) return;

        let timeMatch = false;
        if (timePeriod === "daily" && itemDateStr === todayStr) timeMatch = true;
        else if (timePeriod === "weekly" && itemDate >= oneWeekAgo && itemDate <= now) timeMatch = true;
        else if (timePeriod === "monthly" && itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) timeMatch = true;
        else if (timePeriod === "yearly" && itemDate.getFullYear() === currentYear) timeMatch = true;

        if (!timeMatch) return;

        soldQty += item.netQty; 
        totalIncome += item.total; 
        returnQty += item.retQty; 
        returnLoss += item.returnLoss; 
    });

    document.getElementById('f-sold-qty').textContent = soldQty;
    document.getElementById('f-total-income').textContent = `රු. ${totalIncome.toFixed(2)}`;
    document.getElementById('f-return-qty').textContent = returnQty;
    document.getElementById('f-return-loss').textContent = `රු. ${returnLoss.toFixed(2)}`;
}

filterShopSelect.addEventListener('change', updateFilteredAnalytics);
filterTimeSelect.addEventListener('change', updateFilteredAnalytics);

// --- EXCEL EXPORT ---
exportBtn.addEventListener('click', () => {
    if(salesData.length === 0) {
        alert("බාගත කිරීමට දත්ත නැත!");
        return;
    }
    const excelRows = salesData.map(item => ({
        "දිනය": item.date, "කඩේ නම": item.shop, "වර්ගය": item.item, "Qty": item.qty, "Return": item.retQty, "විකුණුම්": item.netQty, "වර්ගය": item.payMode, "මිල": item.unitPrice, "අලාභය": item.returnLoss, "මුළු මුදල": item.total
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Advanced Sales Log");
    XLSX.writeFile(workbook, `Watalappan_Business_Report.xlsx`);
});
