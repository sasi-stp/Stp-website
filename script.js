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
    
    // Clear and build initial dynamic row for multi item entry grid layout
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

    // Setup Optional Notification Toggler Observer logic
    sendBillCheckbox.addEventListener('change', () => {
        if(sendBillCheckbox.checked) {
            sharingOptionsWrapper.classList.remove('hidden');
        } else {
            sharingOptionsWrapper.classList.add('hidden');
        }
    });

    // Auto calculate stock intake default balance based on selected asset type
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

// --- DYNAMIC MULTI-ITEM GRID STRUCTURE CONSTRUCTORS ---
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
            </div>
        </div>
    `;

    itemsContainer.appendChild(rowCard);
    updateLiveTotal();
};

window.removeItemRow = function(rowId) {
    const rows = itemsContainer.getElementsByClassName('item-row-card');
    if(rows.length <= 1) {
        alert("⚠️ බිලකට අවම වශයෙන් එක භාණ්ඩ වර්ගයක්වත් තිබිය යුතුය.");
        return;
    }
    const targetRow = document.getElementById(rowId);
    if(targetRow) {
        targetRow.remove();
        updateLiveTotal();
    }
};

// --- DYNAMIC STOCK CALCULATION MECHANICS ---
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
                if(remainingStock[si.item] !== undefined) {
                    remainingStock[si.item] -= si.qty;
                }
            });
        } else if(remainingStock[s.item] !== undefined) {
            remainingStock[s.item] -= s.qty;
        }
    });

    return { totalBuilt, remainingStock };
}

function updateLiveTotal() {
    const stock = calculateCurrentStock();
    let overallBillNetTotal = 0;

    const rows = itemsContainer.getElementsByClassName('item-row-card');
    for(let row of rows) {
        const itemSelect = row.querySelector('.row-item-select');
        const qtyInput = row.querySelector('.row-qty-input');
        const freeInput = row.querySelector('.row-free-input');
        const retInput = row.querySelector('.row-ret-input');
        
        const schemeLbl = row.querySelector('.row-scheme-lbl');
        const stockLbl = row.querySelector('.row-stock-lbl');

        const item = itemSelect.value;
        const qty = parseInt(qtyInput.value) || 0;
        const freeQty = parseInt(freeInput.value) || 0;
        const retQty = parseInt(retInput.value) || 0;

        const avail = stock.remainingStock[item] || 0;
        stockLbl.textContent = `තොගයේ ඇත: ${avail}`;

        const scheme = productsMap[item];
        if(scheme && scheme[2] > 0 && scheme[3] > 0) {
            schemeLbl.textContent = `💡 Free ක්‍රමය: ඒකක ${scheme[2]} කට ${scheme[3]} ක් නොමිලේ හිමිවේ.`;
        } else {
            schemeLbl.textContent = '';
        }

        const price = getUnitPrice(item);
        const finalBillableQty = Math.max(0, qty - freeQty - retQty);
        overallBillNetTotal += (finalBillableQty * price);
    }

    totalPriceDisplay.textContent = `රු. ${overallBillNetTotal.toFixed(2)}`;
}

// --- INTAKE SYSTEM: YESTERDAY PREVIEW UPDATE FLOW MECHANICS ---
function updateStockPrevBalPreview() {
    const selectedItem = document.getElementById('stock-item-select').value;
    if(!selectedItem) return;

    const stock = calculateCurrentStock();
    const currentRemaining = stock.remainingStock[selectedItem] || 0;
    
    // Automatically pre-populate and keep it fully editable for users
    document.getElementById('stock-prev-bal').value = currentRemaining;
}

function getUnitPrice(type) {
    return productsMap[type] ? parseFloat(productsMap[type][0]) : 0;
}
function getUnitCost(type) {
    return productsMap[type] ? parseFloat(productsMap[type][1]) : 0;
}

// --- PRODUCT REGISTRATION WITH PRODUCTION COST & FREE SCHEMES ---
document.getElementById('add-product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-prod-name');
    const priceInput = document.getElementById('new-prod-price');
    const costInput = document.getElementById('new-prod-cost');
    const freeTriggerInput = document.getElementById('new-prod-free-trigger');
    const freeGiveInput = document.getElementById('new-prod-free-give');
    
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const cost = parseFloat(costInput.value);
    const freeTrigger = parseInt(freeTriggerInput.value) || 0;
    const freeGive = parseInt(freeGiveInput.value) || 0;
    
    if(name && !isNaN(price) && !isNaN(cost)) {
        productsMap[name] = [price, cost, freeTrigger, freeGive];
        localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
        
        populateDropdowns();
        renderProductsSettings();
        renderStockOverview();
        updateLiveTotal();
        
        nameInput.value = ''; priceInput.value = ''; costInput.value = '';
        freeTriggerInput.value = ''; freeGiveInput.value = '';
        alert(`✅ '${name}' සාර්ථකව ඇතුළත් කරගත්තා!`);
    }
});

function renderProductsSettings() {
    const tbody = document.getElementById('products-settings-body');
    tbody.innerHTML = '';
    Object.keys(productsMap).forEach(name => {
        const trigger = productsMap[name][2] || 0;
        const give = productsMap[name][3] || 0;
        const schemeTxt = (trigger > 0 && give > 0) ? `${trigger} කට ${give} ක් නොමිලේ` : "නැත (No scheme)";
        
        tbody.innerHTML += `
            <tr>
                <td><b>${name}</b></td>
                <td>රු. ${productsMap[name][0]}</td>
                <td style="color:#795548;">රු. ${productsMap[name][1]}</td>
                <td style="color:#e65100; font-weight:600;">${schemeTxt}</td>
                <td><span class="delete-btn" onclick="deleteProduct('${name}')">❌</span></td>
            </tr>`;
    });
}

window.deleteProduct = function(name) {
    if(confirm(`"${name}" පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?`)) {
        delete productsMap[name];
        localStorage.setItem('watalappan_products_map', JSON.stringify(productsMap));
        populateDropdowns(); renderProductsSettings(); renderStockOverview(); updateLiveTotal();
        updateFilteredAnalytics(); renderMonthlyPnL();
    }
};

// --- SHOP REGISTRATION MODIFICATIONS ---
document.getElementById('add-shop-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let nameVal = document.getElementById('new-shop-name').value.trim();
    let phoneVal = document.getElementById('new-shop-phone').value.trim();
    
    if(!nameVal) return;
    
    if(phoneVal) {
        const isDuplicate = shopDirectory.some(s => s.phone && s.phone.replace(/\s+/g, '') === phoneVal.replace(/\s+/g, ''));
        if(isDuplicate) {
            alert(`⚠️ දුරකථන අංකය වැරදියි! "${phoneVal}" අංකය දැනටමත් වෙනත් කඩයක් සඳහා ඇතුළත් කර ඇත.`);
            return;
        }
    }
    
    shopDirectory.push({ name: nameVal, phone: phoneVal || "" });
    localStorage.setItem('watalappan_shop_directory', JSON.stringify(shopDirectory));
    populateDropdowns();
    renderShops();
    renderCreditTable();
    document.getElementById('new-shop-name').value = '';
    document.getElementById('new-shop-phone').value = '';
});

function renderShops() {
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    shopDirectory.forEach((s, idx) => {
        const hasPhone = s.phone && s.phone.trim() !== "";
        const phoneDisplayTxt = hasPhone ? s.phone : `<span style="color:gray; font-style:italic;">ඇතුළත් කර නැත</span>`;
        
        list.innerHTML += `
            <li>
                <span>🏪 <b>${s.name}</b> (${phoneDisplayTxt})</span> 
                <div>
                    <span class="edit-btn-icon" title="දුරකථන අංකය සංස්කරණය" onclick="openShopPhoneModal(${idx})">✏️</span>
                    <span class="delete-btn" onclick="deleteShop(${idx})">❌</span>
                </div>
            </li>`;
    });
}

window.openShopPhoneModal = function(idx) {
    const shop = shopDirectory[idx];
    document.getElementById('modal-shop-name').textContent = shop.name;
    document.getElementById('modal-shop-index').value = idx;
    document.getElementById('modal-phone-input').value = shop.phone || "";
    document.getElementById('edit-phone-modal').classList.remove('hidden');
};

window.closeShopPhoneModal = function() {
    document.getElementById('edit-phone-modal').classList.add('hidden');
};

window.saveShopPhoneModal = function() {
    const idx = parseInt(document.getElementById('modal-shop-index').value);
    const newPhone = document.getElementById('modal-phone-input').value.trim();
    
    if(newPhone !== "") {
        const isDuplicate = shopDirectory.some((s, i) => i !== idx && s.phone && s.phone.replace(/\s+/g, '') === newPhone.replace(/\s+/g, ''));
        if(isDuplicate) {
            alert(`⚠️ දෝෂයකි! මෙම දුරකථන අංකය වෙනත් කඩයක් සඳහා දැනටමත් භාවිතයේ පවතී.`);
            return;
        }
    }
    
    shopDirectory[idx].phone = newPhone;
    localStorage.setItem('watalappan_shop_directory', JSON.stringify(shopDirectory));
    renderShops();
    closeShopPhoneModal();
    alert("✅ දුරකථන අංකය සාර්ථකව යාවත්කාලීන කරන ලදී!");
};

window.deleteShop = function(idx) {
    if(confirm(`මෙම කඩය පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?`)) {
        shopDirectory.splice(idx, 1);
        localStorage.setItem('watalappan_shop_directory', JSON.stringify(shopDirectory));
        populateDropdowns(); renderShops(); renderCreditTable(); updateFilteredAnalytics();
    }
};

// --- SALES MULTI ITEM SUBMISSION MECHANICS & DISPATCH ---
salesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const dt = salesDateInput.value;
    const shop = shopSelect.value;
    const payMethod = document.querySelector('input[name="payment-method"]:checked').value;
    
    let overallBillNetTotal = 0;
    let itemsList = [];

    const rows = itemsContainer.getElementsByClassName('item-row-card');
    for(let row of rows) {
        const item = row.querySelector('.row-item-select').value;
        const qty = parseInt(row.querySelector('.row-qty-input').value) || 0;
        const free = parseInt(row.querySelector('.row-free-input').value) || 0;
        const ret = parseInt(row.querySelector('.row-ret-input').value) || 0;
        
        if(qty === 0 && free === 0 && ret === 0) continue;

        const price = getUnitPrice(item);
        const finalBillableQty = Math.max(0, qty - free - ret);
        const lineTotal = finalBillableQty * price;

        overallBillNetTotal += lineTotal;
        itemsList.push({ item: item, qty: qty, free: free, ret: ret, total: lineTotal });
    }

    if(itemsList.length === 0) {
        return alert("කරුණාකර අවම වශයෙන් එක භාණ්ඩයකටවත් ප්‍රමාණයන් ඇතුළත් කරන්න!");
    }
    
    const record = {
        id: Date.now(), date: dt, shop: shop, itemsList: itemsList, total: overallBillNetTotal, mode: payMethod
    };
    
    salesData.push(record);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    
    renderSalesTable();
    renderStockOverview();
    renderCreditTable();
    renderMonthlyPnL();
    updateFilteredAnalytics();
    
    // Process optional notification criteria based on checkbox condition
    if(sendBillCheckbox.checked) {
        const shareMode = document.querySelector('input[name="share-mode"]:checked').value;
        triggerBillNotification(record, shareMode);
    }
    
    // Clear dynamic UI rows layout grid setup entirely back to safe defaults
    itemsContainer.innerHTML = '';
    addItemRow();
    sendBillCheckbox.checked = false;
    sharingOptionsWrapper.classList.add('hidden');
    updateLiveTotal();
});

function renderSalesTable() {
    salesTableBody.innerHTML = '';
    salesData.slice().reverse().forEach(s => {
        let descHtml = '';
        if(s.itemsList && Array.isArray(s.itemsList)) {
            s.itemsList.forEach(si => {
                descHtml += `• ${si.item} (${si.qty} Qty, ${si.free} Free, ${si.ret} Ret)<br>`;
            });
        } else {
            descHtml = `• ${s.item} (${s.qty} Qty, ${s.free || 0} Free, ${s.ret} Ret)`;
        }

        salesTableBody.innerHTML += `
            <tr>
                <td>${s.date}</td>
                <td><b>${s.shop}</b></td>
                <td style="font-size: 0.75rem; max-width: 250px; line-height: 1.3;">${descHtml}</td>
                <td><b>රු. ${s.total.toFixed(2)}</b></td>
                <td><span style="color:${s.mode === 'Cash' ? 'green':'purple'}; font-weight:bold;">${s.mode}</span></td>
                <td><span class="delete-btn" onclick="deleteSalesRecord(${s.id})">❌</span></td>
            </tr>`;
    });
}

window.deleteSalesRecord = function(id) {
    if(confirm("මෙම විකුණුම් සටහන මැකීමට අවශ්‍යද?")) {
        salesData = salesData.filter(s => s.id !== id);
        localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
        renderSalesTable(); renderStockOverview(); renderCreditTable(); renderMonthlyPnL(); updateFilteredAnalytics(); updateLiveTotal();
    }
};

function triggerBillNotification(r, mode) {
    const targetShop = shopDirectory.find(s => s.name === r.shop);
    const phone = targetShop ? targetShop.phone : "";
    
    if(!phone) return;

    let itemsDescriptionText = "";
    if(r.itemsList && Array.isArray(r.itemsList)) {
        r.itemsList.forEach(si => {
            itemsDescriptionText += `📦 *භාණ්ඩය:* ${si.item}%0A🔹 *Qty:* ${si.qty} | 🎁 *Free:* ${si.free} | 🔺 *Ret:* ${si.ret}%0A%0A`;
        });
    } else {
        itemsDescriptionText = `📦 *භාණ්ඩය:* ${r.item}%0A🔹 *Qty:* ${r.qty} | 🎁 *Free:* ${r.free || 0} | 🔺 *Ret:* ${r.ret}%0A%0A`;
    }
    
    const msg = `*🍮 WATALAPPAN ENTERPRISE DAILY BILL*%0A----------------------------------------%0A📅 *දිනය (Date):* ${r.date}%0A🏪 *වෙළඳසැල:* ${r.shop}%0A----------------------------------------%0A${itemsDescriptionText}----------------------------------------%0A💵 *ගෙවිය යුතු ශුද්ධ මුළු මුදල:* රු. ${r.total.toFixed(2)}%0A----------------------------------------%0A... *ගනුදෙනු ක්‍රමය:* ${r.mode === 'Cash' ? '🤝 CASH (මුදල් ලැබුණි)' : '💳 CREDIT (ණය පොතට)'}%0A----------------------------------------%0A_Watalappan ERP Smart Messaging v2.0_`;

    let formattedPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
    if(mode === "WhatsApp") {
        window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${msg}`, '_blank');
    } else if(mode === "SMS") {
        window.open(`sms:${phone}?body=${decodeURIComponent(msg)}`, '_blank');
    }
}

