// ===== গ্লোবাল ভ্যারিয়েবল =====
let db;
let currentUser = null;
const PRICES = {
    'চা': 5,
    'দুধ চা': 10,
    'রয়েল': 7,
    'লাকি': 12,
    'কলা': 8,
    'সিগারেট': 15,
    'পান': 10,
    'অন্যান্য': 0
};

// ===== DOM লোড হওয়ার পর =====
document.addEventListener('DOMContentLoaded', function() {
    // লোডিং স্ক্রিন 2 সেকেন্ড পর হাইড করুন
    setTimeout(() => {
        document.getElementById('loadingScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 500);
    }, 2000);
    
    // IndexedDB সেট আপ
    initDatabase();
    
    // ইভেন্ট লিসেনার সেট আপ
    setupEventListeners();
    
    // সেশন চেক করুন
    checkSession();
    
    // দাম আপডেট করুন
    updatePrice();
});

// ===== ডাটাবেস ইনিশিয়ালাইজেশন =====
function initDatabase() {
    const request = indexedDB.open('TeaShopDB', 2);
    
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        
        // ব্যবহারকারীদের জন্য অবজেক্ট স্টোর
        if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'email' });
            userStore.createIndex('name', 'name', { unique: false });
        }
        
        // লেনদেনের জন্য আলাদা অবজেক্ট স্টোর (স্কেলেবিলিটির জন্য)
        if (!db.objectStoreNames.contains('transactions')) {
            const transactionStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
            transactionStore.createIndex('userEmail', 'userEmail', { unique: false });
            transactionStore.createIndex('date', 'date', { unique: false });
        }
    };
    
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('ডাটাবেস সফলভাবে খোলা হয়েছে');
        
        // ব্যবহারকারীদের লোড করুন
        loadUserList();
    };
    
    request.onerror = function(event) {
        console.error('ডাটাবেস ত্রুটি:', event.target.error);
        showNotification('ডাটাবেস ত্রুটি!', 'আপনার ব্রাউজার IndexedDB সাপোর্ট করে না।', 'error');
    };
}

// ===== ইভেন্ট লিসেনার সেটআপ =====
function setupEventListeners() {
    // লগইন ফর্ম
    document.getElementById('loginFormElement').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });
    
    // রেজিস্টার ফর্ম
    document.getElementById('registerFormElement').addEventListener('submit', function(e) {
        e.preventDefault();
        register();
    });
    
    // এন্ট্রি ফর্ম
    document.getElementById('entryForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addEntry();
    });
    
    // আইটেম সিলেক্ট চেঞ্জ
    document.getElementById('item').addEventListener('change', function() {
        updatePrice();
        toggleCustomFields();
    });
    
    // পরিমাণ ইনপুট চেঞ্জ
    document.getElementById('quantity').addEventListener('input', updateTotalPrice);
    
    // পেমেন্ট স্ট্যাটাস চেঞ্জ
    document.getElementById('paymentStatus').addEventListener('change', updateDueAmount);
    
    // পরিশোধিত টাকা চেঞ্জ
    document.getElementById('paidAmount').addEventListener('input', updateDueAmount);
    
    // কাস্টম প্রাইস চেঞ্জ
    document.getElementById('customPrice').addEventListener('input', updateCustomPrice);
}

// ===== সেশন চেক =====
function checkSession() {
    const userEmail = sessionStorage.getItem('user');
    if (userEmail) {
        loadUser(userEmail);
    }
}

