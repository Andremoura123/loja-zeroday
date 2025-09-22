// Arquivo: netlify/functions/orders.js

require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Order = require('../../models/Order');
const authMiddleware = require('../../middleware/auth');

// --- FUNÇÃO DE EMAIL ---
// Colocamos ela aqui para ser usada pela lógica de aprovação
async function sendDeliveryEmail(user, products, totalAmount) {
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const productListHTML = products.map(p => 
        `<li><strong>${p.name}:</strong> <a href="${p.deliveryContent}">Acessar Produto</a></li>`
    ).join('');

    await transporter.sendMail({
        from: `"Sua Loja - ZeroDay" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `✅ Seus produtos da Loja ZeroDay foram entregues!`,
        html: `
            <h1>Olá, ${user.name}!</h1>
            <p>Seu pagamento de R$ ${totalAmount.toFixed(2).replace('.', ',')} foi aprovado com sucesso.</p>
            <p>Aqui estão os seus produtos:</p>
            <ul>
                ${productListHTML}
            </ul>
            <p>Obrigado por comprar conosco!</p>
        `
    });
}


// Função para reutilizar a conexão com o banco de dados
let conn = null;
const connectToDatabase = async () => {
    if (conn == null) {
        conn = mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        }).then(() => mongoose);
    }
    await conn;
};

exports.handler = async (event) => {
    try {
        await connectToDatabase();
        
        // Todas as ações nesta função exigem autenticação de admin
        const authResult = authMiddleware(event.headers);
        if (authResult.statusCode) return authResult;
        if (authResult.user.role !== 'admin') return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };

        // --- LÓGICA PARA LISTAR PEDIDOS (GET) ---
        if (event.httpMethod === 'GET') {
            const orders = await Order.find()
                .sort({ createdAt: -1 })
                .populate('user', 'name email')
                .populate('products', 'name');
            return { statusCode: 200, body: JSON.stringify(orders) };
        }

        // --- LÓGICA PARA APROVAR/NEGAR PEDIDOS (PATCH) ---
        if (event.httpMethod === 'PATCH') {
            const { orderId, action } = JSON.parse(event.body);
            if (!orderId || !action) {
                return { statusCode: 400, body: JSON.stringify({ message: 'ID do pedido e ação são obrigatórios.' }) };
            }

            const order = await Order.findById(orderId).populate('user').populate('products');
            if (!order) return { statusCode: 404, body: JSON.stringify({ message: 'Pedido não encontrado.' }) };
            if (order.status !== 'pending') return { statusCode: 400, body: JSON.stringify({ message: 'Este pedido já foi processado.' }) };

            if (action === 'approve') {
                order.status = 'completed';
                await order.save();
                // Envia o email com os produtos
                await sendDeliveryEmail(order.user, order.products, order.totalAmount);
                return { statusCode: 200, body: JSON.stringify(order) };
            
            } else if (action === 'deny') {
                order.status = 'failed';
                await order.save();
                return { statusCode: 200, body: JSON.stringify(order) };
            
            } else {
                return { statusCode: 400, body: JSON.stringify({ message: 'Ação inválida.' }) };
            }
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error("Erro na função de pedidos:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro no servidor.', error: error.message }) };
    }
};