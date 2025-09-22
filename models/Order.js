const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrderSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // --- MODIFICAÇÃO AQUI ---
    products: [{ // Mudou de 'product' para 'products'
        type: Schema.Types.ObjectId,
        ref: 'Product' // Agora é um array de referências
    }],
    paymentId: {
        type: String
    },
    totalAmount: { // Novo campo para guardar o valor total
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'], 
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', OrderSchema);