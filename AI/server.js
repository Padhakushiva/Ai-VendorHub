require('dotenv').config();
const app=require('./src/app');
const http=require('http');
const {initSocketServer}=require('./src/sokcets/sockets.server');

const httpServer=http.createServer(app);


initSocketServer(httpServer)


httpServer.listen(3005,()=>{
    console.log('AI Server is running on port 3005');
})
