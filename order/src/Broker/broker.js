const amqplib = require('amqplib');


let channel,connection; 

async function connect(){
    if(connection) return connection;

    try{
        connection = await amqplib.connect(process.env.RABBITMQ_URL);
        console.log("Connected to RabbitMQP");
        channel = await connection.createChannel();
        
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