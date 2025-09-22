const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    shortDescription: {
        type: String,
        required: true
    },
    longDescription: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    deliveryContent: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    }
});

module.exports = mongoose.model('Product', ProductSchema);