import { querySafe as query } from '../config/db.js';



export class StudentRepository {
  static async findAll() {
    const res = await query('SELECT * FROM students ORDER BY id ASC');
    if (res && res.rows) return res.rows;
    return memStudents;
  }

  static async findById(id) {
    const res = await query('SELECT * FROM students WHERE id = $1', [id]);
    if (res && res.rows) return res.rows[0] || null;
    return memStudents.find(s => s.id === parseInt(id, 10)) || null;
  }

  static async findByStudentCode(studentCode) {
    const res = await query('SELECT * FROM students WHERE student_code = $1', [studentCode]);
    if (res && res.rows) return res.rows[0] || null;
    return memStudents.find(s => s.student_code === studentCode || s.studentCode === studentCode) || null;
  }

  static async findByClassName(className) {
    const res = await query('SELECT * FROM students WHERE class_name = $1 ORDER BY full_name ASC', [className]);
    if (res && res.rows) return res.rows;
    return memStudents.filter(s => s.class_name === className || s.className === className);
  }

  static async create(s) {
    const res = await query(
      `INSERT INTO students (student_code, full_name, gender, dob, class_name, parent_name, parent_phone, gpa, academic_rank, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [s.studentCode, s.fullName, s.gender, s.dob || s.dateOfBirth, s.className, s.parentName, s.parentPhone, s.gpa, s.academicRank, s.status || 'ACTIVE']
    );
    if (res && res.rows && res.rows.length > 0) return res.rows[0];

    const newObj = {
      id: memStudents.length + 1,
      student_code: s.studentCode,
      studentCode: s.studentCode,
      full_name: s.fullName,
      fullName: s.fullName,
      gender: s.gender,
      dob: s.dob || s.dateOfBirth,
      class_name: s.className,
      className: s.className,
      parent_name: s.parentName,
      parentName: s.parentName,
      parent_phone: s.parentPhone,
      parentPhone: s.parentPhone,
      gpa: s.gpa,
      academic_rank: s.academicRank,
      academicRank: s.academicRank,
      status: s.status || 'ACTIVE'
    };
    memStudents.push(newObj);
    return newObj;
  }

  static async update(id, s) {
    const res = await query(
      `UPDATE students SET full_name = $1, gender = $2, dob = $3, class_name = $4, parent_name = $5, parent_phone = $6, gpa = $7, academic_rank = $8, status = $9
       WHERE id = $10 RETURNING *`,
      [s.fullName || s.full_name, s.gender, s.dob || s.dateOfBirth, s.className || s.class_name, s.parentName || s.parent_name, s.parentPhone || s.parent_phone, s.gpa, s.academicRank || s.academic_rank, s.status, id]
    );
    if (res && res.rows && res.rows.length > 0) return res.rows[0];

    const idx = memStudents.findIndex(item => item.id === parseInt(id, 10));
    if (idx !== -1) {
      memStudents[idx] = { ...memStudents[idx], ...s };
      return memStudents[idx];
    }
    return s;
  }
}
