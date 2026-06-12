// --- DATA STRUCTURES (LOCAL STORAGE) ---
let shops = JSON.parse(localStorage.getItem('w_shops')) || [
    { name: "Main Shop", phone: "0771234567" },
    { name: "Town Bakery", phone: "0719876543" }
];

let products = JSON.parse(localStorage.getItem('w_products')) || {
    "වටලප්පන්": { price: 150, cost: 90 },
    "යෝගට්": { price: 70, cost: 40 },
    "ජෙලි යෝගට්": { price: 90, cost: 50 },
    "කැරමල් පුඩිං": { price: 180, cost: 110 }
};

let productionHistory = JSON.parse(localStorage.getItem('w_production')) || [];
let expenses = JSON.parse(localStorage.getItem('w_expenses')) || [];
let salesInvoices = JSON.parse(localStorage.getItem('w_invoices')) || [];

// --- LIFECYCLE ---
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('sales-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('stock-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    
    initDropdowns();
    renderShopsTable();
    renderProductionTable();
    renderExpensesTable();
    addInvoiceItemRow(); // initial row
});

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

function initDropdowns() {
    const shopSelect = document.getElementById('sales-shop-select');
    shopSelect.innerHTML = '';
    shops.forEach(s => shopSelect.add(new Option(s.name, s.name)));

    const stockItem = document.getElementById('stock-item-select');
    const costItem = document.getElementById('cost-product-select');
    stockItem.innerHTML = '';
    costItem.innerHTML = '';
    
    Object.keys(products).forEach(p => {
        stockItem.add(new Option(p, p));
        costItem.add(new Option(p, p));
    });
    syncWastageFields();
    loadProductCostDetails();
}

// --- SHOPS UPDATE LOGIC ---
function saveShopData() {
    const name = document.getElementById('shop-name-input').value.trim();
    const phone = document.getElementById('shop-phone-input').value.trim();
    if(!name) return alert("කඩේ නම ඇතුළත් කරන්න!");

    let existingIdx = shops.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
    if(existingIdx >= 0) {
        shops[existingIdx].phone = phone;
        alert("🏪 කඩේ දුරකථන අංකය සාර්ථකව වෙනස් කළා!");
    } else {
        shops.push({ name: name, phone: phone });
        alert("🏪 නව කඩය සාර්ථකව එකතු කළා!");
    }
    localStorage.setItem('w_shops', JSON.stringify(shops));
    document.getElementById('shop-name-input').value = '';
    document.getElementById('shop-phone-input').value = '';
    initDropdowns();
    renderShopsTable();
}

function renderShopsTable() {
    const tbody = document.getElementById('shops-table-body');
    tbody.innerHTML = '';
    shops.forEach(s => {
        tbody.innerHTML += `<tr><td><b>${s.name}</b></td><td>${s.phone || '-'}</td><td><button class="btn" style="padding:4px 8px; font-size:0.8rem;" onclick="editShop('${s.name}', '${s.phone}')">✍️ Edit</button></td></tr>`;
    });
}

window.editShop = function(name, phone) {
    document.getElementById('shop-name-input').value = name;
    document.getElementById('shop-phone-input').value = phone;
}

// --- COST HISTORY MANAGEMENT ---
document.getElementById('cost-product-select').addEventListener('change', loadProductCostDetails);
function loadProductCostDetails() {
    const prod = document.getElementById('cost-product-select').value;
    if(products[prod]) {
        document.getElementById('cost-selling-price').value = products[prod].price;
        document.getElementById('cost-unit-cost').value = products[prod].cost;
    }
}

function updateProductPricing() {
    const prod = document.getElementById('cost-product-select').value;
    const price = parseFloat(document.getElementById('cost-selling-price').value) || 0;
    const cost = parseFloat(document.getElementById('cost-unit-cost').value) || 0;
    
    if(prod) {
        products[prod] = { price: price, cost: cost };
        localStorage.setItem('w_products', JSON.stringify(products));
        alert(`🥛 ${prod} හි අමුද්‍රව්‍ය පිරිවැය සහ මිල ගණන් යාවත්කාලීන කලා!`);
    }
}

