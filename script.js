// --- CONFIGURATION ---
const APP_PASSWORD = "1234"; 
const GOOGLE_SHEETS_WEBAPP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// --- STATE MANAGEMENT ---
let shopDirectory = JSON.parse(localStorage.getItem('watalappan_shop_directory')) || [
    { name: "Main Shop", phone: "0771234567" },
    { name: "Town Bakery", phone: "0719876543" }
];

let productsMap = JSON.parse(localStorage.getItem('watalappan_products_map')) || {
    "වටලප්පන්": [150, 90], 
    "යෝගට්": [70, 40], 
    "ජෙලි යෝගට්": [90, 50], 
    "කැරමල් පුඩිං": [180, 110]
};

let salesData = JSON.parse(localStorage.getItem('watalappan_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('watalappan_expenses')) || [];
let stockHistory = JSON.parse(localStorage.getItem('watalappan_stock_history')) || [];
// ✨ නව එකතු කිරීම: විකිණීමට පෙර හානි වූ දත්ත ගබඩාව
let wastageData = JSON.parse(localStorage.getItem('watalappan_wastage')) || [];

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
    document.getElementById('wastage-date').value = new Date().toISOString().split('T')[0];
    populateDropdowns();
    renderShops();
    renderProductsSettings();
    renderSalesTable();
    renderStockOverview();
    renderExpenseTable();
    renderWastageTable();
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
    const wastageItemSelect = document.getElementById('wastage-item-select');
    wastageItemSelect.innerHTML = '';
    
    const prevFilterProduct = filterProductSelect.value || "ALL";
    const prevPnlFilterProduct = pnlProductFilterSelect.value || "ALL";

    filterProductSelect.innerHTML = '<option value="ALL">== සියලුම භාණ්ඩ ==</option>';
    pnlProductFilterSelect.innerHTML = '<option value="ALL">== සියලුම භාණ්ඩ (මුළු වාර්තාව) ==</option>';
    
    Object.keys(productsMap).forEach(t => {
        itemTypeSelect.add(new Option(t, t));
        stockItemSelect.add(new Option(t, t));
        wastageItemSelect.add(new Option(t, t));
        filterProductSelect.add(new Option(t, t));
        pnlProductFilterSelect.add(new Option(t, t));
    });

    filterProductSelect.value = prevFilterProduct;
    pnlProductFilterSelect.value = prevPnlFilterProduct;
}

// --- ✨ UPGRADED: DYNAMIC STOCK CALCULATION WITH WASTAGE REDUCTION ---
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

    // Deduct standard dispatch deliveries from stock
    salesData.forEach(s => {
        if(remainingStock[s.item] !== undefined) remainingStock[s.item] -= s.qty;
    });

    // ✨ Deduct pre-sale damages/wastage from remaining stock
    wastageData.forEach(w => {
        if(remainingStock[w.item] !== undefined) remainingStock[w.item] -= w.qty;
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

// --- PRODUCT REGISTRATION ---
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
        populateDropdowns(); renderProductsSettings(); renderStockOverview(); updateLiveTotal();
        nameInput.value = ''; priceInput.value = ''; costInput.value = '';
        alert(`✅ '${name}' සාර්ථකව ඇතුළත් කරගත්තා!`);
    }
});

function renderProductsSettings() {
    const tbody = document.getElementById('products-settings-body');
    tbody.innerHTML = '';
    Object.keys(productsMap).forEach(name => {
        tbody.innerHTML += `<tr><td><b>${name}</b></td><td>රු. ${productsMap[name][0]}</td><td>රු. ${productsMap[name][1]}</td><td><span class="delete-btn" onclick="deleteProduct('${name}')">❌</span></td></tr>`;
    });
}

window.deleteProduct = function(name) {
    if(confirm(`"${name}" පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?`)) {
        delete productsMap[name];
        localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
        populateDropdowns(); renderProductsSettings(); renderStockOverview(); updateLiveTotal();
    }
};

