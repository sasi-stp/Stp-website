// Global App Stores (පැරණි දත්ත ව්‍යුහය)
let appShops = [
    { name: "සිරිසඳ හෝටලය", phone: "0771234567", totalDebt: 15000, settled: 5000 },
    { name: "සිංහල වෙළඳසැල", phone: "0719876543", totalDebt: 0, settled: 0 },
    { name: "නිලන්ති ස්ටෝස්", phone: "0751112223", totalDebt: 32000, settled: 12000 }
];

let appStockHistory = [];

// Tab System
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-content'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-content');
    event.currentTarget.classList.add('active');
}

// 1. Shop List Edit Fix
function renderShopsList() {
    const listContainer = document.getElementById("shop-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    appShops.forEach((shop, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span><strong>${shop.name}</strong> (${shop.phone})</span>
            <div>
                <span class="edit-btn-icon" onclick="triggerEditShop('${index}')">✏️</span>
                <span class="delete-btn" onclick="deleteShop('${index}')">❌</span>
            </div>
        `;
        listContainer.appendChild(li);
    });
}

function triggerEditShop(index) {
    const shop = appShops[index];
    const newName = prompt("වෙළඳසැලේ නව නම ඇතුළත් කරන්න:", shop.name);
    if (newName && newName.trim() !== "") {
        appShops[index].name = newName.trim();
        alert("වෙළඳසැල් විස්තර සාර්ථකව යාවත්කාලීන කරන ලදී!");
        renderShopsList();
        renderLedgerTable();
    }
}

// 2. Ledger Sorting Fix (වැඩිම හිඟ ණය ඇති ඒවා උඩටම)
function renderLedgerTable() {
    const ledgerBody = document.getElementById("credit-ledger-body");
    if (!ledgerBody) return;
    ledgerBody.innerHTML = "";

    // හිඟ ණය ශේෂය අනුව descending අනුපිළිවෙලට sort කිරීම
    let sortedLedger = appShops.map((shop, index) => {
        return {
            originalIndex: index,
            name: shop.name,
            totalDebt: shop.totalDebt,
            settled: shop.settled,
            balance: shop.totalDebt - shop.settled
        };
    }).sort((a, b) => b.balance - a.balance);

    sortedLedger.forEach(shop => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${shop.name}</strong></td>
            <td>රු. ${shop.totalDebt.toFixed(2)}</td>
            <td>රු. ${shop.settled.toFixed(2)}</td>
            <td style="font-weight:bold; color: ${shop.balance > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">
                රු. ${shop.balance.toFixed(2)}
            </td>
        `;
        ledgerBody.appendChild(tr);
    });
}

// 3. Double Stock Bug & 5. Damaged Quantity Control Fix
function calculateStockFormTotals() {
    const prevInput = document.getElementById("stock-prev-bal");
    const qtyInput = document.getElementById("stock-qty");
    const damagedInput = document.getElementById("stock-damaged-qty");

    if (!prevInput || !qtyInput || !damagedInput) return;

    // සෘජු ප්‍රකාශන මඟින් දෙවරක් එකතු වීමේ දෝෂය (Double-counting) මුළුමනින්ම ඉවත් කර ඇත
    const prev = parseFloat(prevInput.value) || 0;
    const added = parseFloat(qtyInput.value) || 0;
    const damaged = parseFloat(damagedInput.value) || 0;

    // වත්මන් තොගය = පෙර ඉතිරිය + අලුත් තොගය - හානි වූ ප්‍රමාණය
    const finalTotal = prev + added - damaged;
    return { prev, added, damaged, finalTotal };
}

// 4. Previous Stock Manual Unlock 
function togglePrevStockLock() {
    const prevInput = document.getElementById("stock-prev-bal");
    const editBtn = document.getElementById("prev-stock-edit-btn");
    if (!prevInput) return;

    if (prevInput.hasAttribute("readonly")) {
        prevInput.removeAttribute("readonly");
        prevInput.style.background = "#ffffff";
        prevInput.focus();
        editBtn.innerText = "💾";
    } else {
        prevInput.setAttribute("readonly", "true");
        prevInput.style.background = "#e9ecef";
        editBtn.innerText = "✏️";
        // අතින් වෙනස් කළ පසු නැවත මුළු එකතුව ගණනය කිරීම
        calculateStockFormTotals();
    }
}

// 5. Save Stock with Damaged tracking inclusion
document.getElementById("stock-form")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const totals = calculateStockFormTotals();
    const itemSelect = document.getElementById("stock-item-select");
    const itemName = itemSelect ? itemSelect.value : "Default Item";
    const dateInput = document.getElementById("stock-date").value;

    appStockHistory.unshift({
        date: dateInput || new Date().toISOString().split('T')[0],
        item: itemName,
        prev: totals.prev,
        added: totals.added,
        damaged: totals.damaged,
        total: totals.finalTotal
    });

    alert("තොග ඇතුළත් කිරීම සාර්ථකයි!");
    
    // Reset Form fields
    document.getElementById("stock-qty").value = "0";
    document.getElementById("stock-damaged-qty").value = "0";
    document.getElementById("stock-prev-bal").value = totals.finalTotal; // වත්මන් මුළු එකතුව මීළඟ පෙර ඉතිරිය වේ.
    
    renderStockHistory();
});

function renderStockHistory() {
    const historyBody = document.getElementById("stock-history-table-body");
    if (!historyBody) return;
    historyBody.innerHTML = "";

    appStockHistory.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.item}</td>
            <td>${row.prev}</td>
            <td>${row.added}</td>
            <td style="color:var(--danger-color); font-weight:bold;">${row.damaged}</td>
            <td style="color:var(--success-color); font-weight:bold;">${row.total}</td>
        `;
        historyBody.appendChild(tr);
    });
}

// Init Setup
document.addEventListener("DOMContentLoaded", () => {
    renderShopsList();
    renderLedgerTable();
    
    // Live Event Listeners for Stock Bug prevention
    document.getElementById("stock-qty")?.addEventListener("input", calculateStockFormTotals);
    document.getElementById("stock-damaged-qty")?.addEventListener("input", calculateStockFormTotals);
});
