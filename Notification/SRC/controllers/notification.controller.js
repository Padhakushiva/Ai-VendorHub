const mongoose = require('mongoose');
const Notification = require('../models/notification.model');
const {
  createAndDeliverNotification,
  retryNotificationDelivery,
} = require('../services/notification.service');

const getUserId = (user = {}) => user.id || user._id || user.userId;
const isAdmin = (user = {}) => user.role === 'admin';

function buildListMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

async function getMyNotifications(req, res) {
  const userId = getUserId(req.user)?.toString();
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { user: userId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.deliveryStatus) filter.deliveryStatus = req.query.deliveryStatus;

  try {
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, status: 'unread' }),
    ]);

    return res.status(200).json({
      notifications,
      unreadCount,
      meta: buildListMeta(total, page, limit),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
}

async function getUnreadCount(req, res) {
  const userId = getUserId(req.user)?.toString();

  try {
    const unreadCount = await Notification.countDocuments({ user: userId, status: 'unread' });
    return res.status(200).json({ unreadCount });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
}

async function getAllNotifications(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.userId) filter.user = req.query.userId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.deliveryStatus) filter.deliveryStatus = req.query.deliveryStatus;
  if (req.query.event) filter.event = req.query.event;

  try {
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      notifications,
      meta: buildListMeta(total, page, limit),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
}

async function getNotificationById(req, res) {
  const userId = getUserId(req.user)?.toString();
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await Notification.findById(id).lean();
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const isOwner = notification.user?.toString?.() === userId;
    if (!isOwner && !isAdmin(req.user)) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this notification' });
    }

    return res.status(200).json({ notification });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching notification', error: error.message });
  }
}

async function markNotificationRead(req, res) {
  const userId = getUserId(req.user)?.toString();
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOneAndUpdate(
      isAdmin(req.user) ? { _id: id } : { _id: id, user: userId },
      { status: 'read', readAt: new Date() },
      { new: true },
    );

    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    return res.status(200).json({
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
}

async function markAllNotificationsRead(req, res) {
  const userId = getUserId(req.user)?.toString();

  try {
    const result = await Notification.updateMany(
      { user: userId, status: 'unread' },
      { status: 'read', readAt: new Date() },
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
}

async function deleteNotification(req, res) {
  const userId = getUserId(req.user)?.toString();
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOneAndDelete(
      isAdmin(req.user) ? { _id: id } : { _id: id, user: userId },
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
}

async function createNotification(req, res) {
  try {
    if (!req.body.title || !req.body.message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    const notification = await createAndDeliverNotification({
      event: req.body.event || 'notification.manual',
      type: req.body.type || 'manual',
      user: req.body.userId,
      email: req.body.email,
      title: req.body.title,
      message: req.body.message,
      html: req.body.html,
      channel: req.body.channel || 'in_app',
      priority: req.body.priority || 'normal',
      metadata: req.body.metadata || {},
    });

    return res.status(201).json({ notification });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
}

async function retryEmailDelivery(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await retryNotificationDelivery(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    return res.status(200).json({
      message: 'Notification delivery retry completed',
      notification,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrying notification delivery', error: error.message });
  }
}

module.exports = {
  getMyNotifications,
  getUnreadCount,
  getAllNotifications,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  createNotification,
  retryEmailDelivery,
};
