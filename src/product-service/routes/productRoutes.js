const express = require('express');
const Product = require('../models/Product');
const redisClient = require('../redisClient');
const { produceProduct } = require('../kafkaProducer');
const router = express.Router();
const { promisify } = require('util');

const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

const updateAllProductsCache = async () => {
    try {
        const allProducts = await Product.find();
        await setAsync('all-products', JSON.stringify(allProducts));
        console.log('All-products cache updated.');
    } catch (error) {
        console.error('Error updating all-products cache:', error);
    }
};

router.get('/', async (req, res) => {
    console.log("Endpoint hit: Retrieving list of all products");
    try {
        const cacheKey = 'all-products';
        const cachedProducts = await getAsync(cacheKey);
        if (cachedProducts) {
            console.log("Products retrieved from cache:", JSON.parse(cachedProducts));
            return res.send(JSON.parse(cachedProducts));
        }
        console.log("Cache miss, fetching from MongoDB");
        const products = await Product.find({});
        console.log("Products retrieved from MongoDB:", products);
        await setAsync(cacheKey, JSON.stringify(products));
        res.send(products);
    } catch (error) {
        console.error('Error retrieving products:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const cachedProduct = await getAsync(`product:${id}`);
        if (cachedProduct) {
            console.log('Product retrieved from cache');
            return res.send(JSON.parse(cachedProduct));
        }
        const product = await Product.findById(id);
        if (product) {
            await setAsync(`product:${id}`, JSON.stringify(product));
            console.log('Product retrieved from MongoDB and cached');
            return res.send(product);
        }
        res.status(404).send('Product not found');
    } catch (error) {
        console.error('Error retrieving product:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/', async (req, res) => {
    const product = new Product(req.body);
    try {
        await product.save();
        await setAsync(`product:${product._id}`, JSON.stringify(product));
        await produceProduct(product);
        await updateAllProductsCache();
        res.status(201).send(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
