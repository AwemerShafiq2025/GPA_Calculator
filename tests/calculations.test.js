import { describe, expect, it } from 'vitest';
import {
  calculateCGPA,
  calculateSGPA,
  calculateTargetSGPA,
  findMinimumGrade,
  predictNextSemester
} from '../shared/calculations.js';

const courses = [
  { name: 'Programming Fundamentals', creditHours: 3, grade: 'A' },
  { name: 'Calculus', creditHours: 3, grade: 'B+' },
  { name: 'English', creditHours: 2, grade: 'B' }
];

describe('GPA calculations', () => {
  it('calculates UOL SGPA from quality points and credit hours', () => {
    const result = calculateSGPA({ university: 'uol', courses });
    expect(result.totalCH).toBe(8);
    expect(result.totalQP).toBe(28.5);
    expect(result.sgpa).toBe(3.56);
    expect(result.classification).toBe('Distinction');
  });

  it('calculates CGPA using previous CGPA easy mode', () => {
    const result = calculateCGPA({ university: 'uol', previous: { cgpa: 3, ch: 30 }, courses });
    expect(result.previousQP).toBe(90);
    expect(result.cgpa).toBe(3.12);
  });

  it('calculates CGPA using previous QP advanced mode', () => {
    const result = calculateCGPA({ university: 'uol', previous: { qp: 90, ch: 30 }, courses });
    expect(result.cgpa).toBe(3.12);
  });

  it('predicts next semester CGPA and required SGPA', () => {
    const result = predictNextSemester({
      university: 'uol',
      currentCGPA: 3,
      currentCH: 30,
      nextCourses: courses,
      targetCGPA: 3.4
    });
    expect(result.predictedSGPA).toBe(3.56);
    expect(result.predictedCGPA).toBe(3.12);
    expect(result.achievable).toBe(false);
  });

  it('calculates required SGPA for target CGPA', () => {
    const result = calculateTargetSGPA({ targetCGPA: 3.2, previous: { cgpa: 3, ch: 30 }, thisSemCH: 15 });
    expect(result.requiredSGPA).toBe(3.6);
    expect(result.achievable).toBe(true);
  });

  it('finds the cheapest grade that reaches target SGPA', () => {
    const result = findMinimumGrade({
      university: 'uol',
      courses: [
        { name: 'Known', creditHours: 3, grade: 'A' },
        { name: 'Target', creditHours: 3, grade: 'F' }
      ],
      targetIndex: 1,
      targetSGPA: 3
    });
    expect(result.result.grade).toBe('C');
  });

  it('reports any grade when needed grade point is zero or lower', () => {
    const result = findMinimumGrade({
      university: 'uol',
      courses: [
        { name: 'Known', creditHours: 3, grade: 'A' },
        { name: 'Target', creditHours: 3, grade: 'F' }
      ],
      targetIndex: 1,
      targetSGPA: 1
    });
    expect(result.result).toBe('any');
  });

  it('rejects empty course lists and invalid grades', () => {
    expect(() => calculateSGPA({ university: 'uol', courses: [] })).toThrow(/At least one/);
    expect(() => calculateSGPA({ university: 'uol', courses: [{ creditHours: 3, grade: 'A+' }] })).toThrow(/not in/);
  });
});
