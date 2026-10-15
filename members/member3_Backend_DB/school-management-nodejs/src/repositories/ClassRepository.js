import { querySafe as query } from '../config/db.js';

export class ClassRepository {
  static async findAll() {
    const res = await query('SELECT * FROM school_classes ORDER BY class_name ASC');
    return res.rows;
  }

  /** Tìm lớp theo tên GVCN — dùng cho phân quyền dữ liệu GVCN. */
  static async findByGvcnName(gvcnName) {
    const res = await query(
      'SELECT * FROM school_classes WHERE gvcn_name = $1 LIMIT 1',
      [gvcnName]
    );
    return res?.rows[0] ?? null;
  }

  /** Tìm lớp theo homeroom_teacher_id FK — dùng cho phân quyền GVCN an toàn. */
  static async findByHomeroomTeacherId(userId) {
    const res = await query(
      'SELECT * FROM school_classes WHERE homeroom_teacher_id = $1 LIMIT 1',
      [userId]
    );
    return res?.rows[0] ?? null;
  }

  static async create(sc) {
    const res = await query(
      'INSERT INTO school_classes (class_name, grade_level, gvcn_name) VALUES ($1, $2, $3) RETURNING *',
      [sc.className, sc.gradeLevel, sc.gvcnName]
    );
    return res.rows[0];
  }
}

