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

// --- LOGIN ---
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
    filterShopSelect.innerHTML = ''; // Analytics එකට අදාළ dropdown එක
    shopListUI.innerHTML = '';

    // Analytics එකට "සියලුම කඩවල්" (All Shops) කියන option එකත් දාමු
    let allOption = document.createElement('option');
    allOption.value = "ALL";
    allOption.textContent = "== සියලුම කඩවල් (All) ==";
    filterShopSelect.appendChild(allOption);

    shops.forEach((shop, index) => {
        // Form Select
        let option = document.createElement('option');
        option.value = shop; option.textContent = shop;
        shopSelect.appendChild(option);

        // Filter Dashboard Select
        let filterOption = option.cloneNode(true);
        filterShopSelect.appendChild(filterOption);

        // Sidebar List
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
    
    // Dot (Radio Button) එකෙන් Cash ද Credit ද කියලා ගන්නවා
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
        payMode: payMode, // Cash / Credit
        returnLoss: retQty * unitPrice, // Return එක නිසා සිදු වූ අලාභය
        total: netQty * unitPrice
    };

    if(!record.shop) {
        alert("කරුණාකර කඩයක් ඇතුළත් කරන්න!");
        return;
    }

    salesData.push(record);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    
    renderSalesTable();
    updateFilteredAnalytics();
    
    quantityInput.value = 1;
    returnQuantityInput.value = 0;
    updateLiveTotal();
});

function renderSalesTable() {
    salesTableBody.innerHTML = '';
    salesData.forEach(row => {
        let tr = document.createElement('tr');
        // ණය ගනුදෙනු රතු පාටින් පෙන්වීමට
        const modeBadge = row.payMode === 'Credit' ? `<span style="color:orange; font-weight:bold;">ණය (Credit)</span>` : `මුදල් (Cash)`;
        
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.shop}</td>
            <td>${row.item}</td>
            <td>${row.qty}</td>
            <td style="color:red; font-weight:bold;">${row.retQty}</td>
            <td>${row.netQty}</td>
            <td>${modeBadge}</td>
            <td>${row.unitPrice.toFixed(2)}</td>
            <td><b>${row.total.toFixed(2)}</b></td>
            <td><span class="delete-btn" onclick="deleteRecord(${row.id})">🗑️</span></td>
        `;
        salesTableBody.appendChild(tr);
    });
}

window.deleteRecord = function(id) {
    salesData = salesData.filter(item => item.id !== id);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    renderSalesTable();
    updateFilteredAnalytics();
};

// --- DYNAMIC ADVANCED ANALYTICS FILTER ---
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

        // 1. Check Shop Filter
        if (targetShop !== "ALL" && item.shop !== targetShop) {
            return; // Skip if shop doesn't match
        }

        // 2. Check Time Filter
        let timeMatch = false;
        if (timePeriod === "daily" && itemDateStr === todayStr) timeMatch = true;
        else if (timePeriod === "weekly" && itemDate >= oneWeekAgo && itemDate <= now) timeMatch = true;
        else if (timePeriod === "monthly" && itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) timeMatch = true;
        else if (timePeriod === "yearly" && itemDate.getFullYear() === currentYear) timeMatch = true;

        if (!timeMatch) return; // Skip if date doesn't match

        // 3. Aggregate Data
        soldQty += item.netQty; // ඇත්තටම විකුණුම් ප්‍රමාණය
        totalIncome += item.total; // ශුද්ධ ආදායම
        returnQty += item.retQty; // රිටන් ප්‍රමාණය
        returnLoss += item.returnLoss; // රිටන් අලාභය
    });

    // Update Dashboard UI
    document.getElementById('f-sold-qty').textContent = soldQty;
    document.getElementById('f-total-income').textContent = `රු. ${totalIncome.toFixed(2)}`;
    document.getElementById('f-return-qty').textContent = returnQty;
    document.getElementById('f-return-loss').textContent = `රු. ${returnLoss.toFixed(2)}`;
}

// Event Listeners for Dashboard Dropdowns
filterShopSelect.addEventListener('change', updateFilteredAnalytics);
filterTimeSelect.addEventListener('change', updateFilteredAnalytics);

// --- EXCEL EXPORT (With Payment Method & Return Loss) ---
exportBtn.addEventListener('click', () => {
    if(salesData.length === 0) {
        alert("බාගත කිරීමට දත්ත නැත!");
        return;
    }

    const excelRows = salesData.map(item => ({
        "දිනය (Date)": item.date,
        "කඩේ නම (Shop)": item.shop,
        "වර්ගය (Item)": item.item,
        "දැමූ ප්‍රමාණය (Qty)": item.qty,
        "Return ප්‍රමාණය": item.retQty,
        "විකිණුම් ප්‍රමාණය (Net Qty)": item.netQty,
        "ගනුදෙනු වර්ගය (Mode)": item.payMode,
        "ඒකක මිල (Unit Price)": item.unitPrice,
        "Return අලාභය (Loss)": item.returnLoss,
        "මුළු ශුද්ධ ආදායම (Total)": item.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Advanced Sales Log");
    XLSX.writeFile(workbook, `Business_Advanced_Report.xlsx`);
});    });
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

// --- DATA SAVE & TABLE RENDER ---
salesForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const item = itemTypeSelect.value;
    const qty = parseInt(quantityInput.value);
    const retQty = parseInt(returnQuantityInput.value) || 0;
    const unitPrice = getUnitPrice(item);
    const netQty = Math.max(0, qty - retQty);

    const record = {
        id: Date.now(),
        date: salesDateInput.value,
        shop: shopSelect.value,
        item: item,
        qty: qty,
        retQty: retQty,
        netQty: netQty,
        unitPrice: unitPrice,
        total: netQty * unitPrice
    };

    if(!record.shop) {
        alert("කරුණාකර කඩයක් තෝරන්න!");
        return;
    }

    salesData.push(record);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    
    renderSalesTable();
    calculateSummaries();
    
    // Reset inputs
    quantityInput.value = 1;
    returnQuantityInput.value = 0;
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
            <td><span style="color:red; font-weight:bold;">${row.retQty}</span></td>
            <td>${row.netQty}</td>
            <td>${row.unitPrice.toFixed(2)}</td>
            <td><b>${row.total.toFixed(2)}</b></td>
            <td><span class="delete-btn" onclick="deleteRecord(${row.id})">🗑️</span></td>
        `;
        salesTableBody.appendChild(tr);
    });
}

