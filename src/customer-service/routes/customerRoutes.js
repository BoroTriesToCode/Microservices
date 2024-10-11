const express = require('express');
const Customer = require('../models/Customer');
const redisClient = require('../redisClient');
const { produceCustomer } = require('../kafkaProducer');
const router = express.Router();
const { promisify } = require('util');

const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

const updateAllCustomersCache = async () => {
    try {
        const allCustomers = await Customer.find({});
        await setAsync('all-customers', JSON.stringify(allCustomers));
        console.log('All-customers cache updated.');
    } catch (error) {
        console.error('Error updating all-customers cache:', error);
    }
};

router.get('/', async (req, res) => {
    console.log("Endpoint hit: Retrieving list of all customers");
    try {
        const cacheKey = 'all-customers';
        const cachedCustomers = await getAsync(cacheKey);
        if (cachedCustomers) {
            console.log("Customers retrieved from cache:", JSON.parse(cachedCustomers));
            return res.send(JSON.parse(cachedCustomers));
        }
        console.log("Cache miss, fetching from MongoDB");
        const customers = await Customer.find({});
        console.log("Customers retrieved from MongoDB:", customers);
        await setAsync(cacheKey, JSON.stringify(customers));
        res.send(customers);
    } catch (error) {
        console.error('Error retrieving customers:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const cachedCustomer = await getAsync(`customer:${id}`);
        if (cachedCustomer) {
            console.log('Customer retrieved from cache');
            return res.send(JSON.parse(cachedCustomer));
        }
        const customer = await Customer.findById(id);
        if (customer) {
            await setAsync(`customer:${id}`, JSON.stringify(customer));
            console.log('Customer retrieved from MongoDB and cached');
            return res.send(customer);
        }
        res.status(404).send('Customer not found');
    } catch (error) {
        console.error('Error retrieving customer:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/', async (req, res) => {
    const customer = new Customer(req.body);
    try {
        await customer.save();
        await setAsync(`customer:${customer._id}`, JSON.stringify(customer));
        await produceCustomer(customer);
        await updateAllCustomersCache();
        res.status(201).send(customer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
