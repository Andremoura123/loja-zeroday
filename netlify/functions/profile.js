require('dotenv').config();
const mongoose = require('mongoose');
const authMiddleware = require('../../middleware/auth');
const User = require('../../models/User');

let conn = null;
const connectToDatabase = async () => {
    if (conn == null) {
        conn = mongoose.connect(process.env.MONGO_URI).then(() => mongoose);
    }
    await conn;
};

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Adaptando o middleware para o formato serverless
    const authResult = authMiddleware(event.headers);
    if (authResult.statusCode) { // Se o middleware retornar um erro
        return authResult;
    }
    const { user: decodedUser } = authResult;

    try {
        await connectToDatabase();
        const user = await User.findById(decodedUser.id).select('-password');
        return { statusCode: 200, body: JSON.stringify(user) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro no servidor.' }) };
    }
};