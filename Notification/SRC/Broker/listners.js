const { SubscribeToQueue } = require('./broker');
const { createAndDeliverNotification } = require('../services/notification.service');

const money = (data = {}) => `${data.currency || data.paymentCurrency || 'INR'} ${data.amount ?? data.totalAmount ?? ''}`.trim();

const fullName = (data = {}) => {
  if (data.fullName) return `${data.fullName.firstName || ''} ${data.fullName.lastName || ''}`.trim();
  return data.username || data.name || data.email || 'Customer';
};

const wrapHtml = (title, body) => `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
    <h1 style="margin-bottom:12px">${title}</h1>
    ${body}
    <p style="margin-top:24px">Best regards,<br/>AI VendorHub Team</p>
  </div>
`;

async function subscribe(queueName, handler) {
  await SubscribeToQueue(queueName, handler);
  console.log(`Notification listener attached: ${queueName}`);
}

async function notify(data, overrides) {
  return createAndDeliverNotification({
    event: data.event || overrides.event,
    type: overrides.type,
    user: overrides.user || data.userId || data.user || data.sellerId || data.customerId,
    email: overrides.email ?? data.email,
    title: overrides.title,
    message: overrides.message,
    html: overrides.html,
    priority: overrides.priority || data.priority || 'normal',
    metadata: data,
  });
}