// ===== ট্যাব সুইচ =====
function switchTab(tab) {
    // ট্যাব বাটন আপডেট
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.remove('active');
    
    // ট্যাব কন্টেন্ট আপডেট
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.remove('active');
    
    if (tab === 'login') {
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.getElementById('registerTab').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

// ===== পাসওয়ার্ড টগল =====
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggleIcon = input.parentNode.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// ===== রেজিস্টার ফাংশন =====
function register() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // ভ্যালিডেশন
    if (!name || !email || !password) {
        showNotification('তথ্য অসম্পূর্ণ!', 'সব ফিল্ড পূরণ করুন।', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('পাসওয়ার্ড মিলছে না!', 'পাসওয়ার্ড নিশ্চিতকরণ মিলছে না।', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('দুর্বল পাসওয়ার্ড!', 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।', 'error');
        return;
    }
    
    const transaction = db.transaction(['users'], 'readwrite');
    const userStore = transaction.objectStore('users');
    
    // প্রথমে চেক করুন ইমেইল আছে কিনা
    const checkRequest = userStore.get(email);
    
    checkRequest.onsuccess = function() {
        if (checkRequest.result) {
            showNotification('ইমেইল বিদ্যমান!', 'এই ইমেইল দিয়ে ইতিমধ্যে রেজিস্টার করা হয়েছে।', 'error');
            return;
        }
        
        // নতুন ইউজার তৈরি করুন
        const newUser = {
            name: name,
            email: email,
            password: password,
            avatarColor: getRandomColor(),
            joinDate: new Date().toISOString(),
            ledger: []
        };
        
        const addRequest = userStore.add(newUser);
        
        addRequest.onsuccess = function() {
            showNotification('সফল রেজিস্টার!', `${name}, আপনার একাউন্ট সফলভাবে তৈরি হয়েছে।`, 'success');
            
            // ফর্ম রিসেট
            document.getElementById('registerFormElement').reset();
            
            // লগইন ট্যাবে সুইচ করুন
            switchTab('login');
            
            // ব্যবহারকারী তালিকা আপডেট করুন
            loadUserList();
        };
        
        addRequest.onerror = function() {
            showNotification('রেজিস্টার ব্যর্থ!', 'একাউন্ট তৈরি করতে সমস্যা হচ্ছে।', 'error');
        };
    };
}

// ===== লগইন ফাংশন =====
function login() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('তথ্য অসম্পূর্ণ!', 'ইমেইল ও পাসওয়ার্ড দিন।', 'error');
        return;
    }
    
    const transaction = db.transaction(['users'], 'readonly');
    const userStore = transaction.objectStore('users');
    const request = userStore.get(email);
    
    request.onsuccess = function() {
        const user = request.result;
        
        if (!user || user.password !== password) {
            showNotification('লগইন ব্যর্থ!', 'ভুল ইমেইল বা পাসওয়ার্ড।', 'error');
            return;
        }
        
        // সেশন স্টোরেজে সেভ করুন
        sessionStorage.setItem('user', user.email);
        
        // ইউজার লোড করুন
        loadUser(user.email);
        
        showNotification('লগইন সফল!', `${user.name}, স্বাগতম!`, 'success');
    };
    
    request.onerror = function() {
        showNotification('ডাটাবেস ত্রুটি!', 'লগইন প্রক্রিয়ায় সমস্যা।', 'error');
    };
}

// ===== ব্যবহারকারী লোড =====
function loadUser(email) {
    const transaction = db.transaction(['users'], 'readonly');
    const userStore = transaction.objectStore('users');
    const request = userStore.get(email);
    
    request.onsuccess = function() {
        currentUser = request.result;
        
        if (!currentUser) {
            sessionStorage.removeItem('user');
            return;
        }
        
        // অ্যাপ দেখান
        showApp();
        
        // ব্যবহারকারীর তথ্য আপডেট করুন
        updateUserInfo();
        
        // ড্যাশবোর্ড আপডেট করুন
        updateDashboard();
        
        // হিসাব বই আপডেট করুন
        renderLedger();
        
        // বন্ধুদের তালিকা আপডেট করুন
        loadFriendsList();
    };
}

// ===== অ্যাপ দেখান =====
function showApp() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('appPage').classList.remove('hidden');
    
    // ডিফল্ট সেকশন দেখান
    showSection('home');
}

// ===== সেকশন দেখান =====
function showSection(sectionId) {
    // সব সেকশন লুকান
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // নির্বাচিত সেকশন দেখান
    document.getElementById(sectionId + 'Section').classList.add('active');
    
    // নেভিগেশন বাটন আপডেট করুন
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // সক্রিয় নেভ বাটন সেট করুন
    let activeNavButton;
    switch(sectionId) {
        case 'home': activeNavButton = navButtons[0]; break;
        case 'addEntry': activeNavButton = navButtons[1]; break;
        case 'ledger': activeNavButton = navButtons[2]; break;
        case 'friends': activeNavButton = navButtons[3]; break;
        case 'profile': activeNavButton = navButtons[4]; break;
    }
    
    if (activeNavButton) {
        activeNavButton.classList.add('active');
    }
    
    // নির্দিষ্ট সেকশনের জন্য অতিরিক্ত কাজ
    if (sectionId === 'profile') {
        updateProfileSection();
    }
}

// ===== ব্যবহারকারীর তথ্য আপডেট =====
function updateUserInfo() {
    if (!currentUser) return;
    
    // নাম আপডেট
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('welcomeName').textContent = currentUser.name;
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileNameInput').value = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    
    // সদস্য তারিখ
    const joinDate = new Date(currentUser.joinDate);
    document.getElementById('memberSince').textContent = joinDate.toLocaleDateString('bn-BD');
    
    // অ্যাভাটার রঙ
    const avatarColor = currentUser.avatarColor || getRandomColor();
    document.getElementById('userAvatar').style.backgroundColor = avatarColor;
    document.getElementById('profileAvatar').style.backgroundColor = avatarColor;
    
    // প্রোফাইল সেকশনে রঙ সিলেক্ট করুন
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.style.backgroundColor === rgbToHex(avatarColor)) {
            option.classList.add('selected');
        }
    });
}

