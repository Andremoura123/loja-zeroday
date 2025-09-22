const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true // Salva o código sempre em maiúsculas
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'], // Tipo de desconto: porcentagem ou valor fixo
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);