module.exports = async function setupNotificationListeners() {
  await subscribe('AUTH_NOTIFICATION.user.created', async (data) => {
    const name = fullName(data);
    await notify(data, {
      event: 'user.created',
      type: 'auth',
      title: 'Welcome to AI VendorHub',
      message: `Hello ${name}, your account has been created successfully.`,
      html: wrapHtml(
        'Welcome to AI VendorHub',
        `<p>Hello ${name},</p><p>Your account has been created successfully with email <strong>${data.email || 'your email'}</strong>.</p>`,
      ),
    });
  });

  await subscribe('AUTH_NOTIFICATION.user.updated', async (data) => {
    if (!data.emailVerified || !Array.isArray(data.changes) || !data.changes.includes('emailVerified')) return;

    await notify(data, {
      event: 'user.updated',
      type: 'auth',
      title: 'Email Verified',
      message: 'Your email address has been verified successfully.',
      html: wrapHtml(
        'Email Verified',
        `<p>Dear ${fullName(data)},</p><p>Your email address has been verified successfully.</p>`,
      ),
    });
  });

  const handlePasswordReset = async (data) => {
    await notify(data, {
      event: data.event || 'auth.password_reset_requested',
      type: 'auth',
      title: 'Password Reset Requested',
      message: 'A password reset link was generated for your account.',
      priority: 'high',
      html: wrapHtml(
        'Password Reset Requested',
        `<p>Dear ${fullName(data)},</p><p>Use the secure reset link sent by the auth service to reset your password.</p><p>If this was not you, please secure your account immediately.</p>`,
      ),
    });
  };
  await subscribe('AUTH_NOTIFICATION.USER_PASSWORD_RESET', handlePasswordReset);
  await subscribe('AUTH_NOTIFICATION.SELLER_PASSWORD_RESET', handlePasswordReset);

  await subscribe('PAYMENT_NOTIFICATION.PAYMENT_COMPLETED', async (data) => {
    await notify(data, {
      event: 'payment.success',
      type: 'payment',
      title: 'Payment Completed',
      message: `Your payment of ${money(data)} has been completed successfully.`,
      html: wrapHtml(
        'Payment Completed',
        `<p>Dear ${fullName(data)},</p><p>Your payment has been completed successfully.</p><p><strong>Amount:</strong> ${money(data)}</p><p><strong>Transaction:</strong> ${data.transactionId || data.paymentId || data.orderId || 'N/A'}</p>`,
      ),
    });
  });

  await subscribe('PAYMENT_NOTIFICATION.PAYMENT_FAILED', async (data) => {
    await notify(data, {
      event: 'payment.failed',
      type: 'payment',
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please try again.',
      priority: 'high',
      html: wrapHtml(
        'Payment Failed',
        `<p>Dear ${fullName(data)},</p><p>Your recent payment attempt failed.</p><p><strong>Transaction:</strong> ${data.transactionId || data.paymentId || data.orderId || 'N/A'}</p>`,
      ),
    });
  });

  await subscribe('PAYMENT_EVENTS.PAYMENT_LIFECYCLE', async (data) => {
    if (data.event === 'payment.success') {
      await notify(data, {
        event: 'payment.success',
        type: 'payment',
        title: 'Payment Completed',
        message: `Your payment of ${money(data)} has been completed successfully.`,
        html: wrapHtml('Payment Completed', `<p>Your payment of <strong>${money(data)}</strong> has been completed.</p>`),
      });
    }

    if (data.event === 'payment.failed') {
      await notify(data, {
        event: 'payment.failed',
        type: 'payment',
        title: 'Payment Failed',
        message: 'Your payment could not be processed. Please try again.',
        priority: 'high',
        html: wrapHtml('Payment Failed', '<p>Your payment could not be processed. Please try again.</p>'),
      });
    }
  });

  await subscribe('PRODUCT_NOTIFICATION.product.created', async (data) => {
    await notify(data, {
      event: 'product.created',
      type: 'product',
      user: data.sellerId,
      title: 'Product Created',
      message: `Your product "${data.title || data.name || 'Product'}" has been created successfully.`,
      html: wrapHtml(
        'Product Created',
        `<p>Dear Vendor,</p><p>Your product <strong>${data.title || data.name || 'Product'}</strong> has been created successfully.</p><p><strong>Category:</strong> ${data.category || 'N/A'}</p>`,
      ),
    });
  });

  await subscribe('PRODUCT_NOTIFICATION.product.updated', async (data) => {
    await notify(data, {
      event: 'product.updated',
      type: 'product',
      user: data.sellerId,
      title: 'Product Updated',
      message: `Your product "${data.title || data.name || 'Product'}" has been updated successfully.`,
      html: wrapHtml(
        'Product Updated',
        `<p>Dear Vendor,</p><p>Your product <strong>${data.title || data.name || 'Product'}</strong> has been updated successfully.</p><p><strong>Status:</strong> ${data.status || 'active'}</p>`,
      ),
    });
  });

  await subscribe('PRODUCT_NOTIFICATION.product.deleted', async (data) => {
    const action = data.deletionType === 'soft' ? 'archived' : 'deleted';
    await notify(data, {
      event: 'product.deleted',
      type: 'product',
      user: data.sellerId,
      title: `Product ${action}`,
      message: `Your product "${data.title || data.name || 'Product'}" has been ${action}.`,
      priority: 'high',
      html: wrapHtml(
        `Product ${action}`,
        `<p>Dear Vendor,</p><p>Your product <strong>${data.title || data.name || 'Product'}</strong> has been ${action}.</p>`,
      ),
    });
  });

  await subscribe('ORDER_NOTIFICATION.ORDER_CANCELLED', async (data) => {
    await notify(data, {
      event: data.event || 'order.cancelled',
      type: 'order',
      title: 'Order Cancelled',
      message: `Your order ${data.orderId || ''} has been cancelled.`.trim(),
      priority: 'high',
      html: wrapHtml(
        'Order Cancelled',
        `<p>Your order <strong>${data.orderId || 'N/A'}</strong> has been cancelled.</p><p><strong>Reason:</strong> ${data.reason || 'N/A'}</p>`,
      ),
    });
  });

  await subscribe('ORDER_LIFECYCLE.EVENT', async (data) => {
    if (!data.userId && !data.email) return;

    const status = data.status || data.event || 'updated';
    await notify(data, {
      event: data.event || 'order.updated',
      type: 'order',
      title: 'Order Update',
      message: `Your order ${data.orderId || ''} status is ${status}.`.trim(),
      html: wrapHtml(
        'Order Update',
        `<p>Your order <strong>${data.orderId || 'N/A'}</strong> has a new status: <strong>${status}</strong>.</p>`,
      ),
    });
  });
};