// ===== ড্যাশবোর্ড আপডেট =====
function updateDashboard() {
    if (!currentUser || !currentUser.ledger) return;
    
    const today = new Date().toLocaleDateString('bn-BD');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    let todayExpense = 0;
    let monthExpense = 0;
    let totalDue = 0;
    let totalEntries = currentUser.ledger.length;
    
    currentUser.ledger.forEach(entry => {
        // আজকের খরচ
        if (entry.date === today) {
            todayExpense += entry.amount;
        }
        
        // এই মাসের খরচ
        const entryDate = new Date(entry.timestamp || entry.date);
        if (entryDate.getMonth() + 1 === currentMonth && entryDate.getFullYear() === currentYear) {
            monthExpense += entry.amount;
        }
        
        // মোট বাকি
        if (entry.paymentStatus === 'due' || entry.paymentStatus === 'partial') {
            totalDue += entry.dueAmount || (entry.amount - (entry.paidAmount || 0));
        }
    });
    
    // ড্যাশবোর্ড আপডেট
    document.getElementById('todayExpense').textContent = todayExpense + ' টাকা';
    document.getElementById('monthExpense').textContent = monthExpense + ' টাকা';
    document.getElementById('totalEntries').textContent = totalEntries;
    document.getElementById('totalDue').textContent = totalDue + ' টাকা';
    
    // সাম্প্রতিক লেনদেন আপডেট
    updateRecentTransactions();
}

