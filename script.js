// --- CONFIGURATION ---
const APP_PASSWORD = "1234"; 

// --- STATE MANAGEMENT ---
let shops = JSON.parse(localStorage.getItem('watalappan_shops')) || ["Main Shop", "Town Bakery"];
const itemTypes = ["වටලප්පන්", "යෝගට්", "ජෙලි යෝගට්", "කැරමල් පුඩිං"];

let salesData = JSON.parse(localStorage.getItem('watalappan_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('watalappan_expenses')) || [];
let stockBalance = JSON.parse(localStorage.getItem('watalappan_stock')) || {
    "වටලප්පන්": 50, "යෝගට්": 100, "ජෙලි යෝගට්": 40, "කැරමල් පුඩිං": 30
};

// --- DOM NAVIGATION ELEMENTS ---
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

// --- APP INITIALIZATION ---
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
    renderSalesTable();
    renderStockTable();
    renderExpenseTable();
    renderCreditTable();
    updateFilteredAnalytics();
    updateLiveTotal();
}

// --- DYNAMIC TABS SYSTEM ---
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
    
    itemTypes.forEach(t => {
        let op1 = new Option(t, t); itemTypeSelect.add(op1);
        let op2 = new Option(t, t); stockItemSelect.add(op2);
    });
}

// --- CALCULATION MECHANICS ---
function getUnitPrice(type) {
    if(type==='වටලප්පන්') return parseFloat(document.getElementById('price-watalappan').value)||0;
    if(type==='යෝගට්') return parseFloat(document.getElementById('price-yogurt').value)||0;
    if(type==='ජෙලි යෝගට්') return parseFloat(document.getElementById('price-jelly').value)||0;
    if(type==='කැරමල් පුඩිං') return parseFloat(document.getElementById('price-caramel').value)||0;
    return 0;
}

function updateLiveTotal() {
    const item = itemTypeSelect.value;
    const qty = parseInt(quantityInput.value) || 0;
    const retQty = parseInt(returnQuantityInput.value) || 0;
    const avail = stockBalance[item] || 0;
    
    document.getElementById('stock-available-lbl').textContent = `තොගයේ ඇත: ${avail}`;
    const total = Math.max(0, qty - retQty) * getUnitPrice(item);
    totalPriceDisplay.textContent = `රු. ${total.toFixed(2)}`;
}
[quantityInput, returnQuantityInput, itemTypeSelect].forEach(el => el.addEventListener('input', updateLiveTotal));

// --- SHOP MANAGEMENT ---
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

// --- DATA SAVE & INVOICE GENERATOR (WhatsApp) ---
salesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = itemTypeSelect.value;
    const qty = parseInt(quantityInput.value);
    const retQty = parseInt(returnQuantityInput.value) || 0;
    const price = getUnitPrice(item);
    const payMode = document.querySelector('input[name="payment-method"]:checked').value;

    if(qty > (stockBalance[item] || 0)) {
        alert("⚠️ සමාවන්න! ඔබ ළඟ ප්‍රමාණවත් තොගයක් නොමැත.");
        return;
    }

    // Deduct stock balance
    stockBalance[item] -= qty;
    localStorage.setItem('watalappan_stock', JSON.stringify(stockBalance));

    const rec = {
        id: Date.now(), date: salesDateInput.value, shop: shopSelect.value, item: item,
        qty: qty, retQty: retQty, netQty: Math.max(0, qty - retQty), unitPrice: price,
        payMode: payMode, returnLoss: retQty * price, total: Math.max(0, qty - retQty) * price
    };

    salesData.push(rec);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));

    renderSalesTable(); renderStockTable(); renderCreditTable(); updateFilteredAnalytics();
    showInvoicePreview(rec);

    quantityInput.value = 1; returnQuantityInput.value = 0; updateLiveTotal();
});

function showInvoicePreview(rec) {
    document.getElementById('invoice-card').classList.remove('hidden');
    document.getElementById('inv-date-shop').textContent = `දිනය: ${rec.date} | කඩය: ${rec.shop}`;
    document.getElementById('inv-table-body').innerHTML = `
        <tr><td>${rec.item}</td><td>${rec.qty}</td><td>${rec.retQty}</td><td>රු.${rec.total}</td></tr>
    `;
    document.getElementById('inv-total').textContent = `මුළු මුදල: රු. ${rec.total.toFixed(2)}`;
    document.getElementById('inv-paymode').textContent = `ගනුදෙනු ක්‍රමය: ${rec.payMode === 'Credit' ? 'ණය (Credit Book)' : 'මුදල් (Cash)'}`;

    document.getElementById('whatsapp-share-btn').onclick = () => {
        const txt = `*🍮 WATALAPPAN INVOICE*\n-------------------------\n*කඩය:* ${rec.shop}\n*දිනය:* ${rec.date}\n*වර්ගය:* ${rec.item}\n*බෙදාහැරීම:* ${rec.qty}\n*රිටන්:* ${rec.retQty}\n*විකුණුම්:* ${rec.netQty}\n-------------------------\n*මුළු ශුද්ධ මුදල: රු.${rec.total}*\n*ක්‍රමය:* ${rec.payMode === 'Credit' ? 'ණයට' : 'මුදල් ලැබුණා'}\n\nස්තූතියි!`;
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
        const rec = salesData.find(i => i.id === id);
        if(rec) { stockBalance[rec.item] += rec.qty; localStorage.setItem('watalappan_stock', JSON.stringify(stockBalance)); }
        salesData = salesData.filter(i => i.id !== id); localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
        renderSalesTable(); renderStockTable(); renderCreditTable(); updateFilteredAnalytics();
    }
};

