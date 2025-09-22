require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../../models/Product');

let conn = null;
const connectToDatabase = async () => {
    if (conn == null) {
        conn = mongoose.connect(process.env.MONGO_URI).then(() => mongoose);
    }
    await conn;
};

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };
    try {
        await connectToDatabase();
        const categories = await Product.distinct('category');
        return { statusCode: 200, body: JSON.stringify(categories) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro ao buscar categorias.' }) };
    }
};