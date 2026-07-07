import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  calculateCGPA,
  calculateScenarios,
  calculateSGPA,
  calculateTargetSGPA,
  findMinimumGrade,
  getClassification,
  normalizeScale,
  predictNextSemester
} from '@shared/calculations.js';
import { DB, DEFAULT_UNIVERSITY, getUniversity } from '@shared/universities.js';
import './styles.css';

const blankCourse = (index = 1, grade = 'A') => ({ id: crypto.randomUUID(), name: `Course ${index}`, creditHours: 3, grade });
const fmt = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00');

function App() {
  const [university, setUniversity] = useState(DEFAULT_UNIVERSITY);
  const [customGrades, setCustomGrades] = useState(() => loadLocalScale(DEFAULT_UNIVERSITY));
  const activeGrades = customGrades || getUniversity(university).grades;
  const gradeLabels = Object.keys(activeGrades);
  const [mode, setMode] = useState('cgpa');
  const [previousMode, setPreviousMode] = useState('easy');
  const [previous, setPrevious] = useState({ cgpa: 3.1, ch: 45, qp: 139.5 });
  const [courses, setCourses] = useState([blankCourse(1, gradeLabels[0]), blankCourse(2, gradeLabels[0]), blankCourse(3, gradeLabels[0])]);
  const [tab, setTab] = useState('scenarios');
  const [toast, setToast] = useState('');
  const [scaleOpen, setScaleOpen] = useState(false);
  const [reviewRows, setReviewRows] = useState([]);

  const result = useMemo(() => {
    try {
      return mode === 'sgpa'
        ? { type: 'SGPA', ...calculateSGPA({ university, courses, customGrades }) }
        : { type: 'CGPA', ...calculateCGPA({ university, previous: previousPayload(previous, previousMode), courses, customGrades }) };
    } catch (error) {
      return { type: mode.toUpperCase(), error: error.message, sgpa: 0, cgpa: 0, totalCH: 0, totalQP: 0, classification: '—' };
    }
  }, [mode, university, courses, previous, previousMode, customGrades]);

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function changeUniversity(key) {
    const saved = loadLocalScale(key);
    const nextGrades = saved || DB[key].grades;
    setUniversity(key);
    setCustomGrades(saved);
    setCourses((rows) => rows.map((row) => ({ ...row, grade: nextGrades[row.grade] === undefined ? Object.keys(nextGrades)[0] : row.grade })));
    notify(`${DB[key].short} scale loaded`);
  }

  function updateCourse(id, patch) {
    setCourses((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addCourse() {
    if (courses.length >= 10) return notify('Maximum 10 courses allowed');
    setCourses((rows) => [...rows, blankCourse(rows.length + 1, gradeLabels[0])]);
  }

  function removeCourse(id) {
    if (courses.length <= 1) return notify('At least one course is required');
    setCourses((rows) => rows.filter((row) => row.id !== id));
  }

  return (
    <div className="appShell">
      <div className="ambientGlass" aria-hidden="true" />
      <header className="topbar">
        <div>
          <p className="eyebrow">Pakistan GPA Calculator</p>
          <h1>University GPA, CGPA and transcript parser</h1>
        </div>
        <button className="ghost" onClick={() => setScaleOpen(true)}>Grade Scale</button>
      </header>

      <main className="layout">
        <section className="stack">
          <UniversityCard university={university} onChange={changeUniversity} activeGrades={activeGrades} />
          <ModeCard mode={mode} setMode={setMode} previousMode={previousMode} setPreviousMode={setPreviousMode} previous={previous} setPrevious={setPrevious} />
          <TranscriptUpload university={university} customGrades={customGrades} setReviewRows={setReviewRows} notify={notify} />
          {reviewRows.length > 0 && (
            <ReviewTable
              rows={reviewRows}
              setRows={setReviewRows}
              grades={activeGrades}
              apply={() => {
                setCourses(reviewRows.map((row, index) => ({ ...blankCourse(index + 1, row.grade), ...row, id: crypto.randomUUID() })));
                setReviewRows([]);
                notify('Extracted courses added');
              }}
            />
          )}
          <CourseBuilder courses={courses} grades={activeGrades} updateCourse={updateCourse} addCourse={addCourse} removeCourse={removeCourse} />
        </section>

        <aside className="stack">
          <ResultsCard result={result} mode={mode} />
          <Tabs active={tab} setActive={setTab} />
          {tab === 'scenarios' && <Scenarios courses={courses} university={university} customGrades={customGrades} notify={notify} />}
          {tab === 'predict' && <Predictor courses={courses} university={university} customGrades={customGrades} />}
          {tab === 'target' && <TargetPlanner previous={previous} previousMode={previousMode} courses={courses} />}
          {tab === 'finder' && <GradeFinder courses={courses} setCourses={setCourses} university={university} customGrades={customGrades} />}
        </aside>
      </main>

      {scaleOpen && (
        <ScaleModal
          university={university}
          grades={activeGrades}
          close={() => setScaleOpen(false)}
          save={(grades) => {
            const normalized = normalizeScale(grades);
            if (Object.keys(normalized).length < 2) return notify('Keep at least 2 grades');
            setCustomGrades(normalized);
            localStorage.setItem(`scale:${university}`, JSON.stringify(normalized));
            setScaleOpen(false);
            notify('Custom scale saved');
          }}
          reset={() => {
            localStorage.removeItem(`scale:${university}`);
            setCustomGrades(null);
            setScaleOpen(false);
            notify('Default scale restored');
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function previousPayload(previous, previousMode) {
  return previousMode === 'advanced' ? { qp: previous.qp, ch: previous.ch } : { cgpa: previous.cgpa, ch: previous.ch };
}

function loadLocalScale(key) {
  try {
    const saved = localStorage.getItem(`scale:${key}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function UniversityCard({ university, onChange, activeGrades }) {
  const uni = DB[university];
  return (
    <section className="card">
      <div className="cardHead">
        <div>
          <p className="eyebrow">University</p>
          <h2>{uni.emoji} {uni.name}</h2>
        </div>
        <span className="pill">{uni.short}</span>
      </div>
      <select value={university} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(DB).map(([key, item]) => (
          <option key={key} value={key}>{item.emoji} {item.name}</option>
        ))}
      </select>
      <p className="note">{uni.note}</p>
      <div className="chips">{Object.entries(activeGrades).map(([grade, point]) => <span key={grade}>{grade} {point.toFixed(2)}</span>)}</div>
    </section>
  );
}

function ModeCard({ mode, setMode, previousMode, setPreviousMode, previous, setPrevious }) {
  return (
    <section className="card">
      <div className="segmented">
        <button className={mode === 'cgpa' ? 'active' : ''} onClick={() => setMode('cgpa')}>CGPA</button>
        <button className={mode === 'sgpa' ? 'active' : ''} onClick={() => setMode('sgpa')}>SGPA</button>
      </div>
      <div className="cardHead compact">
        <h2>Previous Record</h2>
        <div className="miniToggle">
          <button className={previousMode === 'easy' ? 'active' : ''} onClick={() => setPreviousMode('easy')}>Easy</button>
          <button className={previousMode === 'advanced' ? 'active' : ''} onClick={() => setPreviousMode('advanced')}>Advanced</button>
        </div>
      </div>
      <div className="grid2">
        {previousMode === 'easy' ? (
          <label>Previous CGPA<input type="number" min="0" max="4" step="0.01" value={previous.cgpa} onChange={(e) => setPrevious({ ...previous, cgpa: e.target.value })} /></label>
        ) : (
          <label>Previous QP<input type="number" min="0" step="0.01" value={previous.qp} onChange={(e) => setPrevious({ ...previous, qp: e.target.value })} /></label>
        )}
        <label>Total CH<input type="number" min="0" step="0.5" value={previous.ch} onChange={(e) => setPrevious({ ...previous, ch: e.target.value })} /></label>
      </div>
    </section>
  );
}

function CourseBuilder({ courses, grades, updateCourse, addCourse, removeCourse }) {
  return (
    <section className="card">
      <div className="cardHead">
        <div>
          <p className="eyebrow">Course Builder</p>
          <h2>This semester</h2>
        </div>
        <button onClick={addCourse}>+ Add</button>
      </div>
      <div className="courseList">
        {courses.map((course, index) => (
          <div className="courseRow" key={course.id}>
            <span className="rowNo">{index + 1}</span>
            <input value={course.name} onChange={(e) => updateCourse(course.id, { name: e.target.value })} aria-label="Course name" />
            <input type="number" min="0.5" max="6" step="0.5" value={course.creditHours} onChange={(e) => updateCourse(course.id, { creditHours: e.target.value })} aria-label="Credit hours" />
            <select value={course.grade} onChange={(e) => updateCourse(course.id, { grade: e.target.value })}>
              {Object.keys(grades).map((grade) => <option key={grade}>{grade}</option>)}
            </select>
            <button className="iconBtn" title="Remove course" onClick={() => removeCourse(course.id)}>×</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultsCard({ result, mode }) {
  const value = mode === 'sgpa' ? result.sgpa : result.cgpa;
  const tier = getClassification(value).split(' ')[0].toLowerCase().replace('—', 'empty');
  return (
    <section className={`resultCard ${tier}`}>
      <p className="eyebrow">{result.type} Result</p>
      <div className="big">{result.error ? '—' : fmt(value)}</div>
      <div className="resultMeta">
        <span>{result.classification || '—'}</span>
        <span>{fmt(result.totalCH || result.semesterCH)} CH</span>
        <span>{fmt(result.totalQP || result.semesterQP)} QP</span>
      </div>
      <p>{result.error || result.message || 'Add courses to see your result.'}</p>
    </section>
  );
}

function Tabs({ active, setActive }) {
  const tabs = [
    ['scenarios', 'Scenarios'],
    ['predict', 'Next Sem'],
    ['target', 'Target'],
    ['finder', 'Grade Finder']
  ];
  return <div className="tabs">{tabs.map(([key, label]) => <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>{label}</button>)}</div>;
}

function Scenarios({ courses, university, customGrades, notify }) {
  let data;
  try {
    data = calculateScenarios({ university, courses, customGrades });
  } catch (error) {
    return <section className="card"><p className="note">{error.message}</p></section>;
  }
  return (
    <section className="card">
      <h2>Best / Worst Case</h2>
      <div className="scenarioGrid">
        <div><span>Best case</span><strong>{fmt(data.best.sgpa)}</strong><small>All {data.bestGrade}</small></div>
        <div><span>Worst case</span><strong>{fmt(data.worst.sgpa)}</strong><small>All F</small></div>
      </div>
      <button className="wide" onClick={() => navigator.clipboard.writeText(`Best SGPA: ${fmt(data.best.sgpa)}, Worst SGPA: ${fmt(data.worst.sgpa)}`).then(() => notify('Result copied'))}>Copy Result</button>
    </section>
  );
}

function Predictor({ courses, university, customGrades }) {
  const [state, setState] = useState({ currentCGPA: 3.1, currentCH: 45, targetCGPA: 3.5 });
  let output;
  try {
    output = predictNextSemester({ ...state, nextCourses: courses, university, customGrades });
  } catch (error) {
    output = { error: error.message };
  }
  return (
    <section className="card">
      <h2>Next-Semester Predictor</h2>
      <div className="grid3">
        {['currentCGPA', 'currentCH', 'targetCGPA'].map((key) => <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<input type="number" step="0.01" value={state[key]} onChange={(e) => setState({ ...state, [key]: e.target.value })} /></label>)}
      </div>
      <div className="answer">{output.error || `Predicted CGPA ${fmt(output.predictedCGPA)} · Required SGPA ${output.requiredSGPA === null ? '—' : fmt(output.requiredSGPA)} ${output.achievable === false ? '(not achievable)' : ''}`}</div>
    </section>
  );
}

function TargetPlanner({ previous, previousMode, courses }) {
  const [target, setTarget] = useState(3.5);
  const thisSemCH = courses.reduce((sum, course) => sum + Number(course.creditHours || 0), 0);
  let output;
  try {
    output = calculateTargetSGPA({ targetCGPA: target, previous: previousPayload(previous, previousMode), thisSemCH });
  } catch (error) {
    output = { error: error.message };
  }
  return (
    <section className="card">
      <h2>Target Planner</h2>
      <label>Target CGPA<input type="number" min="0" max="4" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
      <div className="answer">{output.error || `Required SGPA this semester: ${fmt(output.requiredSGPA)} ${output.achievable ? '' : '(not achievable)'}`}</div>
    </section>
  );
}

function GradeFinder({ courses, setCourses, university, customGrades }) {
  const [targetIndex, setTargetIndex] = useState(0);
  const [targetSGPA, setTargetSGPA] = useState(3.5);
  let output;
  try {
    output = findMinimumGrade({ university, courses, targetIndex, targetSGPA, customGrades });
  } catch (error) {
    output = { message: error.message };
  }
  return (
    <section className="card">
      <h2>Grade Finder</h2>
      <div className="grid2">
        <label>Course<select value={targetIndex} onChange={(e) => setTargetIndex(Number(e.target.value))}>{courses.map((course, index) => <option key={course.id} value={index}>{course.name || `Course ${index + 1}`}</option>)}</select></label>
        <label>Target SGPA<input type="number" min="0" max="4" step="0.01" value={targetSGPA} onChange={(e) => setTargetSGPA(e.target.value)} /></label>
      </div>
      <div className="answer">{output.message}</div>
      {output.result?.grade && <button className="wide" onClick={() => setCourses((rows) => rows.map((row, i) => (i === targetIndex ? { ...row, grade: output.result.grade } : row)))}>Apply Grade</button>}
    </section>
  );
}

function TranscriptUpload({ university, customGrades, setReviewRows, notify }) {
  const [loading, setLoading] = useState(false);
  async function upload(file) {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('transcript', file);
    form.append('university', university);
    if (customGrades) form.append('customGrades', JSON.stringify(customGrades));
    try {
      const response = await fetch('/api/transcript/parse', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Transcript parsing failed');
      setReviewRows(data.courses.map((row) => ({ ...row, id: crypto.randomUUID() })));
      notify(data.courses.length ? 'Transcript parsed for review' : 'No course rows detected');
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="card upload" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files[0]); }}>
      <div>
        <p className="eyebrow">Transcript Upload</p>
        <h2>{loading ? 'Reading transcript...' : 'Drop PDF or image'}</h2>
        <p className="note">Local PDF extraction or offline Tesseract OCR, followed by editable review.</p>
      </div>
      <label className="fileBtn">Choose File<input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => upload(e.target.files[0])} /></label>
    </section>
  );
}

function ReviewTable({ rows, setRows, grades, apply }) {
  return (
    <section className="card">
      <div className="cardHead"><h2>Review Extracted Courses</h2><button onClick={apply}>Use Courses</button></div>
      {rows.map((row) => (
        <div className="courseRow" key={row.id}>
          <input value={row.name} onChange={(e) => setRows(rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))} />
          <input type="number" value={row.creditHours} onChange={(e) => setRows(rows.map((r) => (r.id === row.id ? { ...r, creditHours: e.target.value } : r)))} />
          <select value={row.grade} onChange={(e) => setRows(rows.map((r) => (r.id === row.id ? { ...r, grade: e.target.value } : r)))}>
            {Object.keys(grades).map((grade) => <option key={grade}>{grade}</option>)}
          </select>
        </div>
      ))}
    </section>
  );
}

function ScaleModal({ university, grades, close, save, reset }) {
  const [rows, setRows] = useState(Object.entries(grades).map(([grade, point]) => ({ id: crypto.randomUUID(), grade, point })));
  function change(id, patch) {
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  return (
    <div className="modalBackdrop">
      <section className="modal">
        <div className="cardHead">
          <div><p className="eyebrow">{DB[university].name}</p><h2>Grade Scale Editor</h2></div>
          <button className="iconBtn" onClick={close}>×</button>
        </div>
        <div className="scaleRows">
          {rows.map((row) => (
            <div className="courseRow" key={row.id}>
              <input value={row.grade} onChange={(e) => change(row.id, { grade: e.target.value.toUpperCase() })} />
              <input type="number" min="0" max="4" step="0.01" value={row.point} onChange={(e) => change(row.id, { point: e.target.value })} />
              <button className="iconBtn" disabled={rows.length <= 2} onClick={() => setRows(rows.filter((r) => r.id !== row.id))}>×</button>
            </div>
          ))}
        </div>
        <div className="modalActions">
          <button onClick={() => setRows([...rows, { id: crypto.randomUUID(), grade: 'NEW', point: 0 }])}>Add Grade</button>
          <button className="ghost" onClick={reset}>Reset Default</button>
          <button onClick={() => save(Object.fromEntries(rows.map((row) => [row.grade, row.point])))}>Save Scale</button>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
