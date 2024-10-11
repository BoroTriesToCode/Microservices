const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