// ===== সাম্প্রতিক লেনদেন আপডেট =====
function updateRecentTransactions() {
    if (!currentUser || !currentUser.ledger) return;
    
    const transactionsList = document.getElementById('recentTransactions');
    
    // সর্বশেষ ৫টি লেনদেন
    const recentTransactions = [...currentUser.ledger]
        .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
        .slice(0, 5);
    
    if (recentTransactions.length === 0) {
        transactionsList.innerHTML = '<p class="empty-message">এখনো কোনো লেনদেন নেই। প্রথম লেনদেন যোগ করুন!</p>';
        return;
    }
    
    let transactionsHTML = '';
    
    recentTransactions.forEach(transaction => {
        const itemIcon = getItemIcon(transaction.item);
        const statusClass = `status-${transaction.paymentStatus}`;
        const statusText = getStatusText(transaction.paymentStatus);
        
        transactionsHTML += `
            <div class="transaction-item">
                <div class="transaction-left">
                    <div class="transaction-icon" style="background-color: ${getItemColor(transaction.item)}">
                        <i class="${itemIcon}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.item}</h4>
                        <p>${transaction.date} • ${transaction.quantity || 1}টি</p>
                    </div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount">${transaction.amount} টাকা</div>
                    <div class="transaction-status ${statusClass}">${statusText}</div>
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = transactionsHTML;
}

// ===== দ্রুত যোগ করুন =====
function quickAdd(item, quantity) {
    document.getElementById('item').value = item;
    document.getElementById('quantity').value = quantity;
    updatePrice();
    
    // এন্ট্রি সেকশনে যান
    showSection('addEntry');
    
    // ফোকাস দিন
    setTimeout(() => {
        document.getElementById('paymentStatus').focus();
    }, 300);
    
    showNotification('দ্রুত যোগ', `${quantity}টি ${item} নির্বাচিত হয়েছে`, 'info');
}

// ===== মূল্য আপডেট =====
function updatePrice() {
    const item = document.getElementById('item').value;
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    let price = PRICES[item] || 0;
    
    // কাস্টম আইটেম হলে
    if (item === 'অন্যান্য') {
        const customPrice = parseFloat(document.getElementById('customPrice').value) || 0;
        price = customPrice;
    }
    
    document.getElementById('price').value = price;
    updateTotalPrice();
}

// ===== কাস্টম ফিল্ড টগল =====
function toggleCustomFields() {
    const item = document.getElementById('item').value;
    const isCustom = item === 'অন্যান্য';
    
    // লেবেল টগল
    document.getElementById('customItemLabel').classList.toggle('hidden', !isCustom);
    document.getElementById('customPriceLabel').classList.toggle('hidden', !isCustom);
    
    // ইনপুট টগল
    document.getElementById('customItem').classList.toggle('hidden', !isCustom);
    document.getElementById('customPrice').classList.toggle('hidden', !isCustom);
    
    // কাস্টম না হলে মান রিসেট করুন
    if (!isCustom) {
        document.getElementById('customItem').value = '';
        document.getElementById('customPrice').value = '';
    }
}

// ===== মোট মূল্য আপডেট =====
function updateTotalPrice() {
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const totalPrice = quantity * price;
    
    document.getElementById('totalPrice').value = totalPrice;
    updateDueAmount();
}

// ===== কাস্টম মূল্য আপডেট =====
function updateCustomPrice() {
    const customPrice = parseFloat(document.getElementById('customPrice').value) || 0;
    document.getElementById('price').value = customPrice;
    updateTotalPrice();
}

// ===== বাকি টাকা আপডেট =====
function updateDueAmount() {
    const totalPrice = parseFloat(document.getElementById('totalPrice').value) || 0;
    const paymentStatus = document.getElementById('paymentStatus').value;
    let paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    
    // পেমেন্ট স্ট্যাটাস অনুযায়ী
    if (paymentStatus === 'paid') {
        paidAmount = totalPrice;
        document.getElementById('paidAmount').value = totalPrice;
    } else if (paymentStatus === 'due') {
        paidAmount = 0;
        document.getElementById('paidAmount').value = 0;
    }
    
    // পেইড অ্যামাউন্ট টোটালের বেশি হতে পারবে না
    if (paidAmount > totalPrice) {
        paidAmount = totalPrice;
        document.getElementById('paidAmount').value = totalPrice;
    }
    
    const dueAmount = totalPrice - paidAmount;
    document.getElementById('dueAmount').value = dueAmount;
}

// ===== পরিমাণ পরিবর্তন =====
function changeQuantity(change) {
    const quantityInput = document.getElementById('quantity');
    let quantity = parseInt(quantityInput.value) || 1;
    
    quantity += change;
    
    if (quantity < 1) quantity = 1;
    if (quantity > 100) quantity = 100;
    
    quantityInput.value = quantity;
    updateTotalPrice();
}

// ===== এন্ট্রি যোগ করুন =====
function addEntry() {
    if (!currentUser) {
        showNotification('লগইন প্রয়োজন!', 'দয়া করে প্রথমে লগইন করুন।', 'error');
        return;
    }
    
    const item = document.getElementById('item').value;
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const totalPrice = parseFloat(document.getElementById('totalPrice').value) || 0;
    const paymentStatus = document.getElementById('paymentStatus').value;
    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    const dueAmount = parseFloat(document.getElementById('dueAmount').value) || 0;
    const notes = document.getElementById('notes').value.trim();
    
    // ভ্যালিডেশন
    if (!item) {
        showNotification('আইটেম প্রয়োজন!', 'দয়া করে একটি আইটেম নির্বাচন করুন।', 'error');
        return;
    }
    
    if (item === 'অন্যান্য' && !document.getElementById('customItem').value.trim()) {
        showNotification('কাস্টম আইটেম প্রয়োজন!', 'দয়া করে কাস্টম আইটেমের নাম দিন।', 'error');
        return;
    }
    
    // এন্ট্রি অবজেক্ট তৈরি করুন
    const entry = {
        id: Date.now(), // ইউনিক আইডি
        userEmail: currentUser.email,
        item: item === 'অন্যান্য' ? document.getElementById('customItem').value.trim() : item,
        quantity: quantity,
        unitPrice: price,
        amount: totalPrice,
        paymentStatus: paymentStatus,
        paidAmount: paidAmount,
        dueAmount: dueAmount,
        notes: notes,
        date: new Date().toLocaleDateString('bn-BD'),
        timestamp: new Date().toISOString()
    };
    
    // IndexedDB-তে সেভ করুন
    const transaction = db.transaction(['users', 'transactions'], 'readwrite');
    const userStore = transaction.objectStore('users');
    const transactionStore = transaction.objectStore('transactions');
    
    // ইউজারের লেজারে যোগ করুন
    currentUser.ledger.push(entry);
    
    const updateUserRequest = userStore.put(currentUser);
    
    updateUserRequest.onsuccess = function() {
        // আলাদা ট্রানজেকশন স্টোরেও সেভ করুন
        transactionStore.add(entry);
        
        showNotification('এন্ট্রি সংরক্ষিত!', `${entry.item} সফলভাবে যোগ করা হয়েছে।`, 'success');
        
        // ফর্ম রিসেট
        resetEntryForm();
        
        // ড্যাশবোর্ড ও লেজার আপডেট
        updateDashboard();
        renderLedger();
        
        // হোম সেকশনে ফিরে যান
        showSection('home');
    };
    
    updateUserRequest.onerror = function() {
        showNotification('সংরক্ষণ ব্যর্থ!', 'এন্ট্রি সংরক্ষণ করতে সমস্যা হচ্ছে।', 'error');
    };
}

// ===== এন্ট্রি ফর্ম রিসেট =====
function resetEntryForm() {
    document.getElementById('entryForm').reset();
    document.getElementById('item').value = '';
    document.getElementById('quantity').value = 1;
    document.getElementById('price').value = 5;
    document.getElementById('totalPrice').value = 5;
    document.getElementById('paymentStatus').value = 'due';
    document.getElementById('paidAmount').value = 0;
    document.getElementById('dueAmount').value = 5;
    document.getElementById('notes').value = '';
    
    // কাস্টম ফিল্ড লুকান
    toggleCustomFields();
}

// ===== লেজার রেন্ডার =====
function renderLedger(filter = 'all') {
    if (!currentUser || !currentUser.ledger) return;
    
    let filteredLedger = [...currentUser.ledger];
    const today = new Date().toLocaleDateString('bn-BD');
    
    // ফিল্টার প্রয়োগ করুন
    if (filter === 'today') {
        filteredLedger = filteredLedger.filter(entry => entry.date === today);
    } else if (filter === 'due') {
        filteredLedger = filteredLedger.filter(entry => 
            entry.paymentStatus === 'due' || entry.paymentStatus === 'partial'
        );
    }
    
    // তারিখ অনুসারে সাজান (নতুন থেকে পুরাতন)
    filteredLedger.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
    
    // সারি তৈরি করুন
    const ledgerRows = document.getElementById('ledgerRows');
    
    if (filteredLedger.length === 0) {
        ledgerRows.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">কোনো এন্ট্রি পাওয়া যায়নি। প্রথম এন্ট্রি যোগ করুন!</td>
            </tr>
        `;
        
        // সামারি আপডেট
        updateLedgerSummary([]);
        return;
    }
    
    let rowsHTML = '';
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;
    
    filteredLedger.forEach(entry => {
        const statusClass = `status-${entry.paymentStatus}`;
        const statusText = getStatusText(entry.paymentStatus);
        const itemIcon = getItemIcon(entry.item);
        
        totalAmount += entry.amount;
        totalPaid += entry.paidAmount || 0;
        totalDue += entry.dueAmount || (entry.amount - (entry.paidAmount || 0));
        
        rowsHTML += `
            <tr>
                <td>${entry.date}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="action-btn" style="background-color: ${getItemColor(entry.item)}; color: white;">
                            <i class="${itemIcon}"></i>
                        </div>
                        ${entry.item}
                    </div>
                </td>
                <td>${entry.quantity || 1}টি</td>
                <td>${entry.amount} টাকা</td>
                <td>${entry.paidAmount || 0} টাকা</td>
                <td>${entry.dueAmount || (entry.amount - (entry.paidAmount || 0))} টাকা</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="editEntry(${entry.id})" title="এডিট">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="deleteEntry(${entry.id})" title="ডিলিট">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    ledgerRows.innerHTML = rowsHTML;
    
    // সামারি আপডেট
    updateLedgerSummary(filteredLedger);
}

// ===== লেজার সামারি আপডেট =====
function updateLedgerSummary(ledger) {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;
    
    ledger.forEach(entry => {
        totalAmount += entry.amount;
        totalPaid += entry.paidAmount || 0;
        totalDue += entry.dueAmount || (entry.amount - (entry.paidAmount || 0));
    });
    
    document.getElementById('ledgerTotal').textContent = totalAmount + ' টাকা';
    document.getElementById('ledgerPaid').textContent = totalPaid + ' টাকা';
    document.getElementById('ledgerDue').textContent = totalDue + ' টাকা';
    document.getElementById('ledgerEntries').textContent = ledger.length;
}

// ===== লেজার ফিল্টার =====
function filterLedger(filterType) {
    renderLedger(filterType);
    
    // বাটন স্টাইল আপডেট
    const buttons = document.querySelectorAll('.ledger-actions button');
    buttons.forEach(button => button.classList.remove('active'));
    
    // সক্রিয় বাটন হাইলাইট করুন
    let activeButton;
    switch(filterType) {
        case 'all': activeButton = buttons[0]; break;
        case 'today': activeButton = buttons[1]; break;
        case 'due': activeButton = buttons[2]; break;
    }
    
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// ===== এন্ট্রি এডিট =====
function editEntry(entryId) {
    if (!currentUser || !currentUser.ledger) return;
    
    const entry = currentUser.ledger.find(e => e.id === entryId);
    if (!entry) return;
    
    // এডিট মোডে যান
    showSection('addEntry');
    
    // ফর্ম পূরণ করুন
    setTimeout(() => {
        // আইটেম সেট করুন
        const itemSelect = document.getElementById('item');
        const isCustom = !PRICES.hasOwnProperty(entry.item);
        
        if (isCustom) {
            itemSelect.value = 'অন্যান্য';
            document.getElementById('customItem').value = entry.item;
            document.getElementById('customPrice').value = entry.unitPrice;
        } else {
            itemSelect.value = entry.item;
        }
        
        // অন্যান্য ফিল্ড
        document.getElementById('quantity').value = entry.quantity || 1;
        document.getElementById('paymentStatus').value = entry.paymentStatus;
        document.getElementById('paidAmount').value = entry.paidAmount || 0;
        document.getElementById('notes').value = entry.notes || '';
        
        // কাস্টম ফিল্ড টগল
        toggleCustomFields();
        
        // মূল্য আপডেট
        updatePrice();
        
        showNotification('এডিট মোড', `${entry.item} এন্ট্রি এডিট করতে প্রস্তুত`, 'info');
    }, 300);
}

// ===== এন্ট্রি ডিলিট =====
function deleteEntry(entryId) {
    if (!confirm('আপনি কি এই এন্ট্রি ডিলিট করতে চান? এই কাজটি বিপরীতমুখী নয়।')) {
        return;
    }
    
    if (!currentUser || !currentUser.ledger) return;
    
    // লেজার থেকে রিমুভ করুন
    const entryIndex = currentUser.ledger.findIndex(e => e.id === entryId);
    if (entryIndex === -1) return;
    
    const deletedEntry = currentUser.ledger[entryIndex];
    currentUser.ledger.splice(entryIndex, 1);
    
    // IndexedDB-তে আপডেট করুন
    const transaction = db.transaction(['users', 'transactions'], 'readwrite');
    const userStore = transaction.objectStore('users');
    const transactionStore = transaction.objectStore('transactions');
    
    // ইউজার আপডেট
    const updateUserRequest = userStore.put(currentUser);
    
    updateUserRequest.onsuccess = function() {
        // ট্রানজেকশন স্টোর থেকে ডিলিট
        transactionStore.delete(entryId);
        
        showNotification('এন্ট্রি ডিলিট', `${deletedEntry.item} এন্ট্রি ডিলিট করা হয়েছে`, 'success');
        
        // UI আপডেট
        updateDashboard();
        renderLedger();
    };
    
    updateUserRequest.onerror = function() {
        showNotification('ডিলিট ব্যর্থ', 'এন্ট্রি ডিলিট করতে সমস্যা হচ্ছে', 'error');
    };
}

// ===== ব্যবহারকারী তালিকা লোড =====
function loadUserList() {
    if (!db) return;
    
    const transaction = db.transaction(['users'], 'readonly');
    const userStore = transaction.objectStore('users');
    const request = userStore.getAll();
    
    request.onsuccess = function() {
        const users = request.result;
        const userList = document.getElementById('userList');
        
        if (!users || users.length === 0) {
            userList.innerHTML = '<p class="empty-message">এখনো কোনো বন্ধু রেজিস্টার করেননি...</p>';
            return;
        }
        
        let usersHTML = '';
        
        users.forEach(user => {
            const firstLetter = user.name.charAt(0).toUpperCase();
            const entryCount = user.ledger ? user.ledger.length : 0;
            
            usersHTML += `
                <div class="user-item">
                    <div class="user-avatar-small" style="background-color: ${user.avatarColor || getRandomColor()}">
                        ${firstLetter}
                    </div>
                    <div class="user-details">
                        <h4>${user.name}</h4>
                        <p>${entryCount} এন্ট্রি</p>
                    </div>
                </div>
            `;
        });
        
        userList.innerHTML = usersHTML;
    };
}

// ===== বন্ধুদের তালিকা লোড =====
function loadFriendsList() {
    if (!db || !currentUser) return;
    
    const transaction = db.transaction(['users'], 'readonly');
    const userStore = transaction.objectStore('users');
    const request = userStore.getAll();
    
    request.onsuccess = function() {
        const users = request.result;
        const friendsList = document.getElementById('friendsList');
        
        // বর্তমান ব্যবহারকারী বাদ দিন
        const friends = users.filter(user => user.email !== currentUser.email);
        
        if (friends.length === 0) {
            friendsList.innerHTML = `
                <div class="friend-card placeholder">
                    <div class="friend-avatar">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <h3>আপনিই হোন প্রথম</h3>
                    <p>অন্যান্য বন্ধুদের আমন্ত্রণ জানান</p>
                </div>
            `;
            return;
        }
        
        let friendsHTML = '';
        
        friends.forEach(friend => {
            const totalSpent = friend.ledger ? 
                friend.ledger.reduce((sum, entry) => sum + entry.amount, 0) : 0;
            const entryCount = friend.ledger ? friend.ledger.length : 0;
            const firstLetter = friend.name.charAt(0).toUpperCase();
            
            friendsHTML += `
                <div class="friend-card">
                    <div class="friend-avatar" style="background-color: ${friend.avatarColor || getRandomColor()}">
                        ${firstLetter}
                    </div>
                    <h3>${friend.name}</h3>
                    <p>সদস্য since: ${new Date(friend.joinDate).toLocaleDateString('bn-BD')}</p>
                    <div class="friend-stats">
                        <div class="friend-stat">
                            <span class="number">${entryCount}</span>
                            <span class="label">এন্ট্রি</span>
                        </div>
                        <div class="friend-stat">
                            <span class="number">${totalSpent}</span>
                            <span class="label">টাকা</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        friendsList.innerHTML = friendsHTML;
    };
}

// ===== প্রোফাইল সেকশন আপডেট =====
function updateProfileSection() {
    if (!currentUser) return;
    
    const totalSpent = currentUser.ledger ? 
        currentUser.ledger.reduce((sum, entry) => sum + entry.amount, 0) : 0;
    
    const totalEntries = currentUser.ledger ? currentUser.ledger.length : 0;
    
    // গড় গণনা করুন
    let avgSpent = 0;
    if (totalEntries > 0) {
        const joinDate = new Date(currentUser.joinDate);
        const today = new Date();
        const daysSinceJoin = Math.max(1, Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)));
        avgSpent = Math.round(totalSpent / daysSinceJoin);
    }
    
    const dueAmount = currentUser.ledger ? 
        currentUser.ledger.reduce((sum, entry) => {
            if (entry.paymentStatus === 'due' || entry.paymentStatus === 'partial') {
                return sum + (entry.dueAmount || (entry.amount - (entry.paidAmount || 0)));
            }
            return sum;
        }, 0) : 0;
    
    // প্রোফাইল স্ট্যাটস আপডেট
    document.getElementById('profileTotalSpent').textContent = totalSpent;
    document.getElementById('profileTotalEntries').textContent = totalEntries;
    document.getElementById('profileAvgSpent').textContent = avgSpent;
    document.getElementById('profileDueAmount').textContent = dueAmount;
}

