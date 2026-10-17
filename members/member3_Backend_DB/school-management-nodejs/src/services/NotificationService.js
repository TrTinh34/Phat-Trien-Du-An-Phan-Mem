import { NotificationRepository } from '../repositories/NotificationRepository.js';

/**
 * NotificationService — Business logic cho notifications.
 * Không chứa SQL.
 */
export class NotificationService {
  /**
   * Tạo và gửi notification.
   */
  static async notify({ title, content, type, senderId, senderRole, recipients, relatedClass, relatedSemester }) {
    return NotificationRepository.insert({
      title,
      content,
      type,
      senderId,
      senderRole,
      recipients,
      relatedClass,
      relatedSemester,
    });
  }

  /**
   * Lấy danh sách notifications của một user.
   * Trả về mảng DTO với camelCase keys.
   */
  static async getForUser(username) {
    const rows = await NotificationRepository.findByRecipient(username);
    return rows.map(row => ({
      id:              row.id,
      title:           row.title,
      content:         row.content,
      type:            row.type,
      senderRole:      row.sender_role,
      relatedClass:    row.related_class,
      relatedSemester: row.related_semester,
      sentAt:          row.sent_at,
      readAt:          row.read_at,
    }));
  }

  /**
   * Đánh dấu notification đã đọc.
   */
  static async markRead(id) {
    return NotificationRepository.markRead(id);
  }

  /**
   * Lấy số notifications chưa đọc.
   */
  static async getUnreadCount(username) {
    const raw = await NotificationRepository.findUnreadCount(username);
    return parseInt(raw, 10) || 0;
  }
}
