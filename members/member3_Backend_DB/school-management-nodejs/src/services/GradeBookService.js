import { GradeBookRepository } from '../repositories/GradeBookRepository.js';
import { StudentRepository } from '../repositories/StudentRepository.js';
import { SubjectRepository } from '../repositories/SubjectRepository.js';
import { ClassRepository } from '../repositories/ClassRepository.js';

export class GradeBookService {
  /**
   * Lấy toàn bộ dữ liệu cần thiết cho trang GradebookPage:
   *   - classes, subjects, students trong lớp, gradeRows
   * @param {string} className
   * @param {string} semester  - 'HK1' | 'HK2'
   * @param {string} schoolYear
   */
  static async getGradebookPageData(className, semester, schoolYear) {
    const [rawClasses, rawSubjects, rawStudents, rawGrades] = await Promise.all([
      ClassRepository.findAll(),
      SubjectRepository.findAll(),
      StudentRepository.findByClassName(className),
      GradeBookRepository.findByClassNameAndSemester(className, semester, schoolYear),
    ]);

    const classes = rawClasses.map((c) => ({
      id:   c.class_name,
      name: c.class_name,
    }));

    const subjects = rawSubjects.map((s) => ({
      id:   s.code || s.name,
      name: s.name,
    }));

    const students = rawStudents.map((s) => ({
      id:        s.student_code || s.studentCode,
      name:      s.full_name    || s.fullName,
      classId:   s.class_name   || s.className,
      code:      s.student_code || s.studentCode,
    }));

    // Build gradeRows: flat array dễ dùng ở frontend
    const gradeRows = rawGrades.map((g) => ({
      id:            g.id,
      studentCode:   g.student_code || g.studentCode,
      studentName:   g.student_name || g.studentName,
      className:     g.class_name   || g.className,
      subjectName:   g.subject_name || g.subjectName,
      subjectId:     g.subject_name || g.subjectName, // dùng name làm id cho đồng nhất
      semester:      g.semester,
      schoolYear:    g.school_year  || g.schoolYear,
      scoreOral:     g.score_oral   != null ? parseFloat(g.score_oral)   : null,
      scoreOral2:    g.score_oral_2 != null ? parseFloat(g.score_oral_2) : null,
      score15m:      g.score_15m    != null ? parseFloat(g.score_15m)    : null,
      score15m2:     g.score_15m_2  != null ? parseFloat(g.score_15m_2)  : null,
      score1Hour:    g.score_1hour  != null ? parseFloat(g.score_1hour)  : null,
      scoreMidTerm:  g.score_mid_term  != null ? parseFloat(g.score_mid_term)  : null,
      scoreFinalTerm:g.score_final_term!= null ? parseFloat(g.score_final_term): null,
      averageScore:  g.average_score   != null ? parseFloat(g.average_score)   : null,
      status:        g.status,
    }));

    return { classes, subjects, students, gradeRows };
  }

  /**
   * Lưu hàng loạt grades từ spreadsheet.
   * Mỗi item: { studentCode, studentName, className, subjectId (=subjectName),
   *             semester, schoolYear, scoreOral, score15m, score1Hour,
   *             scoreMidTerm, scoreFinalTerm }
   */
  static async saveGradesFromSpreadsheet(items) {
    const results = [];
    for (const item of items) {
      const gb = {
        studentCode:    item.studentCode,
        studentName:    item.studentName,
        className:      item.className,
        subjectName:    item.subjectId,
        semester:       item.semester,
        schoolYear:     item.schoolYear,
        scoreOral:      item.scoreOral,
        scoreOral2:     item.scoreOral2  ?? null,
        score15m:       item.score15m,
        score15m2:      item.score15m2   ?? null,
        score1Hour:     item.score1Hour,
        scoreMidTerm:   item.scoreMidTerm,
        scoreFinalTerm: item.scoreFinalTerm,
        status:         'APPROVED',
      };
      const saved = await this.saveGrade(gb);
      results.push(saved);
    }
    return results;
  }

