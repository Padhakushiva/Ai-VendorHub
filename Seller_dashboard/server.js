require('dotenv').config();

const app = require('./src/app');
const http = require('http');
const { connectDB } = require('./src/DB/db');
const listner = require('./src/Broker/listner');
const { connect } = require('./src/Broker/broker');
const { initDashboardSocket } = require('./src/sockets/dashboard.socket');

const httpServer = http.createServer(app);
initDashboardSocket(httpServer);

connectDB();
connect().then(()=>{
    listner();
}).catch((error)=>{
    console.warn("Seller dashboard listener not started:", error.message);
})
const PORT = process.env.PORT || 3007;
httpServer.listen(PORT,()=>{
    console.log(`Dashboard Service is running at ${PORT}`);
})
