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

    SubscribeToQueue("PAYMENT_ORDERS.PAYMENT_INITIATED", async (data)=>{
        const emailHTMLTemplate=`
            <h1>Payment Initiated</h1>
            <p> Dear ${data.username || "Customer"},</p>
            <p>Your payment has been initiated successfully. We will notify you once the payment is completed.</p>
            <p>Amount: ${data.currency || ""} ${data.amount ?? ""} </p>
            <p>Transaction ID: ${data.orderId || "N/A"}</p>
            <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(data.email, "Payment Initiated", `Your payment of ${data.currency || ""} ${data.amount ?? ""} has been initiated. We will notify you once it's completed.`, emailHTMLTemplate);
    });

    SubscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data)=>{
        const displayName = data.username || (data.fullName ? `${data.fullName.firstName} ${data.fullName.lastName}` : "Customer");
        const emailHTMLTemplate=`
            <h1>Payment Completed</h1>
            <p> Dear ${displayName},</p>
            <p>We are pleased to inform you that your payment has been completed successfully.</p>
            <p>Amount: ${data.currency || ""} ${data.amount ?? ""} </p>
            <p>Transaction ID: ${data.orderId || data.paymentId || "N/A"}</p>
            <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(data.email, "Payment Completed", `Your payment of ${data.currency || ""} ${data.amount ?? ""} has been completed.`, emailHTMLTemplate);
    }); 


    SubscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async (data)=>{
        const displayName = data.username || (data.fullName ? `${data.fullName.firstName} ${data.fullName.lastName}` : "Customer");
        const emailHTMLTemplate=`
            <h1>Payment Failed</h1>
            <p> Dear ${displayName},</p>
            <p>We regret to inform you that your recent payment attempt has failed.</p>
            <p>Transaction ID: ${data.orderId || data.paymentId || "N/A"}</p>
            <p>Please check your payment details and try again. If you continue to experience issues, feel free to contact our support team for assistance.</p>
            <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(data.email, "Payment Failed", "Unfortunately, your payment could not be processed. Please try again.", emailHTMLTemplate);
    });

    SubscribeToQueue("PRODUCT_NOTIFICATION.product.created", async (data)=>{
        const emailHTMLTemplate=`
            <h1>New Product Created "${data.title}"</h1>
            <p>Dear Vendor,</p>
            <p>Your new product "${data.title}" has been successfully created and is now available on our platform.</p>
            <p>Product Details:</p>
            <ul>
                <li><strong>Name:</strong> ${data.title}</li>
                <li><strong>Description:</strong> ${data.description}</li>
                <li><strong>Price:</strong> ${data.price.amount} ${data.price.currency}</li>
                <li><strong>Category:</strong> ${data.category}</li>
            </ul>
            <p>If you have any questions or need further assistance, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br/>The Team</p>
        `;

        await sendEmail(data.email, "New Product Created", `Your product "${data.title}" has been created successfully!`, emailHTMLTemplate);
    });
         
    
}