// ===== প্রোফাইল আপডেট =====
function updateProfile() {
    if (!currentUser) return;
    
    const newName = document.getElementById('profileNameInput').value.trim();
    
    if (!newName) {
        showNotification('নাম প্রয়োজন', 'দয়া করে একটি নাম লিখুন', 'error');
        return;
    }
    
    // নাম আপডেট
    currentUser.name = newName;
    
    // IndexedDB-তে সেভ করুন
    const transaction = db.transaction(['users'], 'readwrite');
    const userStore = transaction.objectStore('users');
    
    const updateRequest = userStore.put(currentUser);
    
    updateRequest.onsuccess = function() {
        showNotification('প্রোফাইল আপডেট', 'আপনার প্রোফাইল সফলভাবে আপডেট হয়েছে', 'success');
        
        // UI আপডেট
        updateUserInfo();
        loadUserList();
        loadFriendsList();
    };
    
    updateRequest.onerror = function() {
        showNotification('আপডেট ব্যর্থ', 'প্রোফাইল আপডেট করতে সমস্যা হচ্ছে', 'error');
    };
}

// ===== অ্যাভাটার রঙ পরিবর্তন =====
function changeAvatarColor(color) {
    if (!currentUser) return;
    
    // কালার সিলেক্ট করুন
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.style.backgroundColor === color) {
            option.classList.add('selected');
        }
    });
    
    // ইউজার আপডেট করুন
    currentUser.avatarColor = color;
    
    // UI আপডেট করুন
    document.getElementById('userAvatar').style.backgroundColor = color;
    document.getElementById('profileAvatar').style.backgroundColor = color;
    
    showNotification('রঙ পরিবর্তন', 'প্রোফাইল রঙ সফলভাবে পরিবর্তন করা হয়েছে', 'success');
}

