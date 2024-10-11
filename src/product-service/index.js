const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');
const { consumeProducts } = require('./kafkaConsumer');
const app = express();
const port = 3003;

app.use(express.json());

mongoose.connect('mongodb://product-mongodb:27017/products', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected for Product Service'))
    .catch(err => console.log(err));

consumeProducts();

app.use('/products', productRoutes);

app.listen(port, () => {
    console.log(`Product Service listening at http://localhost:${port}`);
});