// --- PRODUCTION & WASTAGE ACCUMULATION ---
function syncWastageFields() {
    const dt = document.getElementById('stock-date').value;
    const item = document.getElementById('stock-item-select').value;
    
    let match = productionHistory.find(p => p.date === dt && p.item === item);
    if(match) {
        document.getElementById('stock-qty-input').value = match.qty;
        document.getElementById('stock-wastage-input').value = match.wastage === '-' ? 0 : match.wastage;
    } else {
        document.getElementById('stock-qty-input').value = 0;
        document.getElementById('stock-wastage-input').value = 0;
    }
}

function saveProductionStock() {
    const dt = document.getElementById('stock-date').value;
    const item = document.getElementById('stock-item-select').value;
    const qty = parseInt(document.getElementById('stock-qty-input').value) || 0;
    const wastageQty = parseInt(document.getElementById('stock-wastage-input').value) || 0;

    let existingIdx = productionHistory.findIndex(p => p.date === dt && p.item === item);
    let finalWastage = wastageQty > 0 ? wastageQty : '-';

    if(existingIdx >= 0) {
        productionHistory[existingIdx].qty = qty; 
        if(wastageQty > 0) {
            let oldWastage = productionHistory[existingIdx].wastage === '-' ? 0 : parseInt(productionHistory[existingIdx].wastage);
            productionHistory[existingIdx].wastage = oldWastage + wastageQty;
        }
        alert("📦 දෛනික නිෂ්පාදන සහ හානි තොරතුරු යාවත්කාලීන කළා (Aggregated)!");
    } else {
        productionHistory.push({
            date: dt, item: item, qty: qty, wastage: finalWastage
        });
        alert("📦 නව නිෂ්පාදන සහ හානි වාර්තාවක් සාර්ථකව සුරැකුවා!");
    }

    localStorage.setItem('w_production', JSON.stringify(productionHistory));
    renderProductionTable();
}

function renderProductionTable() {
    const tbody = document.getElementById('stock-history-table-body');
    tbody.innerHTML = '';
    productionHistory.slice().reverse().forEach(p => {
        tbody.innerHTML += `<tr>
            <td>${p.date}</td>
            <td><b>${p.item}</b></td>
            <td>${p.qty}</td>
            <td style="color:${p.wastage !== '-'?'red':'inherit'}; font-weight:bold;">${p.wastage}</td>
            <td><button class="btn" style="padding:4px 8px; font-size:0.8rem; background-color:#616161;" onclick="editStockRecord('${p.date}', '${p.item}')">🛠️ Edit / වැරදි හදන්න</button></td>
        </tr>`;
    });
}

window.editStockRecord = function(dt, item) {
    document.getElementById('stock-date').value = dt;
    document.getElementById('stock-item-select').value = item;
    syncWastageFields();
    showTab('tab-stock');
}

// --- EXPENSES LOGIC ---
function saveExpenseData() {
    const dt = document.getElementById('expense-date').value;
    const cat = document.getElementById('expense-category').value;
    const desc = document.getElementById('expense-desc').value.trim();
    const amt = parseFloat(document.getElementById('expense-amount').value) || 0;

    if(!dt || !desc || amt <= 0) return alert("කරුණාකර සියලු විස්තර නිවැරදිව පුරවන්න!");

    expenses.push({ date: dt, category: cat, desc: desc, amount: amt });
    localStorage.setItem('w_expenses', JSON.stringify(expenses));
    
    document.getElementById('expense-desc').value = '';
    document.getElementById('expense-amount').value = '';
    renderExpensesTable();
    alert("⛽ වියදම සටහන් කරගත්තා!");
}

function renderExpensesTable() {
    const tbody = document.getElementById('expenses-table-body');
    tbody.innerHTML = '';
    expenses.slice().reverse().forEach(e => {
        tbody.innerHTML += `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.desc}</td><td>රු. ${e.amount.toFixed(2)}</td></tr>`;
    });
}

