const amqplib = require('amqplib');


let channel,connection; 

function resetBroker() {
    channel = null;
    connection = null;
}

async function connect(){
    if(connection) return connection;

    try{
        connection = await amqplib.connect(process.env.RABBITMQ_URL);
        console.log("Connected to RabbitMQP");
        connection.on('error', (error) => {
            console.warn("RabbitMQ connection error. Product service will keep running:", error.message);
            resetBroker();
        });
        connection.on('close', () => {
            console.warn("RabbitMQ connection closed. Product events will retry on next publish.");
            resetBroker();
        });
        channel = await connection.createChannel();
        channel.on('error', (error) => {
            console.warn("RabbitMQ channel error. Product service will keep running:", error.message);
            channel = null;
        });
        
    }
    catch(error){
        console.error("Error connecting to RabbitMQ:", error.message);
        resetBroker();
        return null;
    }
}

async function publishToQueue(queueName, data={}){
    if(!channel || ! connection)  await connect();
    if(!channel || !connection) {
        console.warn("RabbitMQ unavailable. Skipping product event:", queueName);
        return;
    }

    await channel.assertQueue(queueName, { 
        durable: true
     });

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));

    console.log("Message Sent to queue : ",queueName,data);
    
}

async function SubscribeToQueue(queueName, callback){
    if(!channel || ! connection)  await connect();

    await channel.assertQueue(queueName, { 
        durable: true
     });

    channel.consume(queueName, async (msg) => {
        if(msg !== null){
            const data = JSON.parse(msg.content.toString());
            callback(data);
            channel.ack(msg);
        }
    });
}

module.exports = {
    connect,
    publishToQueue,
    SubscribeToQueue,
    channel,
    connection
}
