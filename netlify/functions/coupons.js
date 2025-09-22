// Arquivo: netlify/functions/coupons.js

require('dotenv').config();
const mongoose = require('mongoose');
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
    try {
        await connectToDatabase();
        const body = event.body ? JSON.parse(event.body) : {};

        // Rota: LISTAR todos os cupons (GET) - Apenas para Admins
        if (event.httpMethod === 'GET') {
            const authResult = authMiddleware(event.headers);
            if (authResult.statusCode) return authResult;
            if (authResult.user.role !== 'admin') return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };

            const coupons = await Coupon.find().sort({ createdAt: -1 });
            return { statusCode: 200, body: JSON.stringify(coupons) };
        }

        // Rota: VALIDAR ou CRIAR um cupom (POST)
        if (event.httpMethod === 'POST') {
            // Ação: Validar um cupom (público)
            if (body.action === 'validate') {
                const { code } = body;
                const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
                if (!coupon) return { statusCode: 404, body: JSON.stringify({ message: 'Cupom inválido ou expirado.' }) };
                
                return { statusCode: 200, body: JSON.stringify(coupon) };
            }
            
            // Ação: Criar um novo cupom (apenas admin)
            if (body.action === 'create') {
                const authResult = authMiddleware(event.headers);
                if (authResult.statusCode) return authResult;
                if (authResult.user.role !== 'admin') return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };

                const { code, discountType, discountValue } = body;

                const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
                if (existingCoupon) {
                    return { statusCode: 400, body: JSON.stringify({ message: 'Um cupom com este código já existe.' }) };
                }

                const newCoupon = new Coupon({ code, discountType, discountValue });
                await newCoupon.save();
                return { statusCode: 201, body: JSON.stringify(newCoupon) };
            }

            // Se nenhuma ação válida for fornecida no POST
            return { statusCode: 400, body: JSON.stringify({ message: 'Ação inválida.' }) };
        }

        // Se o método não for GET ou POST
        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error("Erro na função de cupons:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro no servidor.', error: error.message }) };
    }
};