const express = require('express');
const mongoose = require('mongoose');
const customerRoutes = require('./routes/customerRoutes');
const { consumeCustomers } = require('./kafkaConsumer');
const app = express();
const port = 3002;

app.use(express.json());

mongoose.connect('mongodb://customer-mongodb:27017/customers', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected for Customer Service'))
    .catch(err => console.log(err));

consumeCustomers();

app.use('/customers', customerRoutes);

app.listen(port, () => {
    console.log(`Customer Service listening at http://localhost:${port}`);
});
