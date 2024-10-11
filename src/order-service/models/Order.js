const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    quantity: { type: Number, required: true },
    status: { type: String, required: true }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
