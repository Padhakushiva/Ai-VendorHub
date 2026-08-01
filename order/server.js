require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');
const {connect}=require('./src/Broker/broker');

connectDB();
connect().then(() => {
    const { setupListeners } = require('./src/Broker/listener');
    setupListeners();
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Order service is running on port ${PORT}`);
});