// --- PRODUCTION STOCK INTAKE TRACKING ---
document.getElementById('stock-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('stock-edit-id').value;
    const dt = document.getElementById('stock-date').value;
    const item = document.getElementById('stock-item-select').value;
    const prevBal = parseInt(document.getElementById('stock-prev-bal').value) || 0;
    const qty = parseInt(document.getElementById('stock-qty').value) || 0;
    
    if(!dt || !item) return;

    if(editId) {
        stockHistory = stockHistory.map(h => {
            if(h.id == editId) {
                return { ...h, date: dt, item: item, prevBal: prevBal, qty: qty };
            }
            return h;
        });
        alert("📝 නිෂ්පාදන තොගය සාර්ථකව යාවත්කාලීන කරන ලදී!");
    } else {
        stockHistory.push({ id: Date.now(), date: dt, item: item, prevBal: prevBal, qty: qty });
        alert("📦 නව නිෂ්පාදන තොගය සාර්ථකව එකතු කළා!");
    }
    
    localStorage.setItem('watalappan_stock_history', JSON.stringify(stockHistory));
    resetStockForm();
    renderStockOverview();
    renderStockHistoryTable();
    updateLiveTotal();
    renderMonthlyPnL();
});

window.editStockRecord = function(id) {
    const rec = stockHistory.find(h => h.id == id);
    if(!rec) return;
    
    document.getElementById('stock-edit-id').value = rec.id;
    document.getElementById('stock-date').value = rec.date;
    document.getElementById('stock-item-select').value = rec.item;
    document.getElementById('stock-prev-bal').value = rec.prevBal || 0;
    document.getElementById('stock-qty').value = rec.qty || 0;
    
    document.getElementById('stock-form-title').textContent = "✏️ නිෂ්පාදන තොගය සංස්කරණය කිරීම";
    document.getElementById('stock-submit-btn').textContent = "යාවත්කාලීන කරන්න";
    document.getElementById('stock-cancel-btn').classList.remove('hidden');
};

