// Arquivo: netlify/functions/checkout.js

require('dotenv').config();
const mongoose = require('mongoose');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const Order = require('../../models/Order');
const Coupon = require('../../models/Coupon');
const authMiddleware = require('../../middleware/auth');

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
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        await connectToDatabase();

        const authResult = authMiddleware(event.headers);
        if (authResult.statusCode) return authResult;
        const userId = authResult.user.id;
        
        const { cart, couponCode } = JSON.parse(event.body);
        if (!cart || cart.length === 0) return { statusCode: 400, body: JSON.stringify({ message: 'Carrinho está vazio.' }) };

        let subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        let totalAmount = subtotal;
        let discountAmount = 0;

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon) {
                if (coupon.discountType === 'percentage') {
                    discountAmount = (subtotal * coupon.discountValue) / 100;
                } else {
                    discountAmount = coupon.discountValue;
                }
                totalAmount = subtotal - discountAmount;
            }
        }
        if (totalAmount < 0) totalAmount = 0.01;

        const items = cart.map(item => ({
            id: item._id,
            title: item.name,
            unit_price: item.price,
            quantity: item.quantity,
        }));
        
        if (discountAmount > 0) {
            items.push({
                id: 'desconto',
                title: `Desconto Cupom ${couponCode}`,
                unit_price: -discountAmount,
                quantity: 1,
            });
        }

        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
        const preference = new Preference(client);
        const siteUrl = process.env.URL || 'http://localhost:8888';

        const preferenceData = await preference.create({
            body: {
                items: items,
                payment_methods: {
                    excluded_payment_methods: [
                        { id: "ticket" },
                        { id: "debit_card" },
                        { id: "atm" }
                    ],
                    installments: 1
                },
                back_urls: {
                    success: `${siteUrl}/dashboard.html`,
                    failure: `${siteUrl}/cart.html`,
                    pending: `${siteUrl}/cart.html`
                },
                auto_return: 'approved',
                notification_url: `${siteUrl}/.netlify/functions/webhook}`
            }
        });

        const productIds = cart.map(item => item._id);
        const newOrder = new Order({
            user: userId,
            products: productIds,
            paymentId: preferenceData.id,
            totalAmount: totalAmount,
            status: 'pending'
        });
        await newOrder.save();

        return {
            statusCode: 200,
            body: JSON.stringify({ checkoutUrl: preferenceData.init_point })
        };

    } catch (error) {
        console.error("Erro na função de checkout:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro ao processar o pagamento.', error: error.message }) };
    }
};