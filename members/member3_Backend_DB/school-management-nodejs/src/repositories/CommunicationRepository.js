import { querySafe as query } from '../config/db.js';

/**
 * CommunicationRepository — Tầng truy cập dữ liệu cho Sổ liên lạc.
 * Chỉ chứa SQL thuần, không có business logic.
 */
export class CommunicationRepository {

  // ── Notifications ────────────────────────────────────────────────────────

  /**
   * Lấy toàn bộ thông báo, lọc theo lớp nếu cần.
   * @param {string|null} className - lọc theo lớp nhận (optional)
   */
  static async findAllNotifications(className = null) {
    let res;
    if (className) {
      res = await query(
        `SELECT * FROM notifications
         WHERE $1 = ANY(recipients)
         ORDER BY sent_at DESC`,
        [className]
      );
    } else {
      res = await query(
        `SELECT * FROM notifications ORDER BY sent_at DESC`
      );
    }
    if (!res) return [];
    return res.rows;
  }

  /**
   * Tạo thông báo mới.
   * @param {{ title, content, type, senderId, recipients, status }} notif
   */
  static async createNotification(notif) {
    const res = await query(
      `INSERT INTO notifications (title, content, type, sender_id, recipients, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        notif.title,
        notif.content,
        notif.type    || 'general',
        notif.senderId || null,
        notif.recipients || [],
        notif.status  || 'sent',
      ]
    );
    if (!res) return null;
    return res.rows[0];
  }

  // ── Parent messages (chat threads) ───────────────────────────────────────

  /**
   * Lấy toàn bộ tin nhắn của một học sinh (thread giữa GV và phụ huynh).
   * @param {string} studentId - student_code
   */
  static async findMessagesByStudent(studentId) {
    const res = await query(
      `SELECT * FROM parent_messages
       WHERE student_id = $1
       ORDER BY sent_at ASC`,
      [studentId]
    );
    if (!res) return [];
    return res.rows;
  }

  /**
   * Lưu một tin nhắn mới vào thread.
   * @param {{ studentId, className, fromRole, message }} msg
   */
  static async createMessage(msg) {
    const res = await query(
      `INSERT INTO parent_messages (student_id, class_name, from_role, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [msg.studentId, msg.className || null, msg.fromRole || 'gv', msg.message]
    );
    if (!res) return null;
    return res.rows[0];
  }
}
