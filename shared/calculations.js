import { getUniversity } from './universities.js';

export function round2(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

export function clampGradePoint(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(4, Math.max(0, number));
}

export function normalizeScale(grades) {
  return Object.fromEntries(
    Object.entries(grades || {})
      .filter(([label]) => String(label).trim())
      .map(([label, point]) => [String(label).trim().toUpperCase(), clampGradePoint(point)])
  );
}

export function getClassification(value) {
  const gpa = Number(value);
  if (!Number.isFinite(gpa) || gpa <= 0) return '—';
  if (gpa >= 3.5) return 'Distinction';
  if (gpa >= 3.0) return 'Merit';
  if (gpa >= 2.5) return 'Satisfactory';
  if (gpa >= 2.0) return 'Pass';
  return 'At Risk / Below Pass';
}

export function getMessage(value) {
  const label = getClassification(value);
  return (
    {
      Distinction: 'Excellent standing. Keep protecting that momentum.',
      Merit: 'Strong result. A few upgrades can lift it even higher.',
      Satisfactory: 'Solid ground. Plan the next courses carefully.',
      Pass: 'You are passing. Focus on high-credit courses first.',
      'At Risk / Below Pass': 'This needs attention. Retakes or stronger grades can still change the picture.',
      '—': 'Add courses to see your result.'
    }[label] || 'Add courses to see your result.'
  );
}

export function resolveGrades(university, customGrades) {
  return normalizeScale(customGrades || getUniversity(university).grades);
}

export function validateCourses(courses, grades) {
  if (!Array.isArray(courses) || courses.length === 0) {
    throw new Error('At least one course is required.');
  }
  return courses.map((course, index) => {
    const creditHours = Number(course.creditHours);
    const grade = String(course.grade || '').trim().toUpperCase();
    if (!Number.isFinite(creditHours) || creditHours <= 0) {
      throw new Error(`Course ${index + 1} must have credit hours greater than 0.`);
    }
    if (!(grade in grades)) {
      throw new Error(`Course ${index + 1} has a grade that is not in the selected scale.`);
    }
    return {
      name: course.name || `Course ${index + 1}`,
      creditHours,
      grade,
      gradePoint: grades[grade],
      qualityPoints: creditHours * grades[grade]
    };
  });
}

export function calculateSGPA({ university, courses, customGrades }) {
  const grades = resolveGrades(university, customGrades);
  const rows = validateCourses(courses, grades);
  const totalCH = rows.reduce((sum, row) => sum + row.creditHours, 0);
  const totalQP = rows.reduce((sum, row) => sum + row.qualityPoints, 0);
  const sgpa = totalCH > 0 ? totalQP / totalCH : 0;
  return {
    sgpa: round2(sgpa),
    rawSGPA: sgpa,
    totalCH: round2(totalCH),
    totalQP: round2(totalQP),
    classification: getClassification(sgpa),
    message: getMessage(sgpa),
    courses: rows
  };
}

export function normalizePrevious(previous = {}) {
  const ch = Number(previous.ch);
  if (!Number.isFinite(ch) || ch < 0) throw new Error('Previous credit hours must be 0 or greater.');
  if ('qp' in previous && previous.qp !== '') {
    const qp = Number(previous.qp);
    if (!Number.isFinite(qp) || qp < 0) throw new Error('Previous quality points must be 0 or greater.');
    return { ch, qp, cgpa: ch ? qp / ch : 0 };
  }
  const cgpa = Number(previous.cgpa || 0);
  if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 4) {
    throw new Error('Previous CGPA must be between 0 and 4.');
  }
  return { ch, qp: cgpa * ch, cgpa };
}

export function calculateCGPA({ university, previous, courses, customGrades }) {
  const semester = calculateSGPA({ university, courses, customGrades });
  const prev = normalizePrevious(previous);
  const totalCH = prev.ch + semester.totalCH;
  const totalQP = prev.qp + semester.totalQP;
  const cgpa = totalCH > 0 ? totalQP / totalCH : 0;
  return {
    cgpa: round2(cgpa),
    rawCGPA: cgpa,
    sgpa: semester.sgpa,
    semesterCH: semester.totalCH,
    semesterQP: semester.totalQP,
    previousCH: round2(prev.ch),
    previousQP: round2(prev.qp),
    totalCH: round2(totalCH),
    totalQP: round2(totalQP),
    classification: getClassification(cgpa),
    message: getMessage(cgpa)
  };
}

