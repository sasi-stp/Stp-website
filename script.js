// --- CONFIGURATION ---
const APP_PASSWORD = "1234"; 
const GOOGLE_SHEETS_WEBAPP_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

// --- DYNAMIC STATE MANAGEMENT ---
let shops = JSON.parse(localStorage.getItem('watalappan_shops')) || ["Main Shop", "Town Bakery"];

let productsMap = JSON.parse(localStorage.getItem('watalappan_products_map')) || {
    "වටලප්පන්": 150, "යෝගට්": 70, "ජෙලි යෝගට්": 90, "කැරමල් පුඩිං": 180
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
const filterTimeSelect = document.getElementById('filter-time-select');

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
}

// --- TABS CONTROLLER ---
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
    
    Object.keys(productsMap).forEach(t => {
        itemTypeSelect.add(new Option(t, t));
        stockItemSelect.add(new Option(t, t));
    });
}

// --- DYNAMIC STOCK CALCULATION MECHANICS ---
function calculateCurrentStock() {
    let totalBuilt = {};
    let remainingStock = {};
    
    Object.keys(productsMap).forEach(t => {
        totalBuilt[t] = 0;
        remainingStock[t] = 0;
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
    return parseFloat(productsMap[type]) || 0;
}

// --- FIX: FIXED DYNAMIC PRODUCT REFRESH BUG WITH EXPLICIT CLICK LISTENER ---
document.getElementById('submit-product-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-prod-name');
    const priceInput = document.getElementById('new-prod-price');
    
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    
    if(!name || isNaN(price)) {
        alert("⚠️ කරුණාකර වලංගු නමක් සහ මිලක් ඇතුළත් කරන්න!");
        return;
    }
    
    productsMap[name] = price;
    localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
    
    populateDropdowns();
    renderProductsSettings();
    renderStockOverview();
    updateLiveTotal();
    
    nameInput.value = '';
    priceInput.value = '';
});

function renderProductsSettings() {
    const tbody = document.getElementById('products-settings-body');
    tbody.innerHTML = '';
    Object.keys(productsMap).forEach(name => {
        tbody.innerHTML += `
            <tr>
                <td><b>${name}</b></td>
                <td>රු. ${productsMap[name]}</td>
                <td><span class="delete-btn" onclick="deleteProduct('${name}')">❌</span></td>
            </tr>`;
    });
}

window.deleteProduct = function(name) {
    if(confirm(`"${name}" නිෂ්පාදනය පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?`)) {
        delete productsMap[name];
        localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
        populateDropdowns();
        renderProductsSettings();
        renderStockOverview();
        updateLiveTotal();
    }
};

// --- SHOP INTERFACES ---
function renderShops() {
    shopSelect.innerHTML = ''; filterShopSelect.innerHTML = '<option value="ALL">== සියලුම කඩවල් ==</option>';
    document.getElementById('shop-list').innerHTML = '';
    shops.forEach((s, idx) => {
        shopSelect.add(new Option(s, s));
        filterShopSelect.add(new Option(s, s));
        document.getElementById('shop-list').innerHTML += `<li>${s} <span class="delete-btn" onclick="deleteShop(${idx})">❌</span></li>`;
    });
}
document.getElementById('add-shop-btn').addEventListener('click', () => {
    let val = document.getElementById('new-shop-name').value.trim();
    if(val && !shops.includes(val)) {
        shops.push(val); localStorage.setItem('watalappan_shops', JSON.stringify(shops));
        renderShops(); updateFilteredAnalytics(); renderCreditTable();
        document.getElementById('new-shop-name').value = '';
    }
});
window.deleteShop = function(idx) {
    shops.splice(idx, 1); localStorage.setItem('watalappan_shops', JSON.stringify(shops));
    renderShops(); updateFilteredAnalytics(); renderCreditTable();
};

