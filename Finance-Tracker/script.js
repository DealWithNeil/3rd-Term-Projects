const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const descriptionEl = document.getElementById("description");
const amountEl = document.getElementById("amount");
const transactionListEl = document.getElementById("transactionList");

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function updateValues() {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((acc, item) => acc + item, 0).toFixed(2);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0).toFixed(2);
    const expense = (amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0) * -1).toFixed(2);

    balanceEl.textContent = `$${total}`;
    incomeEl.textContent = `+$${income}`;
    expenseEl.textContent = `-$${expense}`;
}

function addTransactionToDOM(transaction) {
    const sign = transaction.amount > 0 ? "+" : "-";
    const li = document.createElement("li");
    li.classList.add(transaction.amount > 0 ? "income" : "expense");

    li.innerHTML = `
        ${transaction.description} <span>${sign}$${Math.abs(transaction.amount)}</span>
        <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
    `;

    transactionListEl.appendChild(li);
}

function updateDOM() {
    transactionListEl.innerHTML = "";
    transactions.forEach(addTransactionToDOM);
    updateValues();
}

function addTransaction() {
    if (descriptionEl.value.trim() === "" || amountEl.value.trim() === "") {
        alert("Please enter both description and amount.");
        return;
    }

    const transaction = {
        id: Date.now(),
        description: descriptionEl.value,
        amount: +amountEl.value
    };

    transactions.push(transaction);
    localStorage.setItem("transactions", JSON.stringify(transactions));

    descriptionEl.value = "";
    amountEl.value = "";

    updateDOM();
}

function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem("transactions", JSON.stringify(transactions));
    updateDOM();
}

document.getElementById("addTransaction").addEventListener("click", addTransaction);

updateDOM();