// --- MULTI-ITEM INVOICE LOGIC ---
let rowCounter = 0;
function addInvoiceItemRow() {
    rowCounter++;
    const container = document.getElementById('invoice-items-container');
    const rowHtml = `
        <div class="item-row-box" id="inv-row-${rowCounter}">
            <div class="grid">
                <div class="row">
                    <div class="col" style="width: 40%;">
                        <label>භාණ්ඩ වර්ගය:</label>
                        <select class="row-item-select" id="row-item-${rowCounter}">
                            ${Object.keys(products).map(p => `<option value="${p}">${p}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col">
                        <label>බෙදාහළ Qty:</label>
                        <input type="number" class="row-qty" id="row-qty-${rowCounter}" value="0" min="0">
                    </div>
                    <div class="col">
                        <label>රිටන් Qty:</label>
                        <input type="number" class="row-ret" id="row-ret-${rowCounter}" value="0" min="0">
                    </div>
                    <div class="col" style="width: 10%; vertical-align: bottom;">
                        <button class="btn btn-danger" style="padding: 8px;" onclick="removeInvoiceItemRow(${rowCounter})">❌</button>
                    </div>
                </div>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', rowHtml);
}

function removeInvoiceItemRow(id) {
    const row = document.getElementById(`inv-row-${id}`);
    if(row) row.remove();
}

let currentActiveInvoiceData = null; 
function generateInvoiceInvoice() {
    const dt = document.getElementById('sales-date').value;
    const shop = document.getElementById('sales-shop-select').value;
    const payMode = document.getElementById('sales-pay-mode').value;

    const rows = document.querySelectorAll('.item-row-box');
    if(rows.length === 0) return alert("කරුණාකර අවම වශයෙන් එක භාණ්ඩයක්වත් ඇතුලත් කරන්න!");

    let invoiceItems = [];
    let netTotal = 0;

    for(let row of rows) {
        let id = row.id.split('-')[2];
        let item = document.getElementById(`row-item-${id}`).value;
        let qty = parseInt(document.getElementById(`row-qty-${id}`).value) || 0;
        let ret = parseInt(document.getElementById(`row-ret-${id}`).value) || 0;
        
        if(qty === 0 && ret === 0) continue;

        let price = products[item].price;
        let finalQty = Math.max(0, qty - ret);
        let rowTotal = finalQty * price;
        netTotal += rowTotal;

        invoiceItems.push({
            item: item, qty: qty, ret: ret, price: price, total: rowTotal
        });
    }

    if(invoiceItems.length === 0) return alert("Qty හෝ Return ප්‍රමාණයන් ඇතුළත් කරන්න!");

    currentActiveInvoiceData = {
        date: dt, shop: shop, payMode: payMode, items: invoiceItems, total: netTotal
    };

    salesInvoices.push(currentActiveInvoiceData);
    localStorage.setItem('w_invoices', JSON.stringify(salesInvoices));

    document.getElementById('pdf-preview-card').classList.remove('hidden');
    document.getElementById('pdf-inv-meta').textContent = `දිනය: ${dt} | වෙළඳසැල: ${shop}`;
    
    const pBody = document.getElementById('pdf-inv-body');
    pBody.innerHTML = '';
    invoiceItems.forEach(i => {
        pBody.innerHTML += `<tr><td>${i.item}</td><td>${i.qty}</td><td>${i.ret}</td><td>රු.${i.price}</td><td>රු.${i.total.toFixed(2)}</td></tr>`;
    });
    document.getElementById('pdf-inv-total').textContent = `මුළු එකතුව: රු. ${netTotal.toFixed(2)}`;
    document.getElementById('pdf-inv-paytype').textContent = `ගනුදෙනු ක්‍රමය: ${payMode === 'Credit' ? 'ණය (Credit Book)' : 'මුදල් ලැබුණි (Cash)'}`;
    
    alert("📄 බහු-භාණ්ඩ බිල්පත සාර්ථකව පද්ධතියට එක්වුණා! දැන් PDF එක බාගත කරගත හැක.");
}

function downloadInvoicePDF() {
    if(!currentActiveInvoiceData) return;
    const element = document.getElementById('invoice-pdf-area');
    const opt = {
        margin:       10,
        filename:     `Invoice_${currentActiveInvoiceData.shop}_${currentActiveInvoiceData.date}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}
