import { ClassRepository } from '../repositories/ClassRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';

export class ClassController {
  static async getClasses(req, res) {
    try {
      const classes = await ClassRepository.findAll();
      return res.json(classes);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async createClass(req, res) {
    try {
      const created = await ClassRepository.create(req.body);
      return res.status(201).json(created);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /** PUT /api/classes/:className/homeroom — gán GVCN chủ nhiệm cho lớp */
  static async assignHomeroom(req, res) {
    try {
      const { className } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'Thiếu userId' });
      }

      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
      }
      if (user.role !== 'GVCN') {
        return res.status(400).json({ success: false, message: 'Tài khoản không có vai trò GVCN' });
      }

      // Xóa phân công cũ của user này trước khi gán lớp mới
      await ClassRepository.removeHomeroom(userId);
      // Gán lớp mới
      const updated = await ClassRepository.assignHomeroom(className, userId, user.full_name);
      if (!updated) {
        return res.status(404).json({ success: false, message: `Không tìm thấy lớp ${className}` });
      }

      return res.json({
        success: true,
        className,
        gvcnName: user.full_name,
        homeroom_teacher_id: userId,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /** DELETE /api/classes/:className/homeroom — hủy phân công chủ nhiệm của lớp */
  static async removeHomeroom(req, res) {
    try {
      const { className } = req.params;
      await ClassRepository.removeHomeroomByClass(className);
      return res.json({ success: true, className });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