// ===== প্রোফাইল রিসেট =====
function resetProfile() {
    if (!currentUser) return;
    
    document.getElementById('profileNameInput').value = currentUser.name;
    
    // ডিফল্ট রঙে ফিরে যান
    const defaultColor = '#1f7a4d';
    changeAvatarColor(defaultColor);
}

// ===== সব ডেটা মুছুন =====
function clearAllData() {
    if (!confirm('আপনি কি নিশ্চিত? এটি আপনার সব হিসাব মুছে ফেলবে। এই কাজটি বিপরীতমুখী নয়।')) {
        return;
    }
    
    if (!currentUser) return;
    
    // লেজার খালি করুন
    currentUser.ledger = [];
    
    // IndexedDB-তে সেভ করুন
    const transaction = db.transaction(['users', 'transactions'], 'readwrite');
    const userStore = transaction.objectStore('users');
    const transactionStore = transaction.objectStore('transactions');
    
    // ইউজার আপডেট
    const updateUserRequest = userStore.put(currentUser);
    
    updateUserRequest.onsuccess = function() {
        // এই ইউজারের সব ট্রানজেকশন ডিলিট করুন
        const index = transactionStore.index('userEmail');
        const range = IDBKeyRange.only(currentUser.email);
        const request = index.openCursor(range);
        
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                transactionStore.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
        
        showNotification('ডেটা মুছে ফেলা হয়েছে', 'আপনার সব হিসাব মুছে ফেলা হয়েছে', 'success');
        
        // UI আপডেট
        updateDashboard();
        renderLedger();
        updateProfileSection();
    };
}