// --- DISTRIBUTION ENTRY SALES & INVOICE MANAGEMENT ---
salesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = itemTypeSelect.value;
    if(!item) return alert("කරුණාකර නිෂ්පාදනයක් තෝරන්න!");
    const qty = parseInt(quantityInput.value) || 0;
    const retQty = parseInt(returnQuantityInput.value) || 0;
    const price = getUnitPrice(item);
    const payMode = document.querySelector('input[name="payment-method"]:checked').value;

    const stock = calculateCurrentStock();
    if(qty > (stock.remainingStock[item] || 0)) {
        alert("⚠️ සමාවන්න! ප්‍රමාණවත් තොගයක් නොමැත.");
        return;
    }

    const rec = {
        id: Date.now(), date: salesDateInput.value, shop: shopSelect.value, item: item,
        qty: qty, retQty: retQty, netQty: Math.max(0, qty - retQty), unitPrice: price,
        payMode: payMode, returnLoss: retQty * price, total: Math.max(0, qty - retQty) * price
    };

    salesData.push(rec);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));

    renderSalesTable(); renderStockOverview(); renderCreditTable(); renderMonthlyPnL(); updateFilteredAnalytics();
    showInvoicePreview(rec);

    quantityInput.value = 0; returnQuantityInput.value = 0; updateLiveTotal();
});

