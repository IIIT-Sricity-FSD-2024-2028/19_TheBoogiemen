import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportRepository } from './report.report.repository';
import { GenerateProgressInputDto } from './dto/generate-progress.input.dto';
import { ProgressReportOutputDto } from './dto/progress-report.output.dto';

@Injectable()
export class ReportService {
  constructor(private readonly reportRepo: ReportRepository) {}

  async generateReport(dto: GenerateProgressInputDto): Promise<ProgressReportOutputDto[]> {
    const facultySections = this.reportRepo.sections.filter(s => s.faculty_id === dto.faculty_id);
    if (!facultySections.length) throw new NotFoundException('No sections found for this faculty');

    const targetSection = dto.course_id ? facultySections.find(s => s.course_id === dto.course_id) : facultySections[0];
    if (!targetSection) throw new NotFoundException('Specified course section not found for this faculty');

    const enrollments = this.reportRepo.enrollments.filter(e => e.section_id === targetSection.section_id);

    const reports: ProgressReportOutputDto[] = enrollments.map(enrol => {
      const student = this.reportRepo.students.find(s => s.student_id === enrol.student_id);
      const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';
      const studentMarks = this.reportRepo.marks.filter(m => m.student_id === enrol.student_id);
      
      const marksDetails = studentMarks.map(m => ({
        assessment: m.assessment_id,
        score: m.marks,
        max: 100 // Mock max marks
      }));

      const totalScore = studentMarks.reduce((sum, m) => sum + m.marks, 0);

      return {
        student_id: enrol.student_id,
        student_name: studentName,
        marks: marksDetails,
        internal_marks_placeholder: totalScore,
        graded_placeholder: totalScore >= 50 ? 'PASS' : 'FAIL',
        generated_at: new Date().toISOString()
      };
    });

    return reports;
  }
}