window.deleteRecord = function(id) {
    salesData = salesData.filter(item => item.id !== id);
    localStorage.setItem('watalappan_sales', JSON.stringify(salesData));
    renderSalesTable();
    calculateSummaries();
};

// --- DASHBOARD SUMMARY LOGIC (Daily, Weekly, Monthly, Yearly) ---
function calculateSummaries() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // සතියේ ආරම්භය ලබාගැනීම (පසුගිය ඉරිදා හෝ සදුදා සිට දින 7)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    let stats = {
        daily: { income: 0, qty: 0, ret: 0 },
        weekly: { income: 0, qty: 0, ret: 0 },
        monthly: { income: 0, qty: 0, ret: 0 },
        yearly: { income: 0, qty: 0, ret: 0 }
    };

    salesData.forEach(item => {
        const itemDate = new Date(item.date);
        const itemDateStr = item.date;

        // Daily
        if (itemDateStr === todayStr) {
            stats.daily.income += item.total;
            stats.daily.qty += item.qty;
            stats.daily.ret += item.retQty;
        }
        // Weekly (පසුගිය දින 7 ඇතුළත)
        if (itemDate >= oneWeekAgo && itemDate <= now) {
            stats.weekly.income += item.total;
            stats.weekly.qty += item.qty;
            stats.weekly.ret += item.retQty;
        }
        // Monthly
        if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
            stats.monthly.income += item.total;
            stats.monthly.qty += item.qty;
            stats.monthly.ret += item.retQty;
        }
        // Yearly
        if (itemDate.getFullYear() === currentYear) {
            stats.yearly.income += item.total;
            stats.yearly.qty += item.qty;
            stats.yearly.ret += item.retQty;
        }
    });

    // UI එකට දත්ත යාවත්කාලීන කිරීම
    document.getElementById('sum-daily-income').textContent = `රු. ${stats.daily.income.toFixed(2)}`;
    document.getElementById('sum-daily-qty').textContent = `විකුණුම්: ${stats.daily.qty} | Return: ${stats.daily.ret}`;

    document.getElementById('sum-weekly-income').textContent = `රු. ${stats.weekly.income.toFixed(2)}`;
    document.getElementById('sum-weekly-qty').textContent = `විකුණුම්: ${stats.weekly.qty} | Return: ${stats.weekly.ret}`;

    document.getElementById('sum-monthly-income').textContent = `රු. ${stats.monthly.income.toFixed(2)}`;
    document.getElementById('sum-monthly-qty').textContent = `විකුණුම්: ${stats.monthly.qty} | Return: ${stats.monthly.ret}`;

    document.getElementById('sum-yearly-income').textContent = `රු. ${stats.yearly.income.toFixed(2)}`;
    document.getElementById('sum-yearly-qty').textContent = `විකුණුම්: ${stats.yearly.qty} | Return: ${stats.yearly.ret}`;
}

// --- EXCEL DOWNLOAD (With Return Data) ---
exportBtn.addEventListener('click', () => {
    if(salesData.length === 0) {
        alert("බාගත කිරීමට දත්ත නැත!");
        return;
    }

    const excelRows = salesData.map(item => ({
        "දිනය (Date)": item.date,
        "කඩේ නම (Shop Name)": item.shop,
        "වර්ගය (Item)": item.item,
        "දැමූ ප්‍රමාණය (Total Qty)": item.qty,
        "ආපසු ආ ප්‍රමාණය (Return Qty)": item.retQty,
        "ඇත්තටම විකුණුම් ප්‍රමාණය (Net Qty)": item.netQty,
        "ඒකක මිල (Unit Price)": item.unitPrice,
        "මුළු ශුද්ධ ආදායම (Net Total)": item.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Dashboard");

    XLSX.writeFile(workbook, `Watalappan_Business_Report.xlsx`);
});