window.resetStockForm = function() {
    document.getElementById('stock-edit-id').value = "";
    document.getElementById('stock-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('stock-prev-bal').value = "0";
    document.getElementById('stock-qty').value = "0";
    
    document.getElementById('stock-form-title').textContent = "📦 නිෂ්පාදන තොග ඇතුළත් කිරීම (Daily Stock Intake)";
    document.getElementById('stock-submit-btn').textContent = "තොගය ඇතුළත් කරන්න";
    document.getElementById('stock-cancel-btn').classList.add('hidden');
    updateStockPrevBalPreview();
};

function renderStockOverview() {
    const tbody = document.getElementById('stock-overview-body');
    tbody.innerHTML = '';
    const stock = calculateCurrentStock();
    
    Object.keys(productsMap).forEach(item => {
        const total = stock.totalBuilt[item] || 0;
        
        let sold = 0;
        salesData.forEach(s => {
            if(s.itemsList && Array.isArray(s.itemsList)) {
                s.itemsList.forEach(si => {
                    if(si.item === item) sold += si.qty;
                });
            } else if(s.item === item) {
                sold += s.qty;
            }
        });

        const rem = total - sold;
        tbody.innerHTML += `<tr><td><b>${item}</b></td><td>${total}</td><td>${sold}</td><td style="font-weight:bold; color:${rem < 20 ? 'red':'green'}">${rem}</td></tr>`;
    });
}

function renderStockHistoryTable() {
    const tbody = document.getElementById('stock-history-table-body');
    tbody.innerHTML = '';
    
    stockHistory.slice().reverse().forEach(h => {
        const pBal = h.prevBal || 0;
        const pQty = h.qty || 0;
        const sum = pBal + pQty;
        
        tbody.innerHTML += `
            <tr>
                <td>${h.date}</td>
                <td><b>${h.item}</b></td>
                <td>${pBal}</td>
                <td>${pQty}</td>
                <td><b>${sum}</b></td>
                <td>
                    <span class="edit-btn-icon" title="සංස්කරණය කරන්න" onclick="editStockRecord(${h.id})">✏️</span>
                    <span class="delete-btn" title="මකන්න" onclick="deleteStockHistoryRecord(${h.id})">❌</span>
                </td>
            </tr>`;
    });
}

window.deleteStockHistoryRecord = function(id) {
    if(confirm("මෙම නිෂ්පාදන තොග ඇතුළත් කිරීම් සටහන මැකීමට අවශ්‍යද?")) {
        stockHistory = stockHistory.filter(h => h.id !== id);
        localStorage.setItem('watalappan_stock_history', JSON.stringify(stockHistory));
        renderStockOverview(); renderStockHistoryTable(); updateLiveTotal(); renderMonthlyPnL();
    }
};

// --- DAILY EXPENSES MANAGEMENT ---
document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dt = document.getElementById('expense-date').value;
    const cat = document.getElementById('expense-category').value;
    const desc = document.getElementById('expense-desc').value.trim();
    const amt = parseFloat(document.getElementById('expense-amount').value) || 0;
    
    if(dt && cat && desc && amt > 0) {
        expenses.push({ id: Date.now(), date: dt, category: cat, desc: desc, amount: amt });
        localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
        renderExpenseTable();
        renderMonthlyPnL();
        updateFilteredAnalytics();
        document.getElementById('expense-desc').value = '';
        document.getElementById('expense-amount').value = '';
    }
});

