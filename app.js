
document.getElementById('date').value=new Date().toISOString().split('T')[0];

function login(){
 if(username.value==='admin' && password.value==='1234'){
   loginScreen.classList.add('hidden');
   app.classList.remove('hidden');
 }
 else alert('Invalid Login');
}

function logout(){location.reload();}

function addSale(){
 let qty=Number(quantity.value||0);
 let price=Number(price.value||0);
 let total=qty*price;

 let row=`<tr><td>${date.value}</td><td>${product.value}</td><td>${shop.value}</td><td>${qty}</td><td>${total}</td></tr>`;
 document.querySelector('#salesTable tbody').insertAdjacentHTML('beforeend',row);

 document.getElementById('sales').textContent =
 Number(document.getElementById('sales').textContent)+total;

 document.getElementById('qty').textContent =
 Number(document.getElementById('qty').textContent)+qty;
}
