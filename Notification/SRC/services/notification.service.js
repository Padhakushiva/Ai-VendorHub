const Notification = require('../models/notification.model');
const { sendEmail } = require('../email');

const getUserIdFromPayload = (data = {}) => data.userId || data.user || data.sellerId || data.customerId;
const normalizeUserId = (value) => (value ? value.toString() : undefined);

async function createAndDeliverNotification({
  event,
  type = 'general',
  user,
  email,
  title,
  message,
  html,
  channel,
  priority = 'normal',
  metadata = {},
}) {
  const dedupeValue = metadata.paymentId || metadata.gatewayPaymentId || metadata.notificationKey;
  if (event && dedupeValue) {
    const existing = await Notification.findOne({
      event,
      $or: [
        { 'metadata.paymentId': dedupeValue },
        { 'metadata.gatewayPaymentId': dedupeValue },
        { 'metadata.notificationKey': dedupeValue },
      ],
    });

    if (existing) return existing;
  }

  const resolvedChannel = channel || (email ? 'email' : 'in_app');
  const notification = await Notification.create({
    user: normalizeUserId(user || getUserIdFromPayload(metadata)),
    email,
    title,
    message,
    html,
    channel: resolvedChannel,
    type,
    event,
    priority,
    metadata,
    deliveryStatus: resolvedChannel === 'email' && email ? 'pending' : 'skipped',
  });

  if (notification.channel !== 'email' || !email) return notification;

  try {
    const result = await sendEmail(email, title, message, html);
    if (result?.skipped) {
      notification.deliveryStatus = 'skipped';
      notification.error = result.reason;
    } else {
      notification.deliveryStatus = 'sent';
      notification.sentAt = new Date();
      notification.error = undefined;
    }
  } catch (error) {
    notification.deliveryStatus = 'failed';
    notification.failedAt = new Date();
    notification.error = error.message;
  }

  await notification.save();
  return notification;
}

async function retryNotificationDelivery(notificationId) {
  const notification = await Notification.findById(notificationId);
  if (!notification) return null;

  if (notification.channel !== 'email' || !notification.email) {
    notification.deliveryStatus = 'skipped';
    notification.error = 'Retry skipped because notification is not email based';
    await notification.save();
    return notification;
  }

  try {
    const result = await sendEmail(notification.email, notification.title, notification.message, notification.html);
    notification.retryCount += 1;
    if (result?.skipped) {
      notification.deliveryStatus = 'skipped';
      notification.error = result.reason;
    } else {
      notification.deliveryStatus = 'sent';
      notification.sentAt = new Date();
      notification.failedAt = undefined;
      notification.error = undefined;
    }
  } catch (error) {
    notification.retryCount += 1;
    notification.deliveryStatus = 'failed';
    notification.failedAt = new Date();
    notification.error = error.message;
  }

  await notification.save();
  return notification;
}

module.exports = {
  createAndDeliverNotification,
  retryNotificationDelivery,
};