function renderExpenseTable() {
    const tbody = document.getElementById('expense-table-body');
    tbody.innerHTML = '';
    expenses.slice().reverse().forEach(e => {
        tbody.innerHTML += `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.desc}</td><td><b>රු. ${e.amount.toFixed(2)}</b></td><td><span class="delete-btn" onclick="deleteExpense(${e.id})">❌</span></td></tr>`;
    });
}

window.deleteExpense = function(id) {
    if(confirm("මෙම වියදම් සටහන ඉවත් කිරීමට අවශ්‍යද?")) {
        expenses = expenses.filter(e => e.id !== id);
        localStorage.setItem('watalappan_expenses', JSON.stringify(expenses));
        renderExpenseTable(); renderMonthlyPnL(); updateFilteredAnalytics();
    }
};

// --- CREDIT MANAGEMENT INTERACTION ---
document.getElementById('credit-payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const shop = document.getElementById('credit-shop-select').value;
    const amt = parseFloat(document.getElementById('credit-paid-amount').value) || 0;
    const dt = new Date().toISOString().split('T')[0];
    
    if(shop && amt > 0) {
        creditPayments.push({ id: Date.now(), date: dt, shop: shop, amount: amt });
        localStorage.setItem('watalappan_credit_payments', JSON.stringify(creditPayments));
        renderCreditTable();
        updateFilteredAnalytics();
        document.getElementById('credit-paid-amount').value = '';
        alert(`✅ ${shop} වෙතින් ලැබුණු රු. ${amt.toFixed(2)} ක ණය බේරුම් කිරීම සටහන් කරගත්තා!`);
    }
});

