require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Função para reutilizar a conexão com o banco
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
        const { email, password } = JSON.parse(event.body);

        const user = await User.findOne({ email });
        if (!user) return { statusCode: 400, body: JSON.stringify({ message: 'Credenciais inválidas.' }) };

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return { statusCode: 400, body: JSON.stringify({ message: 'Credenciais inválidas.' }) };

        const payload = { id: user.id, name: user.name, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Login bem-sucedido!', token: 'Bearer ' + token })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro no servidor.' }) };
    }
};