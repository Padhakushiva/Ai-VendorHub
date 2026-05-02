const {SubscribeToQueue}=require('./broker');

const {sendEmail}=require('../email');
module.exports=function(){
    SubscribeToQueue("AUTH_NOTIFICATION.USER_CREATED", async (data)=>{
        const emailHTMLTemplate=`
            <h1>Welcome to our platform, ${data.fullName.firstName + " " + data.fullName.lastName || " "}!</h1>
            <p>Your account has been successfully created with the email: ${data.email}.</p>
            <p>We're excited to have you on board. If you have any questions or need assistance, feel free to reach out to our support team.</p>
            <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(data.email, "Welcome to Our Platform!", `Hello ${data.fullName.firstName + " " + data.fullName.lastName}, welcome to our platform!`, emailHTMLTemplate);
    })

    SubscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data)=>{
        const emailHTMLTemplate=`
            <h1>Payment Completed</h1>
            <p> Dear ${data.fullName.firstName + " " + data.fullName.lastName || " "},</p>
            <p>We are pleased to inform you that your payment has been completed successfully.</p>
            <p>Amount: ${data.currency} ${data.amount} </p>
            <p>Transaction ID: ${data.OrderId}</p>
            <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(data.email, "Payment Completed", `Your payment of ${data.currency} ${data.amount.toFixed(2)} has been completed.`, emailHTMLTemplate);
    }); 


    SubscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async (data)=>{
        const emailHTMLTemplate=`
            <h1>Payment Failed</h1>
            <p> Dear ${data.fullName.firstName + " " + data.fullName.lastName || " "},</p>
            <p>We regret to inform you that your recent payment attempt has failed.</p>
            <p>Amount: ${data.currency} ${data.amount} </p>
            <p>Transaction ID: ${data.OrderId}</p>
            <p>Please check your payment details and try again. If you continue to experience issues, feel free to contact our support team for assistance.</p>
            <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(data.email, "Payment Failed", `Unfortunately, your payment of ${data.currency} ${data.amount} could not be processed. Please try again.`, emailHTMLTemplate);
    });
         
}