function renderCreditTable() {
    const tbody = document.getElementById('credit-ledger-body');
    tbody.innerHTML = '';
    
    shopDirectory.forEach(s => {
        const totalCreditIncurred = salesData.filter(x => x.shop === s.name && x.mode === 'Credit').reduce((a,c) => a + c.total, 0);
        const totalPaid = creditPayments.filter(x => x.shop === s.name).reduce((a,c) => a + c.amount, 0);
        const outstanding = totalCreditIncurred - totalPaid;
        
        tbody.innerHTML += `<tr><td><b>${s.name}</b></td><td>රු. ${totalCreditIncurred.toFixed(2)}</td><td style="color:green;">රු. ${totalPaid.toFixed(2)}</td><td style="font-weight:bold; color:${outstanding > 0 ? 'red':'inherit'}">රු. ${outstanding.toFixed(2)}</td></tr>`;
    });
}

// --- FILTERED BUSINESS INTEL & ANALYTICS ---
function updateFilteredAnalytics() {
    const shop = filterShopSelect.value;
    const prod = filterProductSelect.value;
    const time = filterTimeSelect.value;
    
    const now = new Date();
    
    let filteredSales = salesData.filter(s => {
        if(shop !== "ALL" && s.shop !== shop) return false;
        
        if(prod !== "ALL") {
            if(s.itemsList && Array.isArray(s.itemsList)) {
                let hasProduct = s.itemsList.some(si => si.item === prod);
                if(!hasProduct) return false;
            } else if(s.item !== prod) {
                return false;
            }
        }
        
        const sDate = new Date(s.date);
        if(time === "daily") return sDate.toDateString() === now.toDateString();
        if(time === "weekly") {
            const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
            return sDate >= oneWeekAgo;
        }
        if(time === "monthly") return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
        if(time === "yearly") return sDate.getFullYear() === now.getFullYear();
        return true;
    });

    let totalSoldQty = 0;
    let totalIncome = 0;
    let totalRetQty = 0;
    let totalReturnLoss = 0;
    let totalProductionCost = 0;
    let outstandingIncurred = 0;

    filteredSales.forEach(s => {
        if(s.itemsList && Array.isArray(s.itemsList)) {
            s.itemsList.forEach(si => {
                if(prod !== "ALL" && si.item !== prod) return;
                totalSoldQty += si.qty;
                totalIncome += si.total;
                totalRetQty += si.ret;
                totalReturnLoss += (si.ret * getUnitCost(si.item));
                totalProductionCost += ((si.qty - si.ret) * getUnitCost(si.item));
            });
            if(prod === "ALL" && s.mode === 'Credit') {
                outstandingIncurred += s.total;
            } else if(prod !== "ALL" && s.mode === 'Credit') {
                s.itemsList.forEach(si => {
                    if(si.item === prod) outstandingIncurred += si.total;
                });
            }
        } else {
            totalSoldQty += s.qty;
            totalIncome += s.total;
            totalRetQty += s.ret;
            totalReturnLoss += (s.ret * getUnitCost(s.item));
            totalProductionCost += ((s.qty - s.ret) * getUnitCost(s.item));
            if(s.mode === 'Credit') outstandingIncurred += s.total;
        }
    });

    let filteredExpenses = expenses.filter(e => {
        const eDate = new Date(e.date);
        if(time === "daily") return eDate.toDateString() === now.toDateString();
        if(time === "weekly") {
            const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
            return eDate >= oneWeekAgo;
        }
        if(time === "monthly") return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
        if(time === "yearly") return eDate.getFullYear() === now.getFullYear();
        return true;
    });
    
    let allocatedExpense = 0;
    if(prod === "ALL") {
        allocatedExpense = filteredExpenses.reduce((a,c) => a + c.amount, 0);
    } else {
        let totalSystemSalesInPeriod = salesData.filter(s => {
            const sDate = new Date(s.date);
            if(time === "daily") return sDate.toDateString() === now.toDateString();
            if(time === "weekly") return sDate >= (new Date(now.getTime() - 7*24*60*60*1000));
            if(time === "monthly") return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
            if(time === "yearly") return sDate.getFullYear() === now.getFullYear();
            return true;
        }).reduce((a,c) => a + c.total, 0);
        
        let ratio = totalSystemSalesInPeriod > 0 ? (totalIncome / totalSystemSalesInPeriod) : 0;
        allocatedExpense = filteredExpenses.reduce((a,c) => a + c.amount, 0) * ratio;
    }

    let netProfit = totalIncome - totalProductionCost - totalReturnLoss - allocatedExpense;

    document.getElementById('f-sold-qty').textContent = totalSoldQty;
    document.getElementById('f-total-income').textContent = `රු. ${totalIncome.toFixed(2)}`;
    document.getElementById('f-return-qty').textContent = totalRetQty;
    document.getElementById('f-return-loss').textContent = `අලාභය: රු. ${totalReturnLoss.toFixed(2)}`;
    document.getElementById('f-total-outstanding').textContent = `රු. ${outstandingIncurred.toFixed(2)}`;
    
    const profitEl = document.getElementById('f-net-profit');
    profitEl.textContent = `රු. ${netProfit.toFixed(2)}`;
    profitEl.parentElement.style.background = netProfit >= 0 ? "linear-gradient(135deg, #43a047, #2e7d32)" : "linear-gradient(135deg, #d32f2f, #c62828)";

    calculateSmartInsights();
}

