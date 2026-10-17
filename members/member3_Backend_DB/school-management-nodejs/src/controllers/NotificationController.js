import { NotificationService } from '../services/NotificationService.js';

/**
 * NotificationController — Tầng HTTP cho notifications.
 * Chỉ nhận request, gọi Service, trả response — không chứa SQL hay business logic.
 */
export class NotificationController {
  /**
   * GET /api/notifications
   * Lấy danh sách notifications của user đang đăng nhập.
   */
  static async getNotifications(req, res) {
    try {
      const username = req.user?.username;
      const data = await NotificationService.getForUser(username);
      return res.json({ success: true, data });
    } catch (err) {
      console.error('[NotificationController] getNotifications error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Đánh dấu notification đã đọc.
   */
  static async markRead(req, res) {
    try {
      const { id } = req.params;
      await NotificationService.markRead(id);
      return res.json({ success: true });
    } catch (err) {
      console.error('[NotificationController] markRead error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Lấy số notifications chưa đọc của user đang đăng nhập.
   */
  static async getUnreadCount(req, res) {
    try {
      const username = req.user?.username;
      const count = await NotificationService.getUnreadCount(username);
      return res.json({ success: true, count });
    } catch (err) {
      console.error('[NotificationController] getUnreadCount error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
