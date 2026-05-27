const express = require('express');
const createAuthMiddleware = require('../middleware/auth.middleware');
const controller = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', createAuthMiddleware(['user', 'seller', 'admin']), controller.getMyNotifications);
router.get('/unread-count', createAuthMiddleware(['user', 'seller', 'admin']), controller.getUnreadCount);
router.get('/admin/all', createAuthMiddleware(['admin']), controller.getAllNotifications);
router.post('/', createAuthMiddleware(['admin']), controller.createNotification);
router.patch('/read-all', createAuthMiddleware(['user', 'seller', 'admin']), controller.markAllNotificationsRead);
router.post('/:id/retry-email', createAuthMiddleware(['admin']), controller.retryEmailDelivery);
router.get('/:id', createAuthMiddleware(['user', 'seller', 'admin']), controller.getNotificationById);
router.patch('/:id/read', createAuthMiddleware(['user', 'seller', 'admin']), controller.markNotificationRead);
router.delete('/:id', createAuthMiddleware(['user', 'seller', 'admin']), controller.deleteNotification);

module.exports = router;