// --- SHOP REGISTRATION ---
document.getElementById('add-shop-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let nameVal = document.getElementById('new-shop-name').value.trim();
    let phoneVal = document.getElementById('new-shop-phone').value.trim();
    if(nameVal && phoneVal) {
        if(shopDirectory.some(s => s.name.toLowerCase() === nameVal.toLowerCase())) return alert("⚠️ මෙම කඩය ලියාපදිංචි කර ඇත!");
        shopDirectory.push({ name: nameVal, phone: phoneVal });
        localStorage.setItem('watalappan_shop_directory', JSON.stringify(shopDirectory));
        renderShops(); updateFilteredAnalytics(); renderCreditTable();
        document.getElementById('new-shop-name').value = ''; document.getElementById('new-shop-phone').value = '';
    }
});

function renderShops() {
    shopSelect.innerHTML = ''; filterShopSelect.innerHTML = '<option value="ALL">== සියලුම කඩවල් ==</option>';
    document.getElementById('shop-list').innerHTML = '';
    shopDirectory.forEach((shop, idx) => {
        shopSelect.add(new Option(shop.name, shop.name));
        filterShopSelect.add(new Option(shop.name, shop.name));
        document.getElementById('shop-list').innerHTML += `<li><div><b>${shop.name}</b> <small style="color:#777;">(${shop.phone})</small></div> <span class="delete-btn" onclick="deleteShop(${idx})">❌</span></li>`;
    });
}
window.deleteShop = function(idx) {
    if(confirm("මකාදැමීමට අවශ්‍යද?")) {
        shopDirectory.splice(idx, 1); localStorage.setItem('watalappan_shop_directory', JSON.stringify(shopDirectory));
        renderShops(); updateFilteredAnalytics(); renderCreditTable();
    }
};

// --- DATA ENTRY SALES LOGIC ---
salesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = itemTypeSelect.value;
    if(!item) return alert("කරුණාකර නිෂ්පාදනයක් තෝරන්න!");
    const qty = parseInt(quantityInput.value) || 0;
    const retQty = parseInt(returnQuantityInput.value) || 0;
    const price = getUnitPrice(item);
    const cost = getUnitCost(item);
    const payMode = document.querySelector('input[name="payment-method"]:checked').value;
    const shareMode = document.querySelector('input[name="share-mode"]:checked').value;

    const stock = calculateCurrentStock();
    if(qty > (stock.remainingStock[item] || 0)) return alert("⚠️ සමාවන්න! ප්‍රමාණවත් තොගයක් නොමැත.");

    const rec = {
        id: Date.now(), date: salesDateInput.value, shop: shopSelect.value, item: item,
        qty: qty, retQty: retQty, netQty: Math.max(0, qty - retQty), unitPrice: price, unitCost: cost,
        payMode: payMode, returnLoss: retQty * price, total: Math.max(0, qty - retQty) * price,
        productionCost: Math.max(0, qty - retQty) * cost
    };

    salesData.push(rec);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    renderSalesTable(); renderStockOverview(); renderCreditTable(); renderMonthlyPnL(); updateFilteredAnalytics();
    showInvoicePreview(rec, shareMode);
    quantityInput.value = 0; returnQuantityInput.value = 0; updateLiveTotal();
});

