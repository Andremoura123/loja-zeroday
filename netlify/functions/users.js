// Arquivo: netlify/functions/users.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../models/User');
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
        
        // Todas as ações nesta função exigem autenticação de admin
        const authResult = authMiddleware(event.headers);
        if (authResult.statusCode) return authResult;
        if (authResult.user.role !== 'admin') return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };

        // --- LÓGICA PARA LISTAR USUÁRIOS (GET) ---
        if (event.httpMethod === 'GET') {
            const users = await User.find().select('-password');
            return { statusCode: 200, body: JSON.stringify(users) };
        }

        // --- LÓGICA PARA ATUALIZAR ROLE (PATCH) ---
        if (event.httpMethod === 'PATCH') {
            const { userId, role } = JSON.parse(event.body);

            if (!userId || !role) {
                return { statusCode: 400, body: JSON.stringify({ message: 'ID do usuário e nova função são obrigatórios.' }) };
            }

            if (role !== 'user' && role !== 'admin') {
                return { statusCode: 400, body: JSON.stringify({ message: 'Função inválida. Deve ser "user" ou "admin".' }) };
            }

            const userToUpdate = await User.findById(userId);
            if (!userToUpdate) {
                return { statusCode: 404, body: JSON.stringify({ message: 'Usuário não encontrado.' }) };
            }

            userToUpdate.role = role;
            await userToUpdate.save();

            return { statusCode: 200, body: JSON.stringify({ message: `Usuário ${userToUpdate.name} atualizado para ${role}.` }) };
        }

        // Se o método não for GET ou PATCH
        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error("Erro na função de usuários:", error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro no servidor.', error: error.message }) };
    }
};