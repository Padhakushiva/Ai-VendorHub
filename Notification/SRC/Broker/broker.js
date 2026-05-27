const amqplib = require('amqplib');


let channel,connection; 

async function connect(){
    if(channel && connection) return connection;

    if (!process.env.RABBITMQ_URL) {
        throw new Error("RABBITMQ_URL is not configured");
    }

    try{
        connection = await amqplib.connect(process.env.RABBITMQ_URL);
        connection.on("error", (error) => {
            console.warn("RabbitMQ connection error:", error.message);
            channel = null;
            connection = null;
        });
        connection.on("close", () => {
            console.warn("RabbitMQ connection closed");
            channel = null;
            connection = null;
        });

        console.log("Connected to RabbitMQ");
        channel = await connection.createChannel();
        channel.on("error", (error) => {
            console.warn("RabbitMQ channel error:", error.message);
            channel = null;
        });
        channel.on("close", () => {
            console.warn("RabbitMQ channel closed");
            channel = null;
        });
        channel.prefetch(Number(process.env.RABBITMQ_PREFETCH) || 10);
        
        return connection;
    }
    catch(error){
        console.error("Error connecting to RabbitMQ:", error);
        throw error;
    }
}

async function publishToQueue(queueName, data={}){
    if(!channel || ! connection)  await connect();

    await channel.assertQueue(queueName, { 
        durable: true
     });

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
        persistent: true,
        contentType: "application/json",
    });

    console.log("Message Sent to queue : ",queueName,data);
    
}

async function SubscribeToQueue(queueName, callback){
    if(!channel || ! connection)  await connect();

    await channel.assertQueue(queueName, { 
        durable: true
     });

    return channel.consume(queueName, async (msg) => {
        if(msg !== null){
            try {
                const data = JSON.parse(msg.content.toString());
                await callback(data);
                channel.ack(msg);
            } catch (error) {
                console.error(`Error processing queue ${queueName}:`, error.message);
                channel.nack(msg, false, false);
            }
        }
    }, { noAck: false });
}

module.exports = {
    connect,
    publishToQueue,
    SubscribeToQueue,
    channel,
    connection
}