// ===== একাউন্ট ডিলিট =====
function deleteAccount() {
    if (!confirm('আপনি কি নিশ্চিত? এটি আপনার সম্পূর্ণ একাউন্ট মুছে ফেলবে। এই কাজটি বিপরীতমুখী নয়।')) {
        return;
    }
    
    if (!currentUser) return;
    
    const transaction = db.transaction(['users', 'transactions'], 'readwrite');
    const userStore = transaction.objectStore('users');
    const transactionStore = transaction.objectStore('transactions');
    
    // ইউজার ডিলিট
    const deleteUserRequest = userStore.delete(currentUser.email);
    
    deleteUserRequest.onsuccess = function() {
        // এই ইউজারের সব ট্রানজেকশন ডিলিট করুন
        const index = transactionStore.index('userEmail');
        const range = IDBKeyRange.only(currentUser.email);
        const request = index.openCursor(range);
        
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                transactionStore.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
        
        showNotification('একাউন্ট ডিলিট', 'আপনার একাউন্ট সফলভাবে ডিলিট করা হয়েছে', 'success');
        
        // লগআউট করুন
        setTimeout(logout, 1500);
    };
}

// ===== আমন্ত্রণ লিংক কপি =====
function copyInviteLink() {
    const inviteLink = window.location.href;
    navigator.clipboard.writeText(inviteLink)
        .then(() => {
            showNotification('লিংক কপি', 'আমন্ত্রণ লিংক ক্লিপবোর্ডে কপি করা হয়েছে', 'success');
        })
        .catch(() => {
            showNotification('কপি ব্যর্থ', 'লিংক কপি করতে সমস্যা হচ্ছে', 'error');
        });
}