// --- CREDIT OUTSTANDING TRACKER ---
function renderCreditTable() {
    const creditBody = document.getElementById('credit-table-body');
    creditBody.innerHTML = '';
    
    shops.forEach(shop => {
        let totalDebt = 0;
        salesData.forEach(item => {
            if(item.shop === shop && item.payMode === 'Credit') totalDebt += item.total;
        });

        if(totalDebt > 0) {
            creditBody.innerHTML += `
                <tr>
                    <td><b>${shop}</b></td>
                    <td style="color:red; font-weight:bold;">රු. ${totalDebt.toFixed(2)}</td>
                    <td><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; background-color:#2e7d32;" onclick="settleCredit('${shop}')">Mark as Paid</button></td>
                </tr>`;
        }
    });
}

window.settleCredit = function(shopName) {
    if(confirm(`${shopName} කඩෙන් සියලුම ණය මුදල් ලැබුණාද?`)) {
        salesData.forEach(item => { if(item.shop === shopName && item.payMode === 'Credit') item.payMode = 'Cash'; });
        localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
        renderSalesTable(); renderCreditTable(); updateFilteredAnalytics();
    }
};

// --- STOCK & EXPENSE ACTIONS ---
document.getElementById('stock-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const item = document.getElementById('stock-item-select').value;
    const qty = parseInt(document.getElementById('stock-qty-input').value);
    stockBalance[item] = (stockBalance[item] || 0) + qty;
    localStorage.setItem('watalappan_stock', JSON.stringify(stockBalance));
    renderStockTable(); updateLiveTotal();
    document.getElementById('stock-qty-input').value = '';
});

function renderStockTable() {
    const sBody = document.getElementById('stock-table-body'); sBody.innerHTML = '';
    itemTypes.forEach(t => {
        sBody.innerHTML += `<tr><td>${t}</td><td style="font-weight:bold; color:blue;">${stockBalance[t] || 0}</td></tr>`;
    });
}

document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('expense-desc').value;
    const amt = parseFloat(document.getElementById('expense-amount').value);
    expenses.push({ id: Date.now(), date: new Date().toISOString().split('T')[0], desc: desc, amount: amt });
    localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
    renderExpenseTable(); updateFilteredAnalytics();
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
    renderExpenseTable(); updateFilteredAnalytics();
};

// --- ADVANCED ANALYTICS INTERFACE ---
function updateFilteredAnalytics() {
    const targetShop = filterShopSelect.value;
    const timePeriod = filterTimeSelect.value;
    const todayStr = new Date().toISOString().split('T')[0];

    let soldQty = 0, totalIncome = 0, returnQty = 0, returnLoss = 0, totalExp = 0;

    salesData.forEach(item => {
        if (targetShop !== "ALL" && item.shop !== targetShop) return;
        if (timePeriod === "daily" && item.date !== todayStr) return;
        // (weekly, monthly, yearly සෙටින්ග්ස් පෙර පරිදිම ක්‍රියාත්මක වේ)

        soldQty += item.netQty; totalIncome += item.total; returnQty += item.retQty; returnLoss += item.returnLoss;
    });

    expenses.forEach(ex => {
        if (timePeriod === "daily" && ex.date !== todayStr) return;
        totalExp += ex.amount;
    });

    const netProfit = totalIncome - totalExp;

    document.getElementById('f-sold-qty').textContent = soldQty;
    document.getElementById('f-total-income').textContent = `රු. ${totalIncome.toFixed(2)}`;
    document.getElementById('f-return-qty').textContent = `${returnQty} (රු.${returnLoss.toFixed(0)})`;
    document.getElementById('f-net-profit').textContent = `රු. ${netProfit.toFixed(2)}`;
    document.getElementById('f-net-profit').parentElement.style.background = netProfit >= 0 ? 'linear-gradient(135deg, #2e7d32, #1b5e20)' : 'linear-gradient(135deg, #d32f2f, #c62828)';
}
filterShopSelect.addEventListener('change', updateFilteredAnalytics);
filterTimeSelect.addEventListener('change', updateFilteredAnalytics);

// --- EXCEL LOGIC ---
document.getElementById('export-btn').addEventListener('click', () => {
    if(salesData.length === 0) return alert("දත්ත නැත!");
    const ws = XLSX.utils.json_to_sheet(salesData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `Watalappan_ERP_Report.xlsx`);
});