// --- CORE SMART INSIGHTS ENGINE ---
function calculateSmartInsights() {
    if(salesData.length === 0) return;
    
    let shopVolume = {};
    let productVolume = {};
    
    salesData.forEach(s => {
        shopVolume[s.shop] = (shopVolume[s.shop] || 0) + s.total;
        
        if(s.itemsList && Array.isArray(s.itemsList)) {
            s.itemsList.forEach(si => {
                productVolume[si.item] = (productVolume[si.item] || 0) + (si.qty - si.ret);
            });
        } else {
            productVolume[s.item] = (productVolume[s.item] || 0) + (s.qty - s.ret);
        }
    });
    
    let topShop = Object.keys(shopVolume).reduce((a, b) => shopVolume[a] > shopVolume[b] ? a : b, "--");
    let topProduct = Object.keys(productVolume).reduce((a, b) => productVolume[a] > productVolume[b] ? a : b, "--");
    
    document.getElementById('insight-top-shop').textContent = topShop !== "--" ? `${topShop} (රු. ${shopVolume[topShop].toFixed(2)})` : "--";
    document.getElementById('insight-top-product').textContent = topProduct !== "--" ? `${topProduct} (${productVolume[topProduct]} Qty)` : "--";

    const stock = calculateCurrentStock();
    const alertsContainer = document.getElementById('smart-alerts-container');
    alertsContainer.innerHTML = '';
    
    Object.keys(stock.remainingStock).forEach(item => {
        if(stock.remainingStock[item] <= 15) {
            alertsContainer.innerHTML += `<div class="alert-banner danger-alert">⚠️ හිඟ තොග අනතුරු ඇඟවීම: '${item}' තොගයේ ඇත්තේ ඒකක ${stock.remainingStock[item]} ක් පමණි! කරුණාකර නිෂ්පාදනය වැඩි කරන්න.</div>`;
        }
    });
}

