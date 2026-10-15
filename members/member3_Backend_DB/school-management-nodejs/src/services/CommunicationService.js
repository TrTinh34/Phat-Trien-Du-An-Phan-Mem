import { CommunicationRepository } from '../repositories/CommunicationRepository.js';
import { StudentRepository } from '../repositories/StudentRepository.js';
import { ClassRepository } from '../repositories/ClassRepository.js';

/**
 * CommunicationService — Business logic cho Sổ liên lạc phụ huynh.
 * Không chứa SQL, chỉ gọi Repository và transform dữ liệu.
 */
export class CommunicationService {

  /** Normalize notification DB row → DTO */
  static notifToDto(row) {
    return {
      id:         row.id,
      title:      row.title,
      content:    row.content,
      type:       row.type,
      senderId:   row.sender_id,
      recipients: row.recipients || [],
      sentAt:     row.sent_at,
      status:     row.status,
    };
  }

  /** Normalize message DB row → DTO */
  static msgToDto(row) {
    return {
      id:        row.id,
      studentId: row.student_id,
      className: row.class_name,
      from:      row.from_role,      // 'gv' | 'ph'
      text:      row.message,
      sentAt:    row.sent_at,
    };
  }

  /**
   * Lấy dữ liệu khởi tạo trang: classes + students của lớp mặc định + notifications.
   * @param {string|null} className - lớp đang được chọn
   */
  static async getPageData(className = null) {
    const [rawClasses, rawNotifs] = await Promise.all([
      ClassRepository.findAll(),
      CommunicationRepository.findAllNotifications(className),
    ]);

    const classes = rawClasses.map((c) => ({
      id:   c.class_name,
      name: c.class_name,
    }));

    const notifications = rawNotifs.map(this.notifToDto);

    return { classes, notifications };
  }

  /**
   * Lấy danh sách học sinh (để hiển thị phụ huynh) theo lớp.
   */
  static async getStudentsByClass(className) {
    const rows = await StudentRepository.findByClassName(className);
    return rows.map((s) => ({
      id:          s.student_code || s.studentCode,
      name:        s.full_name    || s.fullName,
      className:   s.class_name   || s.className,
      parentName:  s.parent_name  || s.parentName  || '',
      parentPhone: s.parent_phone || s.parentPhone || '',
    }));
  }

  /**
   * Gửi thông báo mới.
   */
  static async sendNotification({ title, content, type, senderId, recipients }) {
    if (!title?.trim())           throw new Error('Thiếu tiêu đề thông báo');
    if (!content?.trim())         throw new Error('Thiếu nội dung thông báo');
    if (!recipients?.length)      throw new Error('Chưa chọn lớp nhận thông báo');

    const created = await CommunicationRepository.createNotification({
      title:      title.trim(),
      content:    content.trim(),
      type:       type || 'general',
      senderId:   senderId || null,
      recipients,
      status:     'sent',
    });
    if (!created) throw new Error('Không thể lưu thông báo');
    return this.notifToDto(created);
  }

  /**
   * Lấy thread tin nhắn của một học sinh.
   */
  static async getThread(studentId) {
    const rows = await CommunicationRepository.findMessagesByStudent(studentId);
    return rows.map(this.msgToDto);
  }

  /**
   * Gửi tin nhắn mới vào thread.
   */
  static async sendMessage({ studentId, className, fromRole, message }) {
    if (!studentId) throw new Error('Thiếu studentId');
    if (!message?.trim()) throw new Error('Tin nhắn không được để trống');

    const created = await CommunicationRepository.createMessage({
      studentId,
      className: className || null,
      fromRole:  fromRole  || 'gv',
      message:   message.trim(),
    });
    if (!created) throw new Error('Không thể lưu tin nhắn');
    return this.msgToDto(created);
  }
}