export function predictNextSemester({ currentCGPA, currentCH, nextCourses, targetCGPA, university, customGrades }) {
  const currentCgpaNumber = Number(currentCGPA);
  const currentChNumber = Number(currentCH);
  const target = Number(targetCGPA);
  if (!Number.isFinite(currentCgpaNumber) || currentCgpaNumber < 0 || currentCgpaNumber > 4) {
    throw new Error('Current CGPA must be between 0 and 4.');
  }
  if (!Number.isFinite(currentChNumber) || currentChNumber < 0) {
    throw new Error('Current credit hours must be 0 or greater.');
  }
  const semester = calculateSGPA({ university, courses: nextCourses, customGrades });
  const currentQP = currentCgpaNumber * currentChNumber;
  const totalCH = currentChNumber + semester.totalCH;
  const totalQP = currentQP + semester.totalQP;
  const predictedCGPA = totalCH > 0 ? totalQP / totalCH : 0;
  const requiredSGPA =
    Number.isFinite(target) && semester.totalCH > 0
      ? (target * totalCH - currentQP) / semester.totalCH
      : null;
  return {
    predictedCGPA: round2(predictedCGPA),
    predictedSGPA: semester.sgpa,
    requiredSGPA: requiredSGPA === null ? null : round2(requiredSGPA),
    achievable: requiredSGPA === null ? null : requiredSGPA <= 4,
    totalCH: round2(totalCH),
    totalQP: round2(totalQP),
    classification: getClassification(predictedCGPA)
  };
}

export function calculateTargetSGPA({ targetCGPA, previous, thisSemCH }) {
  const target = Number(targetCGPA);
  const semCH = Number(thisSemCH);
  if (!Number.isFinite(target) || target < 0 || target > 4) throw new Error('Target CGPA must be between 0 and 4.');
  if (!Number.isFinite(semCH) || semCH <= 0) throw new Error('This semester credit hours must be greater than 0.');
  const prev = normalizePrevious(previous);
  const requiredSGPA = (target * (prev.ch + semCH) - prev.qp) / semCH;
  return {
    requiredSGPA: round2(requiredSGPA),
    achievable: requiredSGPA <= 4,
    classification: getClassification(requiredSGPA)
  };
}

export function findMinimumGrade({ university, courses, targetIndex, targetSGPA, customGrades }) {
  const grades = resolveGrades(university, customGrades);
  const index = Number(targetIndex);
  const target = Number(targetSGPA);
  if (!Number.isFinite(target) || target < 0 || target > 4) throw new Error('Target SGPA must be between 0 and 4.');
  if (!Array.isArray(courses) || courses.length === 0 || !courses[index]) throw new Error('Target course not found.');
  const targetCourseCH = Number(courses[index].creditHours);
  if (!Number.isFinite(targetCourseCH) || targetCourseCH <= 0) {
    throw new Error('Target course credit hours must be greater than 0.');
  }
  const others = courses.filter((_, i) => i !== index);
  const validOthers = others.length ? validateCourses(others, grades) : [];
  const otherQP = validOthers.reduce((sum, row) => sum + row.qualityPoints, 0);
  const otherCH = validOthers.reduce((sum, row) => sum + row.creditHours, 0);
  const neededGradePoint = (target * (otherCH + targetCourseCH) - otherQP) / targetCourseCH;
  if (neededGradePoint <= 0) {
    return { neededGradePoint: round2(neededGradePoint), result: 'any', message: 'Any grade (even F) works.', achievable: true };
  }
  const sorted = Object.entries(grades).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  const match = sorted.find(([, point]) => point >= neededGradePoint);
  if (!match) {
    return { neededGradePoint: round2(neededGradePoint), result: null, message: 'Not achievable with this scale.', achievable: false };
  }
  return {
    neededGradePoint: round2(neededGradePoint),
    result: { grade: match[0], point: match[1] },
    message: `Minimum grade needed: ${match[0]} (${match[1].toFixed(2)})`,
    achievable: true
  };
}

export function calculateScenarios({ university, courses, customGrades }) {
  const grades = resolveGrades(university, customGrades);
  const highest = Object.entries(grades).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const bestCourses = courses.map((course) => ({ ...course, grade: highest[0] }));
  const worstCourses = courses.map((course) => ({ ...course, grade: 'F' in grades ? 'F' : Object.entries(grades).sort((a, b) => a[1] - b[1])[0][0] }));
  return {
    best: calculateSGPA({ university, courses: bestCourses, customGrades }),
    worst: calculateSGPA({ university, courses: worstCourses, customGrades }),
    bestGrade: highest[0]
  };
}
