require('dotenv').config();
const app= require('./src/app');
const connectDB = require('./src/DB/db');

const {connect}= require('./src/Broker/broker');

connectDB();
connect();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Product Server is running on port ${PORT}`);
});