// --- DYNAMIC STRATIFIED MONTHLY P&L MATRIX ---
function renderMonthlyPnL() {
    const tbody = document.getElementById('pnl-table-body');
    tbody.innerHTML = '';
    
    const targetProd = pnlProductFilterSelect.value;
    let monthlyMatrix = {};
    
    salesData.forEach(s => {
        const monthStr = s.date.substring(0, 7);
        
        if(!monthlyMatrix[monthStr]) monthlyMatrix[monthStr] = { sales: 0, prodCost: 0, retLoss: 0 };
        
        if(s.itemsList && Array.isArray(s.itemsList)) {
            s.itemsList.forEach(si => {
                if(targetProd !== "ALL" && si.item !== targetProd) return;
                monthlyMatrix[monthStr].sales += si.total;
                monthlyMatrix[monthStr].prodCost += ((si.qty - si.ret) * getUnitCost(si.item));
                monthlyMatrix[monthStr].retLoss += (si.ret * getUnitCost(si.item));
            });
        } else {
            if(targetProd !== "ALL" && s.item !== targetProd) return;
            monthlyMatrix[monthStr].sales += s.total;
            monthlyMatrix[monthStr].prodCost += ((s.qty - s.ret) * getUnitCost(s.item));
            monthlyMatrix[monthStr].retLoss += (s.ret * getUnitCost(s.item));
        }
    });

    let monthlyExpenses = {};
    expenses.forEach(e => {
        const monthStr = e.date.substring(0, 7);
        monthlyExpenses[monthStr] = (monthlyExpenses[monthStr] || 0) + e.amount;
    });

    const sortedMonths = Object.keys(monthlyMatrix).sort().reverse();
    
    if(sortedMonths.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">ප්‍රමාණවත් දත්ත නොමැත.</td></tr>`;
        return;
    }

    sortedMonths.forEach(m => {
        const data = monthlyMatrix[m];
        let expAllocated = 0;
        
        if(targetProd === "ALL") {
            expAllocated = monthlyExpenses[m] || 0;
        } else {
            let totalSalesInMonth = salesData.filter(x => x.date.substring(0,7) === m).reduce((a,c) => a + c.total, 0);
            let ratio = totalSalesInMonth > 0 ? (data.sales / totalSalesInMonth) : 0;
            expAllocated = (monthlyExpenses[m] || 0) * ratio;
        }
        
        let netProfit = data.sales - data.prodCost - data.retLoss - expAllocated;
        
        tbody.innerHTML += `
            <tr>
                <td><b>${m}</b></td>
                <td style="color:green; font-weight:bold;">රු. ${data.sales.toFixed(2)}</td>
                <td style="color:#795548;">රු. ${data.prodCost.toFixed(2)}</td>
                <td style="color:#616161;">රු. ${expAllocated.toFixed(2)}</td>
                <td style="color:red;">රු. ${data.retLoss.toFixed(2)}</td>
                <td style="font-weight:bold; background:${netProfit >= 0 ? '#e8f5e9':'#ffebee'}; color:${netProfit >= 0 ? 'green':'red'}">රු. ${netProfit.toFixed(2)}</td>
            </tr>`;
    });
}

// --- CLOUD TELEMETRY BRIDGE ---
window.exportToGoogleSheets = function(type) {
    if(GOOGLE_SHEETS_WEBAPP_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
        return alert("ℹ️ Cloud Sync සක්‍රීය කිරීමට කරුණාකර Apps Script URL එක සැකසුම් (script.js) තුලට ඇතුලත් කරන්න.");
    }
    
    let payload = type === 'sales' ? salesData : expenses;
    
    fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, data: payload })
    })
    .then(() => alert(`☁️ ${type === 'sales' ? 'විකුණුම් දත්ත':'වියදම් දත්ත'} සාර්ථකව Cloud ජාලය වෙත සමගාමී (Sync) කරන ලදී!`))
    .catch(err => alert("❌ සන්නිවේදන දෝෂයක්: " + err));
};
