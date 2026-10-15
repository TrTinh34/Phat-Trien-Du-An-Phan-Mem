import { CommunicationService } from '../services/CommunicationService.js';

/**
 * CommunicationController — Tầng HTTP cho Sổ liên lạc phụ huynh.
 * Chỉ nhận request, gọi Service, trả response — không chứa SQL hay business logic.
 */
export class CommunicationController {

  /**
   * GET /api/communication/page-data?className=10A1
   * Trả về: { classes, notifications }
   */
  static async getPageData(req, res) {
    try {
      const { className } = req.query;
      const data = await CommunicationService.getPageData(className || null);
      return res.json({ success: true, ...data });
    } catch (err) {
      console.error('[CommunicationController] getPageData error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/communication/students?className=10A1
   * Trả về danh sách học sinh (phụ huynh) theo lớp.
   */
  static async getStudents(req, res) {
    try {
      const { className } = req.query;
      if (!className) {
        return res.status(400).json({ success: false, message: 'Thiếu tham số className' });
      }
      const students = await CommunicationService.getStudentsByClass(className);
      return res.json({ success: true, data: students });
    } catch (err) {
      console.error('[CommunicationController] getStudents error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/communication/notifications
   * Body: { title, content, type, senderId, recipients }
   * Gửi thông báo mới.
   */
  static async sendNotification(req, res) {
    try {
      const { title, content, type, senderId, recipients } = req.body;
      const notif = await CommunicationService.sendNotification({
        title, content, type, senderId, recipients,
      });
      return res.status(201).json({ success: true, data: notif });
    } catch (err) {
      console.error('[CommunicationController] sendNotification error:', err);
      const status = err.message.startsWith('Thiếu') ? 400 : 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/communication/messages?studentId=HS001
   * Lấy thread tin nhắn của một học sinh.
   */
  static async getThread(req, res) {
    try {
      const { studentId } = req.query;
      if (!studentId) {
        return res.status(400).json({ success: false, message: 'Thiếu tham số studentId' });
      }
      const messages = await CommunicationService.getThread(studentId);
      return res.json({ success: true, data: messages });
    } catch (err) {
      console.error('[CommunicationController] getThread error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/communication/messages
   * Body: { studentId, className, fromRole, message }
   * Gửi tin nhắn mới vào thread.
   */
  static async sendMessage(req, res) {
    try {
      const { studentId, className, fromRole, message } = req.body;
      const msg = await CommunicationService.sendMessage({
        studentId, className, fromRole, message,
      });
      return res.status(201).json({ success: true, data: msg });
    } catch (err) {
      console.error('[CommunicationController] sendMessage error:', err);
      const status = err.message.startsWith('Thiếu') ? 400 : 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
}
