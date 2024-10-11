const express = require('express');
const mongoose = require('mongoose');
const orderRoutes = require('./routes/orderRoutes');
const { consumeOrders } = require('./kafkaConsumer');
const app = express();
const port = 3001;

app.use(express.json());

mongoose.connect('mongodb://order-mongodb:27017/orders', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected for Order Service'))
    .catch(err => console.log(err));

consumeOrders();

app.use('/orders', orderRoutes);

app.listen(port, () => {
    console.log(`Order Service listening at http://localhost:${port}`);
});
