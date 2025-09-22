const mongoose = require('mongoose');

// Esta é a "planta baixa" de como as informações de um usuário serão guardadas no banco.
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true // O campo é obrigatório
    },
    email: {
        type: String,
        required: true,
        unique: true // O email deve ser único no banco de dados
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'user' // Por padrão, todo novo usuário é um 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now // A data de criação será preenchida automaticamente
    }
});

// Exportamos o modelo para que possamos usá-lo em outras partes do nosso código
module.exports = mongoose.model('User', UserSchema);