// ===== লেজার এক্সপোর্ট =====
function exportLedger() {
    if (!currentUser || !currentUser.ledger || currentUser.ledger.length === 0) {
        showNotification('এক্সপোর্ট ব্যর্থ', 'এক্সপোর্ট করার মতো কোনো ডেটা নেই', 'warning');
        return;
    }
    
    // CSV হেডার
    let csv = 'তারিখ,আইটেম,পরিমাণ,ইউনিট মূল্য,মোট মূল্য,পরিশোধিত,বাকি,স্ট্যাটাস,নোটস\n';
    
    // ডেটা রো
    currentUser.ledger.forEach(entry => {
        const row = [
            `"${entry.date}"`,
            `"${entry.item}"`,
            `"${entry.quantity || 1}"`,
            `"${entry.unitPrice}"`,
            `"${entry.amount}"`,
            `"${entry.paidAmount || 0}"`,
            `"${entry.dueAmount || (entry.amount - (entry.paidAmount || 0))}"`,
            `"${getStatusText(entry.paymentStatus)}"`,
            `"${entry.notes || ''}"`
        ];
        
        csv += row.join(',') + '\n';
    });
    
    // ফাইল ডাউনলোড
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `নুরুজ্জামানের_চায়ের_দোকান_${currentUser.name}_${new Date().toLocaleDateString('bn-BD')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('এক্সপোর্ট সফল', 'আপনার হিসাব CSV ফাইল হিসেবে ডাউনলোড করা হয়েছে', 'success');
}

// ===== লগআউট =====
function logout() {
    sessionStorage.removeItem('user');
    currentUser = null;
    
    // অথেন্টিকেশন পেজ দেখান
    document.getElementById('appPage').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
    
    // ব্যবহারকারী তালিকা রিফ্রেশ
    loadUserList();
    
    showNotification('লগআউট', 'আপনি সফলভাবে লগআউট করেছেন', 'info');
}

// ===== ইউটিলিটি ফাংশন =====

// নোটিফিকেশন দেখান
function showNotification(title, message, type = 'info') {
    const notificationArea = document.getElementById('notificationArea');
    
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icons[type]}"></i>
        </div>
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    notificationArea.appendChild(notification);
    
    // ৩ সেকেন্ড পর নোটিফিকেশন রিমুভ করুন
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// র্যান্ডম কালার জেনারেট করুন
function getRandomColor() {
    const colors = [
        '#1f7a4d', '#4a6fa5', '#d35400', '#8e44ad', 
        '#c0392b', '#16a085', '#27ae60', '#2980b9',
        '#8e44ad', '#2c3e50', '#f39c12', '#e74c3c'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
}

// আইটেম আইকন পেতে
function getItemIcon(item) {
    const icons = {
        'চা': 'fas fa-coffee',
        'দুধ চা': 'fas fa-mug-hot',
        'রয়েল': 'fas fa-cookie',
        'লাকি': 'fas fa-bread-slice',
        'কলা': 'fas fa-apple-alt',
        'সিগারেট': 'fas fa-smoking',
        'পান': 'fas fa-leaf',
        'default': 'fas fa-utensils'
    };
    
    return icons[item] || icons.default;
}

// আইটেম কালার পেতে
function getItemColor(item) {
    const colors = {
        'চা': '#d35400',
        'দুধ চা': '#f39c12',
        'রয়েল': '#8e44ad',
        'লাকি': '#c0392b',
        'কলা': '#27ae60',
        'সিগারেট': '#7f8c8d',
        'পান': '#16a085',
        'default': '#3498db'
    };
    
    return colors[item] || colors.default;
}

// স্ট্যাটাস টেক্সট পেতে
function getStatusText(status) {
    const statusText = {
        'paid': 'পরিশোধিত',
        'due': 'বাকি',
        'partial': 'আংশিক'
    };
    
    return statusText[status] || status;
}

// RGB থেকে HEX কনভার্ট
function rgbToHex(rgb) {
    // যদি RGB ফরম্যাটে থাকে
    if (rgb.startsWith('rgb')) {
        const values = rgb.match(/\d+/g);
        if (values && values.length >= 3) {
            const r = parseInt(values[0]).toString(16).padStart(2, '0');
            const g = parseInt(values[1]).toString(16).padStart(2, '0');
            const b = parseInt(values[2]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
    }
    
    // যদি HEX ফরম্যাটে থাকে
    return rgb;
}

// ===== স্বাগতম বার্তা =====
window.onload = function() {
    // লোডিং স্ক্রিন 2 সেকেন্ড পর হাইড করুন
    setTimeout(() => {
        document.getElementById('loadingScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 500);
    }, 2000);
};
