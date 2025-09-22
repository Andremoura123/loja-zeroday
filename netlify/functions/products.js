require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../../models/Product');
const User = require('../../models/User');
const authMiddleware = require('../../middleware/auth');

let conn = null;
const connectToDatabase = async () => {
    if (conn == null) {
        conn = mongoose.connect(process.env.MONGO_URI).then(() => mongoose);
    }
    await conn;
};

exports.handler = async (event) => {
    await connectToDatabase();
    const { category, id } = event.queryStringParameters;
    const authResult = authMiddleware(event.headers);
    const body = event.body ? JSON.parse(event.body) : null;

    try {
        switch (event.httpMethod) {
            case 'GET':
                if (id) {
                    const product = await Product.findById(id);
                    if (!product) return { statusCode: 404, body: JSON.stringify({ message: 'Produto não encontrado.' }) };
                    return { statusCode: 200, body: JSON.stringify(product) };
                }
                const filter = category ? { category } : {};
                const products = await Product.find(filter);
                return { statusCode: 200, body: JSON.stringify(products) };

            case 'POST':
                if (authResult.statusCode) return authResult;
                if (authResult.user.role !== 'admin') return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };
                const newProduct = new Product(body);
                const savedProduct = await newProduct.save();
                return { statusCode: 201, body: JSON.stringify(savedProduct) };

            case 'PUT':
                if (authResult.statusCode) return authResult;
                if (authResult.user.role !== 'admin') return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };
                if (!id) return { statusCode: 400, body: JSON.stringify({ message: 'ID do produto é obrigatório.' }) };
                const updatedProduct = await Product.findByIdAndUpdate(id, body, { new: true });
                return { statusCode: 200, body: JSON.stringify(updatedProduct) };

            case 'DELETE':
                if (authResult.statusCode) return authResult;
                if (authResult.user.role !== 'admin') return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };
                if (!id) return { statusCode: 400, body: JSON.stringify({ message: 'ID do produto é obrigatório.' }) };
                await Product.findByIdAndDelete(id);
                return { statusCode: 200, body: JSON.stringify({ message: 'Produto removido com sucesso.' }) };

            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro no servidor.', error: error.message }) };
    }
};