function showInvoicePreview(rec) {
    document.getElementById('invoice-card').classList.remove('hidden');
    document.getElementById('inv-date-shop').textContent = `දිනය: ${rec.date} | කඩය: ${rec.shop}`;
    document.getElementById('inv-table-body').innerHTML = `
        <tr><td>${rec.item}</td><td>${rec.qty}</td><td>${rec.retQty}</td><td>රු.${rec.total}</td></tr>
    `;
    document.getElementById('inv-total').textContent = `මුළු මුදල: ਰੁ. ${rec.total.toFixed(2)}`;
    document.getElementById('inv-paymode').textContent = `ගනුදෙනු ක්‍රමය: ${rec.payMode === 'Credit' ? 'ණය (Credit Book)' : 'මුදල් (Cash)'}`;

    document.getElementById('whatsapp-share-btn').onclick = () => {
        const txt = `*🍮 WATALAPPAN INVOICE*\n-------------------------\n*කඩය:* ${rec.shop}\n*දිනය:* ${rec.date}\n*වර්ගය:* ${rec.item}\n*බෙදාහැරීම:* ${rec.qty}\n*රිටන්:* ${rec.retQty}\n*විකුණුම්:* ${rec.netQty}\n-------------------------\n*මුළු ශුද්ධ මුදල: රු.${rec.total}*\n*ක්‍රමය:* ${rec.payMode === 'Credit' ? 'ණයට' : 'මුදල් ලැබුණා'}\n\nස්תූතියි!`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`, '_blank');
    };
}

function renderSalesTable() {
    salesTableBody.innerHTML = '';
    salesData.forEach(row => {
        salesTableBody.innerHTML += `
            <tr>
                <td>${row.date}</td><td>${row.shop}</td><td>${row.item}</td><td>${row.qty}</td>
                <td style="color:red;">${row.retQty}</td><td>${row.netQty}</td>
                <td>${row.payMode === 'Credit' ? '<b style="color:orange;">ණය</b>':'මුදල්'}</td>
                <td><b>${row.total}</b></td>
                <td><span class="delete-btn" onclick="deleteRecord(${row.id})">🗑️</span></td>
            </tr>`;
    });
}

window.deleteRecord = function(id) {
    if(confirm("මකා දැමීමට අවශ්‍යද?")) {
        salesData = salesData.filter(i => i.id !== id); localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
        renderSalesTable(); renderStockOverview(); renderCreditTable(); renderMonthlyPnL(); updateFilteredAnalytics();
    }
};

// --- CREDIT OUTSTATIONS ---
function calculateShopCredit(shopName) {
    let totalDebt = 0;
    salesData.forEach(item => {
        if(item.shop === shopName && item.payMode === 'Credit') totalDebt += item.total;
    });
    return totalDebt;
}

function renderCreditTable() {
    const creditBody = document.getElementById('credit-table-body'); creditBody.innerHTML = '';
    shops.forEach(shop => {
        let debt = calculateShopCredit(shop);
        if(debt > 0) {
            creditBody.innerHTML += `
                <tr>
                    <td><b>${shop}</b></td>
                    <td style="color:red; font-weight:bold;">රු. ${debt.toFixed(2)}</td>
                    <td><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; background-color:#2e7d32;" onclick="settleCredit('${shop}')">Mark as Paid</button></td>
                </tr>`;
        }
    });
}

window.settleCredit = function(shopName) {
    if(confirm(`${shopName} කඩෙන් සියලුම ණය මුදල් ලැබුණාද?`)) {
        salesData.forEach(item => { if(item.shop === shopName && item.payMode === 'Credit') item.payMode = 'Cash'; });
        localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
        renderSalesTable(); renderCreditTable(); renderMonthlyPnL(); updateFilteredAnalytics();
    }
};

// --- STOCK PRODUCTION INTAKES ---
document.getElementById('stock-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const item = document.getElementById('stock-item-select').value;
    const qty = parseInt(document.getElementById('stock-qty-input').value);
    
    const timeStamp = new Date().toLocaleString('si-LK');
    stockHistory.push({ id: Date.now(), timestamp: timeStamp, item: item, qty: qty });
    localStorage.setItem('watalappan_stock_history', JSON.stringify(stockHistory));
    
    renderStockOverview(); updateLiveTotal(); updateFilteredAnalytics();
    document.getElementById('stock-qty-input').value = '';
});

function renderStockOverview() {
    const stock = calculateCurrentStock();
    const sBody = document.getElementById('stock-table-body'); sBody.innerHTML = '';
    
    Object.keys(productsMap).forEach(t => {
        sBody.innerHTML += `
            <tr>
                <td><b>${t}</b></td>
                <td style="font-weight:bold; color:green;">${stock.totalBuilt[t] || 0}</td>
                <td style="font-weight:bold; color:blue;">${stock.remainingStock[t] || 0}</td>
            </tr>`;
    });

    const logBody = document.getElementById('stock-history-body'); logBody.innerHTML = '';
    stockHistory.slice().reverse().forEach(h => {
        logBody.innerHTML += `
            <tr>
                <td>${h.timestamp}</td><td>${h.item}</td><td><b>${h.qty}</b></td>
                <td><span class="delete-btn" onclick="deleteStockIntake(${h.id})">🗑️ මකන්න</span></td>
            </tr>`;
    });
}

window.deleteStockIntake = function(id) {
    if(confirm("මෙම තොග ඇතුළත් කිරීම මකාදැමීමට අවශ්‍යද?")) {
        stockHistory = stockHistory.filter(i => i.id !== id);
        localStorage.setItem('watalappan_stock_history', JSON.stringify(stockHistory));
        renderStockOverview(); updateLiveTotal(); updateFilteredAnalytics();
    }
};

// --- EXPENSES LOG ---
document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('expense-desc').value;
    const amt = parseFloat(document.getElementById('expense-amount').value);
    expenses.push({ id: Date.now(), date: new Date().toISOString().split('T')[0], desc: desc, amount: amt });
    localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
    renderExpenseTable(); renderMonthlyPnL(); updateFilteredAnalytics();
    document.getElementById('expense-desc').value = ''; document.getElementById('expense-amount').value = '';
});

function renderExpenseTable() {
    const eBody = document.getElementById('expense-table-body'); eBody.innerHTML = '';
    expenses.forEach(ex => {
        eBody.innerHTML += `<tr><td>${ex.desc}</td><td>රු. ${ex.amount}</td><td><span class="delete-btn" onclick="deleteExpense(${ex.id})">🗑️</span></td></tr>`;
    });
}
window.deleteExpense = function(id) {
    expenses = expenses.filter(i => i.id !== id); localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
    renderExpenseTable(); renderMonthlyPnL(); updateFilteredAnalytics();
};

// --- MONTHLY PROFIT & LOSS GENERATOR ---
function renderMonthlyPnL() {
    const pnlBody = document.getElementById('pnl-table-body');
    pnlBody.innerHTML = '';
    
    let monthlyData = {};

    salesData.forEach(s => {
        let m = s.date.substring(0, 7);
        if(!monthlyData[m]) monthlyData[m] = { income: 0, loss: 0, exp: 0 };
        monthlyData[m].income += s.total;
        monthlyData[m].loss += s.returnLoss;
    });

    expenses.forEach(e => {
        let m = e.date.substring(0, 7);
        if(!monthlyData[m]) monthlyData[m] = { income: 0, loss: 0, exp: 0 };
        monthlyData[m].exp += e.amount;
    });

    Object.keys(monthlyData).sort().reverse().forEach(m => {
        let row = monthlyData[m];
        let net = row.income - row.exp;
        pnlBody.innerHTML += `
            <tr>
                <td><b>${m}</b></td>
                <td style="color:green;">රු. ${row.income.toFixed(2)}</td>
                <td style="color:orange;">රු. ${row.loss.toFixed(2)}</td>
                <td style="color:red;">රු. ${row.exp.toFixed(2)}</td>
                <td style="font-weight:bold; background:${net>=0?'#e8f5e9':'#ffebee'}; color:${net>=0?'#2e7d32':'#c62828'}">රු. ${net.toFixed(2)}</td>
            </tr>`;
    });
}

// --- BUSINESS INTELLIGENCE & ALERTS ENGINE ---
function updateFilteredAnalytics() {
    const targetShop = filterShopSelect.value;
    const timePeriod = filterTimeSelect.value;
    const todayStr = new Date().toISOString().split('T')[0];

    let soldQty = 0, totalIncome = 0, returnQty = 0, returnLoss = 0, totalExp = 0;
    
    let shopPerformance = {};
    let productPerformance = {};

    salesData.forEach(item => {
        if(!shopPerformance[item.shop]) shopPerformance[item.shop] = 0;
        shopPerformance[item.shop] += item.total;

        if(!productPerformance[item.item]) productPerformance[item.item] = 0;
        productPerformance[item.item] += item.netQty;

        if (targetShop !== "ALL" && item.shop !== targetShop) return;
        if (timePeriod === "daily" && item.date !== todayStr) return;

        soldQty += item.netQty; totalIncome += item.total; returnQty += item.retQty; returnLoss += item.returnLoss;
    });

    expenses.forEach(ex => {
        if (timePeriod === "daily" && ex.date !== todayStr) return;
        totalExp += ex.amount;
    });

    let grandTotalOutstanding = 0;
    shops.forEach(s => { grandTotalOutstanding += calculateShopCredit(s); });

    const netProfit = totalIncome - totalExp;
    document.getElementById('f-sold-qty').textContent = soldQty;
    document.getElementById('f-total-income').textContent = `රු. ${totalIncome.toFixed(2)}`;
    document.getElementById('f-return-qty').textContent = `${returnQty}`;
    document.getElementById('f-return-loss').textContent = `අලාභය: රු. ${returnLoss.toFixed(0)}`;
    document.getElementById('f-total-outstanding').textContent = `රු. ${grandTotalOutstanding.toFixed(2)}`;
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
        if(currentLevel <= 10) {
            alertsContainer.innerHTML += `
                <div class="alert-banner">⚠️ <b>තොග අවවාදයයි:</b> ඔබ සතු '${k}' ඉතිරි තොගය අවම මට්ටමක පවතී! (ඉතිරිව ඇත්තේ: ${currentLevel})</div>`;
        }
    });

    let shopDeliveries = {}, shopReturns = {};
    salesData.forEach(s => {
        if(!shopDeliveries[s.shop]) { shopDeliveries[s.shop] = 0; shopReturns[s.shop] = 0; }
        shopDeliveries[s.shop] += s.qty;
        shopReturns[s.shop] += s.retQty;
    });

    Object.keys(shopDeliveries).forEach(shop => {
        let d = shopDeliveries[shop];
        let r = shopReturns[shop];
        if(d > 0 && (r / d) >= 0.30) {
            let pct = ((r / d) * 100).toFixed(0);
            alertsContainer.innerHTML += `
                <div class="alert-banner danger-alert">🚨 <b>අධික Return අවදානම:</b> '${shop}' කඩේ Return ප්‍රතිශතය ඉතා ඉහළයි (${pct}%)! බඩු දෙන ප්‍රමාණය සීමා කරන්න.</div>`;
        }
    });
}

// --- CLOUD SERVER DATA SYNC ---
document.getElementById('cloud-backup-btn').addEventListener('click', async () => {
    const status = document.getElementById('cloud-status');
    if(GOOGLE_SHEETS_WEBAPP_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
        status.style.color = "red";
        status.textContent = "❌ කරුණාකර ප්‍රථමයෙන් script.js හි WebApp URL එක සකසන්න!";
        return;
    }
    
    status.style.color = "blue";
    status.textContent = "⏳ Cloud එකට සම්බන්ධ වෙමින්... කරුණාකර රැඳී සිටින්න...";

    const payload = { sales: salesData, expenses: expenses, stockLog: stockHistory };

    try {
        const response = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        status.style.color = "green";
        status.textContent = "✅ Cloud Backup එක සාර්ථකව අවසන් වුණා!";
    } catch (error) {
        status.style.color = "red";
        status.textContent = "❌ දෝෂයකි: Backup එක අසාර්ථක විය.";
    }
});

// --- EXCEL DOWNLOAD MASTER ---
document.getElementById('export-btn').addEventListener('click', () => {
    if(salesData.length === 0) return alert("දත්ත නැත!");
    const ws = XLSX.utils.json_to_sheet(salesData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `Watalappan_ERP_Report.xlsx`);
});