  static async getGrades({ studentCode, className, subjectName }) {
    if (studentCode) {
      return await GradeBookRepository.findByStudentCode(studentCode);
    }
    if (className && subjectName) {
      return await GradeBookRepository.findByClassNameAndSubjectName(className, subjectName);
    }
    if (className) {
      return await GradeBookRepository.findByClassName(className);
    }
    return await GradeBookRepository.findAll();
  }

  static async saveGrade(gradeBook) {
    if (gradeBook.id) {
      const existing = await GradeBookRepository.findById(gradeBook.id);
      if (existing && existing.status === 'LOCKED') {
        throw new Error('Grade sheet is locked by BGH and cannot be edited.');
      }
    }

    const calculated = this.calculateTBM(gradeBook);
    return await GradeBookRepository.save(calculated);
  }

  static async saveAllGrades(gradeBooks) {
    const savedList = [];
    for (const gb of gradeBooks) {
      if (gb.id) {
        const existing = await GradeBookRepository.findById(gb.id);
        if (existing && existing.status === 'LOCKED') {
          throw new Error(`Grade entry for student ${gb.studentCode || gb.student_code} is locked.`);
        }
      }
      const calculated = this.calculateTBM(gb);
      const saved = await GradeBookRepository.save(calculated);
      savedList.push(saved);
    }
    return savedList;
  }

  static async lockGradeSheet(className, subjectName) {
    await GradeBookRepository.updateStatusByClassAndSubject(className, subjectName, 'LOCKED');
  }

  static async unlockGradeSheet(className, subjectName) {
    await GradeBookRepository.updateStatusByClassAndSubject(className, subjectName, 'APPROVED');
  }

  static calculateTBM(gb) {
    const oral  = gb.scoreOral   != null ? parseFloat(gb.scoreOral)   : null;
    const oral2 = gb.scoreOral2  != null ? parseFloat(gb.scoreOral2)  : null;
    const m15   = gb.score15m    != null ? parseFloat(gb.score15m)    : null;
    const m15_2 = gb.score15m2   != null ? parseFloat(gb.score15m2)   : null;
    const h1    = gb.score1Hour  != null ? parseFloat(gb.score1Hour)  : null;
    const mid   = gb.scoreMidTerm   != null ? parseFloat(gb.scoreMidTerm)   : null;
    const fin   = gb.scoreFinalTerm != null ? parseFloat(gb.scoreFinalTerm) : null;

    // Trọng số: miệng=1, 15'=1, 1tiết=2, giữa HK=2, cuối HK=3
    let sum = 0, weight = 0;
    if (oral  != null && !isNaN(oral))  { sum += oral  * 1; weight += 1; }
    if (oral2 != null && !isNaN(oral2)) { sum += oral2 * 1; weight += 1; }
    if (m15   != null && !isNaN(m15))   { sum += m15   * 1; weight += 1; }
    if (m15_2 != null && !isNaN(m15_2)) { sum += m15_2 * 1; weight += 1; }
    if (h1    != null && !isNaN(h1))    { sum += h1    * 2; weight += 2; }
    if (mid   != null && !isNaN(mid))   { sum += mid   * 2; weight += 2; }
    if (fin   != null && !isNaN(fin))   { sum += fin   * 3; weight += 3; }

    if (weight > 0) {
      const avg = Math.round((sum / weight) * 10) / 10;
      gb.averageScore  = avg;
      gb.average_score = avg;

      if (avg >= 9.0)      gb.gradeLetter = 'Xuất sắc';
      else if (avg >= 8.0) gb.gradeLetter = 'Giỏi';
      else if (avg >= 6.5) gb.gradeLetter = 'Khá';
      else if (avg >= 5.0) gb.gradeLetter = 'Trung bình';
      else                 gb.gradeLetter = 'Yếu';
      gb.grade_letter = gb.gradeLetter;
    } else {
      gb.averageScore  = null;
      gb.average_score = null;
      gb.gradeLetter   = 'Chưa xếp loại';
      gb.grade_letter  = 'Chưa xếp loại';
    }
    return gb;
  }
}