function showInvoicePreview(rec, shareMode) {
    document.getElementById('invoice-card').classList.remove('hidden');
    document.getElementById('inv-date-shop').textContent = `දිනය: ${rec.date} | කඩය: ${rec.shop}`;
    document.getElementById('inv-table-body').innerHTML = `<tr><td>${rec.item}</td><td>${rec.qty}</td><td>${rec.retQty}</td><td>රු.${rec.total}</td></tr>`;
    document.getElementById('inv-total').textContent = `මුළු මුදල: රු. ${rec.total.toFixed(2)}`;
    document.getElementById('inv-paymode').textContent = `ගනුදෙනු ක්‍රමය: ${rec.payMode === 'Credit' ? 'ණය' : 'මුදල්'}`;

    const shopObj = shopDirectory.find(s => s.name === rec.shop);
    let rawPhone = shopObj ? shopObj.phone : "";
    let formattedPhone = rawPhone.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) formattedPhone = "94" + formattedPhone.substring(1);

    const txt = `*🍮 WATALAPPAN INVOICE*\n-------------------------\n*කඩය:* ${rec.shop}\n*දිනය:* ${rec.date}\n*වර්ගය:* ${rec.item}\n*बෙදාහැරීම:* ${rec.qty}\n*රිටන්:* ${rec.retQty}\n*විකුණුම්:* ${rec.netQty}\n-------------------------\n*මුළු මුදල: රු.${rec.total}*\n*ක්‍רමය:* ${rec.payMode === 'Credit' ? 'ණයට' : 'මුදල් ලැබුණා'}\n\nස්තූතියි!`;
    const shareBtn = document.getElementById('invoice-share-btn');
    
    if (shareMode === "WhatsApp") {
        shareBtn.textContent = "💬 WhatsApp මඟින් මුදලාලිට යවන්න"; shareBtn.style.backgroundColor = "#25D366";
        shareBtn.onclick = () => window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(txt)}`, '_blank');
    } else {
        shareBtn.textContent = "📱 සාමාන්‍ය SMS එකක් ලෙස යවන්න"; shareBtn.style.backgroundColor = "#0288d1";
        shareBtn.onclick = () => window.open(`sms:${rawPhone}?body=${encodeURIComponent(txt)}`, '_blank');
    }
}

function renderSalesTable() {
    salesTableBody.innerHTML = '';
    salesData.forEach(row => {
        salesTableBody.innerHTML += `<tr><td>${row.date}</td><td>${row.shop}</td><td>${row.item}</td><td>${row.qty}</td><td style="color:red;">${row.retQty}</td><td>${row.netQty}</td><td>${row.payMode === 'Credit' ? 'ණය':'මුදල්'}</td><td><b>${row.total}</b></td><td><span class="delete-btn" onclick="deleteRecord(${row.id})">🗑️</span></td></tr>`;
    });
}
window.deleteRecord = function(id) {
    if(confirm("මකා දැමීමට අවශ්‍යද?")) {
        salesData = salesData.filter(i => i.id !== id); localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
        renderSalesTable(); renderStockOverview(); renderCreditTable(); renderMonthlyPnL(); updateFilteredAnalytics();
    }
};

// --- PARTIAL DEBT PAYMENTS SYSTEM ---
function renderCreditTable() {
    const creditBody = document.getElementById('credit-table-body'); creditBody.innerHTML = '';
    let creditTracking = {};
    salesData.forEach(item => {
        if(item.payMode === 'Credit' && item.total > 0) {
            let key = `${item.shop}__${item.item}`;
            if(!creditTracking[key]) creditTracking[key] = { shop: item.shop, item: item.item, debt: 0 };
            creditTracking[key].debt += item.total;
        }
    });
    Object.keys(creditTracking).forEach(key => {
        let entry = creditTracking[key];
        creditBody.innerHTML += `<tr><td><b>${entry.shop}</b></td><td><span style="background:#efebe9; padding:3px 6px; border-radius:4px; font-weight:600; color:#5d4037;">🍮 ${entry.item}</span></td><td style="color:red; font-weight:bold;">රු. ${entry.debt.toFixed(2)}</td><td><input type="number" id="pay-amt-${key}" placeholder="ගෙවන ගණන" style="width:100px; padding:5px;"></td><td><button class="btn btn-secondary" style="padding:5px 10px; font-size:0.75rem; background-color:#2e7d32;" onclick="settlePartialCredit('${entry.shop}', '${entry.item}', '${key}')">ගෙවීම් ඇතුළත් කරන්න</button></td></tr>`;
    });
}
window.settlePartialCredit = function(shopName, itemName, key) {
    const inputAmount = parseFloat(document.getElementById(`pay-amt-${key}`).value);
    if(isNaN(inputAmount) || inputAmount <= 0) return alert("වලංගු ගෙවීම් මුදලක් ඇතුළත් කරන්න!");
    let remainingToSettle = inputAmount;
    for (let i = 0; i < salesData.length; i++) {
        let item = salesData[i];
        if (item.shop === shopName && item.item === itemName && item.payMode === 'Credit') {
            if (remainingToSettle >= item.total) { remainingToSettle -= item.total; item.payMode = 'Cash'; } 
            else { item.total -= remainingToSettle; remainingToSettle = 0; break; }
        }
    }
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    alert(`✅ රු. ${inputAmount} ක ණය පියවීමක් සටහන් කළා!`);
    renderSalesTable(); renderCreditTable(); renderMonthlyPnL(); updateFilteredAnalytics();
};

// --- STOCK PRODUCTION INTAKES ---
document.getElementById('stock-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const item = document.getElementById('stock-item-select').value;
    const qty = parseInt(document.getElementById('stock-qty-input').value);
    stockHistory.push({ id: Date.now(), timestamp: new Date().toLocaleString('si-LK'), item: item, qty: qty });
    localStorage.setItem('watalappan_stock_history', JSON.stringify(stockHistory));
    renderStockOverview(); updateLiveTotal(); updateFilteredAnalytics();
    document.getElementById('stock-qty-input').value = '';
});

function renderStockOverview() {
    const stock = calculateCurrentStock();
    const sBody = document.getElementById('stock-table-body'); sBody.innerHTML = '';
    Object.keys(productsMap).forEach(t => {
        sBody.innerHTML += `<tr><td><b>${t}</b></td><td style="font-weight:bold; color:green;">${stock.totalBuilt[t] || 0}</td><td style="font-weight:bold; color:blue;">${stock.remainingStock[t] || 0}</td></tr>`;
    });
}

// --- ✨ NEW FEATURE: WASTAGE DATA ENTRY INTERFACES ---
document.getElementById('wastage-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dt = document.getElementById('wastage-date').value;
    const item = document.getElementById('wastage-item-select').value;
    const qty = parseInt(document.getElementById('wastage-qty-input').value);
    const costPrice = getUnitCost(item);

    const stock = calculateCurrentStock();
    if(qty > (stock.remainingStock[item] || 0)) return alert("⚠️ සමාවන්න! තොගයේ ඇති ප්‍රමාණයට වඩා හානි වූ ප්‍රමාණය වැඩි විය නොහැක.");

    wastageData.push({
        id: Date.now(), date: dt, item: item, qty: qty,
        lossAmount: qty * costPrice // Financial damage loss evaluated on manufacturing cost
    });

    localStorage.setItem('watalappan_wastage', JSON.stringify(wastageData));
    renderWastageTable(); renderStockOverview(); renderMonthlyPnL(); updateFilteredAnalytics(); updateLiveTotal();
    document.getElementById('wastage-qty-input').value = '';
    alert("🗑️ හානි වූ තොග සටහන සාර්ථකව ඇතුළත් කළා!");
});

function renderWastageTable() {
    const tbody = document.getElementById('wastage-table-body');
    tbody.innerHTML = '';
    wastageData.slice().reverse().forEach(w => {
        tbody.innerHTML += `
            <tr>
                <td>${w.date}</td>
                <td><b>${w.item}</b></td>
                <td style="color:#e65100; font-weight:bold;">${w.qty}</td>
                <td>රු. ${w.lossAmount.toFixed(2)}</td>
                <td><span class="delete-btn" onclick="deleteWastage(${w.id})">🗑️</span></td>
            </tr>`;
    });
}

window.deleteWastage = function(id) {
    if(confirm("මෙම නරක් වූ තොග සටහන මකාදැමීමට අවශ්‍යද?")) {
        wastageData = wastageData.filter(i => i.id !== id);
        localStorage.setItem('watalappan_wastage', JSON.stringify(wastageData));
        renderWastageTable(); renderStockOverview(); renderMonthlyPnL(); updateFilteredAnalytics(); updateLiveTotal();
    }
};

// --- EXPENSES LOG ---
document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = document.getElementById('expense-category').value;
    const desc = document.getElementById('expense-desc').value;
    const amt = parseFloat(document.getElementById('expense-amount').value);
    expenses.push({ id: Date.now(), date: new Date().toISOString().split('T')[0], category: cat, desc: desc, amount: amt });
    localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
    renderExpenseTable(); renderMonthlyPnL(); updateFilteredAnalytics();
    document.getElementById('expense-desc').value = ''; document.getElementById('expense-amount').value = '';
});

function renderExpenseTable() {
    const eBody = document.getElementById('expense-table-body'); eBody.innerHTML = '';
    expenses.forEach(ex => {
        let catBadge = ex.category === 'Fuel' ? '⛽ ප්‍රවාහන' : (ex.category === 'Repair' ? '🛠️ නඩත්තු' : '📦 සාමාන්‍ය');
        eBody.innerHTML += `<tr><td><small>${catBadge}</small></td><td>${ex.desc}</td><td>රු. ${ex.amount}</td><td><span class="delete-btn" onclick="deleteExpense(${ex.id})">🗑️</span></td></tr>`;
    });
}
window.deleteExpense = function(id) {
    expenses = expenses.filter(i => i.id !== id); localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
    renderExpenseTable(); renderMonthlyPnL(); updateFilteredAnalytics();
};

// --- ✨ UPGRADED: MONTHLY P&L MATRIX ENGINE WITH WASTAGE DEPRECIATION ---
function renderMonthlyPnL() {
    const pnlBody = document.getElementById('pnl-table-body'); pnlBody.innerHTML = '';
    const selectedPnlProduct = pnlProductFilterSelect.value || "ALL";
    let monthlyData = {};

    salesData.forEach(s => {
        if(selectedPnlProduct !== "ALL" && s.item !== selectedPnlProduct) return;
        let m = s.date.substring(0, 7);
        if(!monthlyData[m]) monthlyData[m] = { income: 0, loss: 0, cost: 0, fuel: 0, wastageLoss: 0 };
        monthlyData[m].income += s.total;
        monthlyData[m].loss += s.returnLoss;
        monthlyData[m].cost += (s.productionCost || 0);
    });

    // ✨ Include pre-sale wastage item losses into accounting cycles
    wastageData.forEach(w => {
        if(selectedPnlProduct !== "ALL" && w.item !== selectedPnlProduct) return;
        let m = w.date.substring(0, 7);
        if(!monthlyData[m]) monthlyData[m] = { income: 0, loss: 0, cost: 0, fuel: 0, wastageLoss: 0 };
        monthlyData[m].wastageLoss += w.lossAmount;
    });

    expenses.forEach(e => {
        if(selectedPnlProduct !== "ALL") return; 
        let m = e.date.substring(0, 7);
        if(!monthlyData[m]) monthlyData[m] = { income: 0, loss: 0, cost: 0, fuel: 0, wastageLoss: 0 };
        if (e.category === "Fuel" || e.category === "Repair") monthlyData[m].fuel += e.amount; 
        else monthlyData[m].cost += e.amount; 
    });

    Object.keys(monthlyData).sort().reverse().forEach(m => {
        let row = monthlyData[m];
        // Total Net Profit Formula accounting for wastage damage costs
        let net = row.income - row.cost - row.fuel - row.wastageLoss;
        pnlBody.innerHTML += `
            <tr>
                <td><b>${m}</b></td>
                <td style="color:green;">රු. ${row.income.toFixed(2)}</td>
                <td style="color:orange;">රු. ${row.loss.toFixed(2)}</td>
                <td style="color:#e65100; font-weight:bold;">රු. ${row.wastageLoss.toFixed(2)}</td>
                <td style="color:#795548;">රු. ${row.cost.toFixed(2)}</td>
                <td style="color:#e65100;">රු. ${row.fuel.toFixed(2)}</td>
                <td style="font-weight:bold; background:${net>=0?'#e8f5e9':'#ffebee'}; color:${net>=0?'#2e7d32':'#c62828'}">රු. ${net.toFixed(2)}</td>
            </tr>`;
    });
}

// --- MULTI-MATRIX ADVANCED FILTER ENGINE WITH OVERHEAD BREAKDOWNS ---
function updateFilteredAnalytics() {
    const targetShop = filterShopSelect.value;
    const targetProduct = filterProductSelect.value;
    const timePeriod = filterTimeSelect.value;
    const todayStr = new Date().toISOString().split('T')[0];

    let soldQty = 0, totalIncome = 0, returnQty = 0, returnLoss = 0, totalOverhead = 0, filteredOutstanding = 0;
    let shopPerformance = {}; let productPerformance = {};

    salesData.forEach(item => {
        if(!shopPerformance[item.shop]) shopPerformance[item.shop] = 0;
        shopPerformance[item.shop] += item.total;
        if(!productPerformance[item.item]) productPerformance[item.item] = 0;
        productPerformance[item.item] += item.netQty;

        if (targetShop !== "ALL" && item.shop !== targetShop) return;
        if (targetProduct !== "ALL" && item.item !== targetProduct) return;
        if (timePeriod === "daily" && item.date !== todayStr) return;

        soldQty += item.netQty; totalIncome += item.total; returnQty += item.retQty; returnLoss += item.returnLoss;
        totalOverhead += (item.productionCost || 0);
        if (item.payMode === 'Credit') filteredOutstanding += item.total;
    });

    // ✨ Include financial burden from pre-sale wastage log based on timing frames
    wastageData.forEach(w => {
        if (targetProduct !== "ALL" && w.item !== targetProduct) return;
        if (timePeriod === "daily" && w.date !== todayStr) return;
        totalOverhead += w.lossAmount;
    });

    expenses.forEach(ex => {
        if (targetProduct !== "ALL") return; 
        if (timePeriod === "daily" && ex.date !== todayStr) return;
        totalOverhead += ex.amount;
    });

    const netProfit = totalIncome - totalOverhead;
    document.getElementById('f-sold-qty').textContent = soldQty;
    document.getElementById('f-total-income').textContent = `රු. ${totalIncome.toFixed(2)}`;
    document.getElementById('f-return-qty').textContent = `${returnQty}`;
    document.getElementById('f-return-loss').textContent = `අලාභය: රු. ${returnLoss.toFixed(0)}`;
    document.getElementById('f-total-outstanding').textContent = `රු. ${filteredOutstanding.toFixed(2)}`;
    document.getElementById('f-net-profit').textContent = `රු. ${netProfit.toFixed(2)}`;
    
    document.getElementById('f-net-profit').parentElement.style.background = netProfit >= 0 ? 'linear-gradient(135deg, #2e7d32, #1b5e20)' : 'linear-gradient(135deg, #d32f2f, #c62828)';

    let topShop = Object.keys(shopPerformance).reduce((a, b) => shopPerformance[a] > shopPerformance[b] ? a : b, "--");
    let topProd = Object.keys(productPerformance).reduce((a, b) => productPerformance[a] > productPerformance[b] ? a : b, "--");
    document.getElementById('insight-top-shop').textContent = topShop !== "--" ? `${topShop} (රු.${shopPerformance[topShop].toFixed(0)})` : "--";
    document.getElementById('insight-top-product').textContent = topProd !== "--" ? `${topProd} (${productPerformance[topProd]} Qty)` : "--";

    triggerSmartAlerts();
}

function triggerSmartAlerts() {
    const alertsContainer = document.getElementById('smart-alerts-container');
    alertsContainer.innerHTML = '';
    const stock = calculateCurrentStock();
    Object.keys(productsMap).forEach(k => {
        let currentLevel = stock.remainingStock[k] || 0;
        if(currentLevel <= 10) alertsContainer.innerHTML += `<div class="alert-banner">⚠️ <b>තොග අවවාදයයි:</b> '${k}' තොගය අවම මට්ටමක පවතී! (ඉතිරි: ${currentLevel})</div>`;
    });
}

// --- CLOUD SERVER DATA SYNC ---
document.getElementById('cloud-backup-btn').addEventListener('click', async () => {
    const status = document.getElementById('cloud-status');
    if(GOOGLE_SHEETS_WEBAPP_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") return alert("Webapp URL එක සකසන්න!");
    status.style.color = "blue"; status.textContent = "⏳ Cloud එකට සම්බන්ධ වෙමින්...";
    const payload = { sales: salesData, expenses: expenses, stockLog: stockHistory, wastage: wastageData };
    try {
        await fetch(GOOGLE_SHEETS_WEBAPP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        status.style.color = "green"; status.textContent = "✅ Cloud Backup එක සාර්ථකයි!";
    } catch (error) {
        status.style.color = "red"; status.textContent = "❌ Backup එක අසාර්ථක විය.";
    }
});

// --- EXCEL DOWNLOAD MASTER ---
document.getElementById('export-btn').addEventListener('click', () => {
    if(salesData.length === 0) return alert("දත්ත නැත!");
    const ws = XLSX.utils.json_to_sheet(salesData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `Watalappan_ERP_Report.xlsx`);
});
