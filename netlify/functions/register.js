require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');

let conn = null;
const connectToDatabase = async () => {
    if (conn == null) {
        conn = mongoose.connect(process.env.MONGO_URI).then(() => mongoose);
    }
    await conn;
};

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
        await connectToDatabase();
        const { name, email, password } = JSON.parse(event.body);
        const existingUser = await User.findOne({ email });
        if (existingUser) return { statusCode: 400, body: JSON.stringify({ message: 'Este email já está em uso.' }) };
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        
        return { statusCode: 201, body: JSON.stringify({ message: 'Usuário criado com sucesso!' }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro no servidor.' }) };
    }
};