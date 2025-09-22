// ALTERAÇÃO: Todas as URLs foram trocadas de 'http://localhost:3000/api/...' para '/.netlify/functions/...'
// para funcionar com o novo backend serverless.

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DO CARRINHO (Funções Globais) ---
    const cartCountElement = document.querySelector('.cart-count');
    let appliedCoupon = null;

    function getCart() { return JSON.parse(localStorage.getItem('cart')) || []; }
    function saveCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); updateCartIcon(); }
    function updateCartIcon() {
        const cart = getCart();
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCountElement) { cartCountElement.textContent = totalItems; }
    }
    function addToCart(product) {
        const cart = getCart();
        const existingItem = cart.find(item => item._id === product._id);
        if (existingItem) { existingItem.quantity++; } 
        else { cart.push({ ...product, quantity: 1 }); }
        saveCart(cart);
        alert(`"${product.name}" foi adicionado/atualizado no carrinho!`);
    }

    updateCartIcon();

    // --- LÓGICA DO MODAL DE DETALHES ---
    const modal = document.getElementById('details-modal');
    if (modal) {
        const closeButton = modal.querySelector('.close-button');
        const modalTitle = modal.querySelector('#modal-product-title');
        const modalDescription = modal.querySelector('#modal-product-description');

        function openModal(product) {
            modalTitle.textContent = product.name;
            modalDescription.innerHTML = product.longDescription.replace(/\n/g, '<br>');
            modal.style.display = 'flex';
        }

        function closeModal() {
            modal.style.display = 'none';
        }

        if (closeButton) closeButton.onclick = closeModal;
        window.onclick = function(event) {
            if (event.target == modal) {
                closeModal();
            }
        }
    }

    // --- SELETORES DE PÁGINA ---
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const dashboardUserName = document.getElementById('user-name');
    const logoutButton = document.getElementById('logout-button');
    const productGrid = document.querySelector('.product-grid');
    const addProductForm = document.getElementById('add-product-form');
    const ordersTableBody = document.getElementById('orders-tbody');
    const cartPageContainer = document.getElementById('cart-items-detailed');
    const productListAdmin = document.getElementById('product-list-admin');
    const searchInput = document.getElementById('search-input');
    const categoryList = document.getElementById('category-list');
    const editProductForm = document.getElementById('edit-product-form');
    const adminDashboardStats = document.getElementById('stats-total-sales');
    const addCouponForm = document.getElementById('add-coupon-form');
    const usersTbody = document.getElementById('users-tbody');

    // --- LÓGICA DE REGISTRO ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/.netlify/functions/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Conta criada com sucesso!');
                    window.location.href = 'login.html';
                } else {
                    alert(`Erro: ${data.message}`);
                }
            } catch (error) {
                alert('Não foi possível conectar ao servidor.');
            }
        });
    }

    // --- LÓGICA DE LOGIN ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/.netlify/functions/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    alert('Login bem-sucedido!');
                    window.location.href = 'dashboard.html';
                } else {
                    alert(`Erro: ${data.message}`);
                }
            } catch (error) {
                alert('Não foi possível conectar ao servidor.');
            }
        });
    }

    // --- LÓGICA DO DASHBOARD DE USUÁRIO---
    if (dashboardUserName) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
        } else {
            fetch('/.netlify/functions/profile', { headers: { 'Authorization': token } })
            .then(res => {
                if (!res.ok) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    throw new Error('Token inválido');
                }
                return res.json();
            })
            .then(userData => {
                document.getElementById('user-name').textContent = userData.name;
                document.getElementById('user-email').textContent = userData.email;
                if (userData.role === 'admin') {
                    const adminLink = document.getElementById('admin-link');
                    if(adminLink) adminLink.style.display = 'list-item';
                }
            })
            .catch(err => console.error(err.message));
        }
    }

    // --- LÓGICA DE LOGOUT ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            alert('Você saiu da sua conta.');
            window.location.href = 'login.html';
        });
    }
    
    // --- LÓGICA DA PÁGINA INICIAL ---
    if (productGrid && categoryList) {
        let allProducts = [];

        function renderProducts(productsToRender) {
            productGrid.innerHTML = '';
            if (productsToRender.length > 0) {
                productsToRender.forEach(product => {
                    const productCardHTML = `
                        <div class="product-card">
                            <img src="${product.imageUrl}" alt="${product.name}">
                            <h2>${product.name}</h2>
                            <p>${product.shortDescription}</p>
                            <div class="price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>
                            <div class="product-card-buttons">
                                <button class="details-button" data-product='${JSON.stringify(product)}'>Detalhes</button>
                                <button class="buy-button" data-product='${JSON.stringify(product)}'>Adicionar ao Carrinho</button>
                            </div>
                        </div>
                    `;
                    productGrid.innerHTML += productCardHTML;
                });
            } else {
                productGrid.innerHTML = '<p>Nenhum produto encontrado.</p>';
            }
        }

        async function fetchProducts(category = '') {
            try {
                const url = category 
                    ? `/.netlify/functions/products?category=${encodeURIComponent(category)}`
                    : '/.netlify/functions/products';
                
                const response = await fetch(url);
                const products = await response.json();

                if (category === '') {
                    allProducts = products;
                }
                renderProducts(products);
            } catch (error) {
                productGrid.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
            }
        }

        async function fetchCategories() {
            try {
                const response = await fetch('/.netlify/functions/categories');
                const categories = await response.json();
                
                categoryList.innerHTML = `<li><a href="#" class="active" data-category="">CATÁLOGO</a></li>`;
                categories.forEach(category => {
                    categoryList.innerHTML += `<li><a href="#" data-category="${category}">${category.toUpperCase()}</a></li>`;
                });
            } catch (error) {
                console.error('Erro ao buscar categorias:', error);
            }
        }

        categoryList.addEventListener('click', (event) => {
            event.preventDefault();
            if (event.target.tagName === 'A') {
                document.querySelectorAll('.category-nav a').forEach(a => a.classList.remove('active'));
                event.target.classList.add('active');
                const category = event.target.dataset.category;
                fetchProducts(category);
                if (searchInput) searchInput.value = '';
            }
        });
        
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase().trim();
                const filteredProducts = allProducts.filter(product => 
                    product.name.toLowerCase().includes(searchTerm)
                );
                renderProducts(filteredProducts);
                document.querySelectorAll('.category-nav a').forEach(a => a.classList.remove('active'));
            });
        }
        
        fetchCategories();
        fetchProducts();
        
        productGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('buy-button')) {
                const productData = JSON.parse(event.target.dataset.product);
                addToCart(productData);
            }
            if (event.target.classList.contains('details-button')) {
                const productData = JSON.parse(event.target.dataset.product);
                openModal(productData);
            }
        });
    }

    // --- LÓGICA DO PAINEL DE ADMIN (ADICIONAR PRODUTO) ---
    if (addProductForm) {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'login.html'; } 
        else {
            fetch('/.netlify/functions/profile', { headers: { 'Authorization': token } })
            .then(res => res.json())
            .then(userData => {
                if (userData.role !== 'admin') {
                    alert('Acesso negado.');
                    window.location.href = 'dashboard.html';
                }
            }).catch(() => { window.location.href = 'login.html'; });
        }
        addProductForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const productData = {
                name: document.getElementById('name').value,
                shortDescription: document.getElementById('shortDescription').value,
                longDescription: document.getElementById('longDescription').value,
                price: parseFloat(document.getElementById('price').value),
                imageUrl: document.getElementById('imageUrl').value,
                deliveryContent: document.getElementById('deliveryContent').value,
                category: document.getElementById('category').value
            };
            try {
                const response = await fetch('/.netlify/functions/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') },
                    body: JSON.stringify(productData)
                });
                if (response.ok) {
                    alert('Produto adicionado com sucesso!');
                    addProductForm.reset();
                } else {
                    const errorData = await response.json();
                    alert(`Erro: ${errorData.message}`);
                }
            } catch (error) {
                alert('Erro de conexão ao adicionar produto.');
            }
        });
    }

    // --- LÓGICA DA PÁGINA DE PEDIDOS (ADMIN) ---
    if (ordersTableBody) {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'login.html'; }
        else {
            async function fetchOrders() {
                try {
                    const response = await fetch('/.netlify/functions/orders', { headers: { 'Authorization': token } });
                    if (!response.ok) {
                        if (response.status === 403) { alert('Acesso negado.'); window.location.href = 'dashboard.html'; }
                        throw new Error('Falha ao buscar pedidos.');
                    }
                    const orders = await response.json();
                    renderOrders(orders);
                } catch (error) { console.error(error.message); }
            }

            function renderOrders(orders) {
                ordersTableBody.innerHTML = '';
                if (orders.length === 0) {
                    ordersTableBody.innerHTML = '<tr><td colspan="6">Nenhum pedido encontrado.</td></tr>';
                } else {
                    orders.forEach(order => {
                        const productNames = order.products.map(p => p ? p.name : 'Produto Removido').join(', ');
                        const actionsHtml = order.status === 'pending'
                            ? `<button class="approve-btn" data-order-id="${order._id}">Aprovar</button>
                               <button class="deny-btn" data-order-id="${order._id}">Negar</button>`
                            : 'Processado';
                        const orderRow = `
                            <tr data-order-row-id="${order._id}">
                                <td>${new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td>${order.user ? order.user.name : 'Usuário Deletado'}</td>
                                <td>${order.user ? order.user.email : '-'}</td>
                                <td>${productNames}</td>
                                <td class="order-status">${order.status}</td>
                                <td class="order-actions">${actionsHtml}</td>
                            </tr>`;
                        ordersTableBody.innerHTML += orderRow;
                    });
                }
            }

            ordersTableBody.addEventListener('click', async (event) => {
                const target = event.target;
                const orderId = target.dataset.orderId;
                let url = '';
                // Note: Netlify functions don't support complex routes like /orders/:id/approve directly.
                // This will require a single 'orders' function that handles different actions based on the request body.
                // We'll pass the action and ID in the body of the request.
                let action = '';
                if (target.classList.contains('approve-btn')) { action = 'approve'; } 
                else if (target.classList.contains('deny-btn')) { action = 'deny'; }

                if (action && confirm('Tem certeza?')) {
                    try {
                        const response = await fetch('/.netlify/functions/orders', { 
                            method: 'PATCH', 
                            headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId, action })
                        });
                        const updatedOrder = await response.json();
                        if (!response.ok) throw new Error(updatedOrder.message);
                        fetchOrders();
                        alert(updatedOrder.status === 'completed' ? 'Pedido aprovado e e-mail enviado!' : 'Pedido negado.');
                    } catch (error) {
                        alert(`Erro: ${error.message}`);
                    }
                }
            });
            fetchOrders();
        }
    }

    // --- LÓGICA DE GERENCIAR PRODUTOS (ADMIN) ---
    if (productListAdmin) {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'login.html'; }
        
        async function fetchAndRenderProductsForAdmin() {
            try {
                const response = await fetch('/.netlify/functions/products');
                const products = await response.json();
                productListAdmin.innerHTML = '';
                if (products.length === 0) {
                    productListAdmin.innerHTML = '<p>Nenhum produto para gerenciar.</p>';
                } else {
                    const productTable = document.createElement('table');
                    productTable.id = 'orders-table';
                    productTable.innerHTML = `
                        <thead><tr><th>Produto</th><th>Preço</th><th>Ações</th></tr></thead>
                        <tbody>
                            ${products.map(product => `
                                <tr data-product-row-id="${product._id}">
                                    <td>${product.name}</td>
                                    <td>R$ ${product.price.toFixed(2).replace('.', ',')}</td>
                                    <td>
                                        <a href="edit-product.html?id=${product._id}" class="edit-product-btn">Editar</a>
                                        <button class="remove-product-btn" data-product-id="${product._id}">Remover</button>
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    `;
                    productListAdmin.appendChild(productTable);
                }
            } catch (error) { productListAdmin.innerHTML = '<p>Erro ao carregar produtos.</p>'; }
        }

        productListAdmin.addEventListener('click', async (event) => {
            if (event.target.classList.contains('remove-product-btn')) {
                const productId = event.target.dataset.productId;
                if (confirm('Tem certeza que deseja remover este produto permanentemente?')) {
                    try {
                        const response = await fetch(`/.netlify/functions/products?id=${productId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': token }
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Falha ao remover produto.');
                        }
                        alert('Produto removido com sucesso!');
                        document.querySelector(`tr[data-product-row-id="${productId}"]`).remove();
                    } catch (error) {
                        alert(`Erro: ${error.message}`);
                    }
                }
            }
        });
        fetchAndRenderProductsForAdmin();
    }
    
    // --- LÓGICA DA PÁGINA DO CARRINHO ---
    if (cartPageContainer) {
        const cartItemCountEl = document.getElementById('cart-item-count');
        const summarySubtotalEl = document.getElementById('summary-subtotal');
        const summaryDiscountEl = document.getElementById('summary-discount');
        const summaryTotalEl = document.getElementById('summary-total');
        const applyCouponBtn = document.getElementById('apply-coupon-btn');
        const couponCodeInput = document.getElementById('coupon-code');
        const discountLineEl = document.getElementById('discount-line');

        function renderCart() {
            const cart = getCart();
            let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

            if(cartItemCountEl) cartItemCountEl.textContent = `${totalItems} Item(s)`;

            if (cart.length === 0) {
                cartPageContainer.innerHTML = '<p style="text-align: center;">Seu carrinho está vazio.</p>';
            } else {
                const allItemsHTML = cart.map((item, index) => `
                    <div class="cart-item-detailed">
                        <img src="${item.imageUrl}" alt="${item.name}">
                        <div class="cart-item-detailed-info"><h4>${item.name}</h4><p>${item.quantity} dispositivo(s)</p></div>
                        <div class="quantity-selector">
                            <button class="quantity-btn" data-action="decrease" data-index="${index}">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" data-action="increase" data-index="${index}">+</button>
                        </div>
                        <span class="cart-item-price">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                        <div class="cart-item-remove"><button data-index="${index}" class="remove-from-cart-btn" title="Remover item">&times;</button></div>
                    </div>
                `).join('');
                cartPageContainer.innerHTML = allItemsHTML;
            }

            let discount = 0;
            if (appliedCoupon) {
                if (appliedCoupon.discountType === 'percentage') { discount = (subtotal * appliedCoupon.discountValue) / 100; } 
                else { discount = appliedCoupon.discountValue; }
            }
            const finalTotal = subtotal - discount < 0 ? 0 : subtotal - discount;

            if(summarySubtotalEl) summarySubtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
            if(summaryDiscountEl && discountLineEl) {
                discountLineEl.style.display = discount > 0 ? 'flex' : 'none';
                summaryDiscountEl.textContent = `- R$ ${discount.toFixed(2).replace('.', ',')}`;
            }
            if(summaryTotalEl) summaryTotalEl.textContent = `R$ ${finalTotal.toFixed(2).replace('.', ',')}`;
        }

        cartPageContainer.addEventListener('click', (event) => {
            const target = event.target;
            let cart = getCart();
            if (target.classList.contains('remove-from-cart-btn')) {
                const itemIndex = parseInt(target.dataset.index);
                cart.splice(itemIndex, 1);
            }
            if (target.classList.contains('quantity-btn')) {
                const action = target.dataset.action;
                const index = parseInt(target.dataset.index);
                if (action === 'increase') { cart[index].quantity++; } 
                else if (action === 'decrease') {
                    cart[index].quantity--;
                    if (cart[index].quantity <= 0) { cart.splice(index, 1); }
                }
            }
            saveCart(cart);
            renderCart();
        });
        
        if(applyCouponBtn) {
            applyCouponBtn.addEventListener('click', async () => {
                const code = couponCodeInput.value;
                if (!code) return;
                try {
                    const response = await fetch('/.netlify/functions/coupons', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'validate', code })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    appliedCoupon = data;
                    alert('Cupom aplicado com sucesso!');
                    renderCart();
                } catch (error) {
                    alert(`Erro: ${error.message}`);
                    appliedCoupon = null;
                    couponCodeInput.value = '';
                    renderCart();
                }
            });
        }

        document.getElementById('checkout-button').addEventListener('click', async () => {
            const cart = getCart();
            if (cart.length === 0) { return alert('Seu carrinho está vazio.'); }
            const token = localStorage.getItem('token');
            if (!token) { return window.location.href = 'login.html'; }
            const termsCheckbox = document.getElementById('terms');
            if (!termsCheckbox.checked) { return alert('Você precisa concordar com os Termos de Serviço.'); }

            try {
                const response = await fetch('/.netlify/functions/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token },
                    body: JSON.stringify({ cart: cart, couponCode: appliedCoupon ? appliedCoupon.code : null })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Falha ao iniciar o checkout.');
                }
                const data = await response.json();
                saveCart([]);
                appliedCoupon = null;
                window.location.href = data.checkoutUrl;
            } catch (error) {
                alert(`Erro: ${error.message}`);
            }
        });
        renderCart();
    }

    // --- LÓGICA DO DASHBOARD DE ADMIN ---
    if (adminDashboardStats) {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'login.html'; }

        async function fetchAdminStats() {
            try {
                const response = await fetch('/.netlify/functions/admin', {
                    headers: { 'Authorization': token }
                });
                if (!response.ok) {
                    if (response.status === 403) { window.location.href = 'dashboard.html'; }
                    throw new Error('Falha ao buscar estatísticas.');
                }
                
                const stats = await response.json();
                
                document.getElementById('stats-total-sales').textContent = `R$ ${stats.totalSales.toFixed(2).replace('.', ',')}`;
                document.getElementById('stats-total-orders').textContent = stats.totalOrders;
                document.getElementById('stats-total-users').textContent = stats.totalUsers;

                const recentOrdersTbody = document.getElementById('stats-recent-orders');
                recentOrdersTbody.innerHTML = '';
                if (stats.recentOrders.length === 0) {
                    recentOrdersTbody.innerHTML = '<tr><td colspan="4">Nenhum pedido recente.</td></tr>';
                } else {
                    stats.recentOrders.forEach(order => {
                        recentOrdersTbody.innerHTML += `
                            <tr>
                                <td>${new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td>${order.user ? order.user.name : 'N/A'}</td>
                                <td>${order.status}</td>
                                <td>R$ ${order.totalAmount.toFixed(2).replace('.', ',')}</td>
                            </tr>
                        `;
                    });
                }
            } catch (error) {
                console.error(error.message);
            }
        }
        fetchAdminStats();
    }

    // --- LÓGICA DA PÁGINA DE GERENCIAR CUPONS ---
    if (addCouponForm) {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'login.html'; }

        const couponsTbody = document.getElementById('coupons-tbody');

        async function fetchAndRenderCoupons() {
            try {
                const response = await fetch('/.netlify/functions/coupons', {
                    headers: { 'Authorization': token }
                });
                if (!response.ok) throw new Error('Falha ao buscar cupons.');

                const coupons = await response.json();
                couponsTbody.innerHTML = '';
                if (coupons.length === 0) {
                    couponsTbody.innerHTML = '<tr><td colspan="4">Nenhum cupom criado.</td></tr>';
                } else {
                    coupons.forEach(coupon => {
                        const couponRow = `
                            <tr>
                                <td>${coupon.code}</td>
                                <td>${coupon.discountType}</td>
                                <td>${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue.toFixed(2)}`}</td>
                                <td>${coupon.isActive ? 'Ativo' : 'Inativo'}</td>
                            </tr>
                        `;
                        couponsTbody.innerHTML += couponRow;
                    });
                }
            } catch (error) {
                console.error(error);
            }
        }

        addCouponForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const couponData = {
                code: document.getElementById('coupon-code-input').value,
                discountType: document.getElementById('discount-type').value,
                discountValue: parseFloat(document.getElementById('discount-value').value)
            };
            try {
                const response = await fetch('/.netlify/functions/coupons', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token },
                    body: JSON.stringify({ action: 'create', ...couponData })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Falha ao criar cupom.');
                }
                alert('Cupom criado com sucesso!');
                addCouponForm.reset();
                fetchAndRenderCoupons();
            } catch (error) {
                alert(`Erro: ${error.message}`);
            }
        });
        fetchAndRenderCoupons();
    }

    // --- LÓGICA DA PÁGINA DE EDITAR PRODUTO ---
    if (editProductForm) {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'login.html'; }

        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        async function fetchProductDetails() {
            try {
                const response = await fetch(`/.netlify/functions/products?id=${productId}`);
                if (!response.ok) throw new Error('Produto não encontrado.');
                const product = await response.json();
                
                document.getElementById('name').value = product.name;
                document.getElementById('shortDescription').value = product.shortDescription;
                document.getElementById('longDescription').value = product.longDescription;
                document.getElementById('price').value = product.price;
                document.getElementById('imageUrl').value = product.imageUrl;
                document.getElementById('deliveryContent').value = product.deliveryContent;
                document.getElementById('category').value = product.category;
            } catch (error) {
                alert(`Erro: ${error.message}`);
                window.location.href = 'manage-products.html';
            }
        }

        editProductForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const updatedData = {
                name: document.getElementById('name').value,
                shortDescription: document.getElementById('shortDescription').value,
                longDescription: document.getElementById('longDescription').value,
                price: parseFloat(document.getElementById('price').value),
                imageUrl: document.getElementById('imageUrl').value,
                deliveryContent: document.getElementById('deliveryContent').value,
                category: document.getElementById('category').value
            };
            try {
                const response = await fetch(`/.netlify/functions/products?id=${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token },
                    body: JSON.stringify(updatedData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Falha ao atualizar produto.');
                }
                alert('Produto atualizado com sucesso!');
                window.location.href = 'manage-products.html';
            } catch (error) {
                alert(`Erro: ${error.message}`);
            }
        });
        fetchProductDetails();
    }

    // --- LÓGICA DE GERENCIAR USUÁRIOS (ADMIN) ---
    if (usersTbody) {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'login.html'; }

        async function fetchAndRenderUsers() {
            try {
                const response = await fetch('/.netlify/functions/users', {
                    headers: { 'Authorization': token }
                });
                if (!response.ok) throw new Error('Falha ao buscar usuários.');

                const users = await response.json();
                usersTbody.innerHTML = '';
                users.forEach(user => {
                    const userRow = `
                        <tr data-user-row-id="${user._id}">
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td class="user-role">${user.role}</td>
                            <td class="user-actions">
                                ${user.role !== 'admin'
                                    ? `<button class="role-change-btn" data-user-id="${user._id}" data-new-role="admin">Tornar Admin</button>`
                                    : `<button class="role-change-btn" data-user-id="${user._id}" data-new-role="user">Remover Admin</button>`
                                }
                            </td>
                        </tr>
                    `;
                    usersTbody.innerHTML += userRow;
                });
            } catch (error) {
                console.error(error);
            }
        }

        usersTbody.addEventListener('click', async (event) => {
            if (event.target.classList.contains('role-change-btn')) {
                const userId = event.target.dataset.userId;
                const newRole = event.target.dataset.newRole;
                
                if (confirm(`Tem certeza que deseja alterar a função deste usuário para ${newRole}?`)) {
                    try {
                        const response = await fetch('/.netlify/functions/users', {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': token
                            },
                            body: JSON.stringify({ userId, role: newRole })
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.message);

                        alert(data.message);
                        fetchAndRenderUsers();
                    } catch (error) {
                        alert(`Erro: ${error.message}`);
                    }
                }
            }
        });
        fetchAndRenderUsers();
    }
});