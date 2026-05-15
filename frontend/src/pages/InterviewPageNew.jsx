import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { interviewAPI } from '../api/client';
import AIAvatar from '../components/AIAvatar';
import CameraPreview from '../components/CameraPreview';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

/* ─────────────────── constants ─────────────────── */
const LANG = {
  javascript: { name: 'JavaScript', id: 63, start: '// Write your solution here\nfunction solution() {\n  \n}\n\n// Example: console.log(solution());' },
  python:     { name: 'Python',     id: 71, start: '# Write your solution here\ndef solution():\n    pass\n\n# Example: print(solution())' },
  java:       { name: 'Java',       id: 62, start: 'public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}' },
  cpp:        { name: 'C++',        id: 54, start: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}' },
};

const COMPANY_TOPICS = {
  Google:     ['DSA', 'Dynamic Programming', 'BFS/DFS'],
  Amazon:     ['Arrays', 'Trees', 'Leadership Principles'],
  Microsoft:  ['Coding', 'System Basics', 'Recursion'],
  Meta:       ['Optimization', 'Graphs', 'Strings'],
  Apple:      ['Memory Mgmt', 'Edge Cases', 'Low-Level'],
  Netflix:    ['System Design', 'Scalability', 'Caching'],
  Adobe:      ['OOP', 'Design Patterns', 'APIs'],
  IBM:        ['Fundamentals', 'Databases', 'Networks'],
  Oracle:     ['SQL', 'Indexing', 'Transactions'],
  Salesforce: ['REST APIs', 'Cloud', 'Microservices'],
};

const DIFF_COLOR = {
  easy:   'text-emerald-700 bg-emerald-100 border border-emerald-200',
  medium: 'text-amber-700 bg-amber-100 border border-amber-200',
  hard:   'text-red-700 bg-red-100 border border-red-200',
};

const fmt = (s) => {
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

/* ─────────────────── component ─────────────────── */
export default function InterviewPageNew() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const session = state?.session;

  /* state */
  const [lang, setLang]     = useState('javascript');
  const [code, setCode]     = useState(LANG.javascript.start);
  const [leftTab, setLeftTab]   = useState('description'); // description | ai
  const [botTab, setBotTab]     = useState('testcases');  // testcases | result
  const [stdin, setStdin]       = useState('');
  const [runResult, setRunResult] = useState(null);  // { status, summary, cases: [...], customOutput? }
  const [isRunning, setIsRunning] = useState(false);

  const [status, setStatus]         = useState('idle'); // idle | speaking | listening | processing
  const [history, setHistory]       = useState([]);
  const [currentQ, setCurrentQ]     = useState(null);
  const [testCases, setTestCases]   = useState([]);      // [{stdin, expected_stdout, explanation}]
  const [starterCode, setStarterCode] = useState({});    // {python, javascript, java, cpp}
  const [chatInput, setChatInput]   = useState('');
  const [timer, setTimer]           = useState(0);
  const [warning, setWarning]       = useState('');
  // Monaco editor theme: 'vs' = light, 'vs-dark' = dark. One toggle button flips between.
  const [editorTheme, setEditorTheme] = useState('vs');
  // Proctoring: count every time the tab loses focus. Each switch = -0.5 on the final score.
  const [tabSwitches, setTabSwitches] = useState(0);
  // When the candidate submits passing code, we ask one follow-up before moving on.
  // While this is set, sendAnswer() will include code context so the backend can
  // weight coding correctness AND the candidate's spoken explanation.
  const [pendingCodeFollowup, setPendingCodeFollowup] = useState(null); // {code, language, passed_count, total_cases, coding_score, optimization_hint}
  const [finalReport, setFinalReport] = useState(null); // {overall_score, summary, strengths, weaknesses, recommendation, per_question: [...]}

  const chatEndRef = useRef(null);
  const timerRef   = useRef(null);
  const inputRef   = useRef(null);

  /* Company & topics */
  const company = session?.company || '';
  const companyLabel = company || 'General';
  const topics = COMPANY_TOPICS[company] || ['Algorithms', 'Data Structures', 'Problem Solving'];

  /* Voice I/O: browser TTS + SVG avatar driven by isSpeaking state */
  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { speak: ttsSpeak, stop: ttsStop, isSpeaking } = useSpeechSynthesis('female');
  // Mic stays OFF until the user explicitly clicks the mic icon. No auto-listen.

  const stop = useCallback(() => { ttsStop(); }, [ttsStop]);

  const speak = useCallback((text, cb) => {
    ttsSpeak(text, cb);
  }, [ttsSpeak]);

  /* ── Init ── */
  useEffect(() => {
    if (!session) { navigate('/companies'); return; }

    const q = {
      id:         session.question_id,
      text:       session.question,
      number:     session.question_number || 1,
      total:      session.total_questions || 5,
      difficulty: session.difficulty || 'medium',
      isCoding:   !!session.is_coding,
    };
    setCurrentQ(q);
    setHistory([{ role: 'ai', text: q.text, ts: Date.now() }]);

    // Load test cases + starter code if this is a coding question
    const incomingCases = Array.isArray(session.test_cases) ? session.test_cases : [];
    const incomingStarter = session.starter_code && typeof session.starter_code === 'object' ? session.starter_code : {};
    setTestCases(incomingCases);
    setStarterCode(incomingStarter);
    if (incomingStarter[lang]) {
      setCode(incomingStarter[lang]);
    }
    setBotTab(incomingCases.length > 0 ? 'testcases' : 'testcases');

    setStatus('speaking');
    speak(q.text, () => setStatus('idle'));

    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { stop(); stopListening(); clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Mirror live transcript into the input box only while the mic is on. */
  useEffect(() => {
    if (isListening && transcript) setChatInput(transcript.trim());
  }, [transcript, isListening]);
  /* Auto scroll chat */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);
  /* Warning auto-dismiss */
  useEffect(() => { if (warning) { const t = setTimeout(() => setWarning(''), 4000); return () => clearTimeout(t); } }, [warning]);
  /* Tab-switch detection — count each switch, warn the user, and later deduct
     from the final score. */
  useEffect(() => {
    const h = () => {
      if (document.hidden) {
        setTabSwitches((n) => n + 1);
        setWarning('⚠️ Tab switching detected — this will lower your final score.');
      }
    };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  /* ── Mic ── */
  const toggleMic = () => {
    if (isListening) {
      stopListening();
      setStatus('idle');
    } else {
      resetTranscript();
      setChatInput('');
      startListening();
      setStatus('listening');
    }
  };

  /* ── Send Answer ── */
  const sendAnswer = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !currentQ) return;

    setChatInput('');
    resetTranscript();
    stopListening();
    setStatus('processing');
    setHistory((h) => [...h, { role: 'user', text, ts: Date.now() }]);

    try {
      const payload = {
        session_id:  session.session_id,
        question_id: currentQ.id,
        answer_text: text,
      };
      // If the candidate is answering our post-submit follow-up, bundle the code
      // context so the backend can score correctness + explanation together.
      if (pendingCodeFollowup) {
        Object.assign(payload, {
          code:         pendingCodeFollowup.code,
          language:     pendingCodeFollowup.language,
          coding_score: pendingCodeFollowup.coding_score,
          passed_count: pendingCodeFollowup.passed_count,
          total_cases:  pendingCodeFollowup.total_cases,
        });
      }
      const { data } = await interviewAPI.respond(payload);
      const wasFollowup = !!pendingCodeFollowup;
      setPendingCodeFollowup(null);

      // Evaluation message
      const evalText = `Score: ${data.evaluation?.score ?? '?'}/10 — ${data.evaluation?.feedback ?? 'Good answer.'}`;
      setHistory((h) => [...h, { role: 'eval', text: evalText, ts: Date.now() }]);

      if (data.is_finished) {
        setHistory((h) => [...h, { role: 'system', text: 'Interview complete — generating your report...', ts: Date.now() }]);
        await showFinalReport();
      } else if (data.next_question) {
        const nextQ = {
          id:         data.next_question_id,
          text:       data.next_question,
          number:     (currentQ.number || 1) + 1,
          total:      currentQ.total,
          difficulty: data.difficulty || currentQ.difficulty,
          isCoding:   !!data.is_coding,
        };
        setCurrentQ(nextQ);
        setHistory((h) => [...h, { role: 'ai', text: data.next_question, ts: Date.now() }]);

        // Hydrate test cases + starter code for the new question
        const nextCases = Array.isArray(data.test_cases) ? data.test_cases : [];
        const nextStarter = data.starter_code && typeof data.starter_code === 'object' ? data.starter_code : {};
        setTestCases(nextCases);
        setStarterCode(nextStarter);
        if (nextStarter[lang]) {
          setCode(nextStarter[lang]);
        }
        setRunResult(null);
        setBotTab('testcases');

        setStatus('speaking');
        speak(data.next_question, () => setStatus('idle'));
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.error || err?.message || 'AI response failed. Please try again.';
      setHistory((h) => [...h, { role: 'system', text: errMsg, ts: Date.now() }]);
      setStatus('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatInput, currentQ, session, speak, pendingCodeFollowup, lang]);

  /* ── Final report ── */
  const PENALTY_PER_TAB_SWITCH = 0.5;   // points deducted per switch
  const MAX_PENALTY            = 3.0;   // cap so a flaky user can't go to 0 instantly

  const showFinalReport = useCallback(async () => {
    clearInterval(timerRef.current);
    stop();
    stopListening();
    const penalty = Math.min(MAX_PENALTY, tabSwitches * PENALTY_PER_TAB_SWITCH);
    try {
      const { data } = await interviewAPI.end({ session_id: session.session_id });
      const r = data.result || {};
      const raw = Number(r.overall_score ?? 0);
      const adjusted = Math.max(0, Math.round((raw - penalty) * 10) / 10);
      setFinalReport({
        raw_score:     raw,
        overall_score: adjusted,
        summary:       r.summary || '',
        strengths:     r.strengths || '',
        weaknesses:    r.weaknesses || '',
        recommendation: r.recommendation || '',
        study_plan:    data.study_plan || '',
        tab_switches:  tabSwitches,
        penalty,
      });
    } catch (e) {
      console.error(e);
      setFinalReport({
        raw_score: 0,
        overall_score: 0,
        summary: 'Could not generate the final report, but the interview is saved.',
        strengths: '', weaknesses: '', recommendation: '', study_plan: '',
        tab_switches: tabSwitches,
        penalty,
      });
    }
  }, [session, stop, stopListening, tabSwitches]);

  /* ── End (manual exit without report) ── */
  const doEnd = useCallback(async () => {
    clearInterval(timerRef.current);
    stop();
    stopListening();
    try { if (session?.session_id) await interviewAPI.end({ session_id: session.session_id }); } catch (e) { console.error(e); }
    navigate('/dashboard');
  }, [session, navigate, stop, stopListening]);

  /* ── Run Code ──
     If test cases are attached to the question, run against each and show per-case pass/fail.
     Otherwise, fall back to a single run using the custom stdin box. */
  const runCode = async (isSubmit = false) => {
    if (!code.trim()) {
      setRunResult({ status: 'Nothing to run', summary: 'Write some code first.', cases: [] });
      setBotTab('result');
      return;
    }
    setIsRunning(true);
    setBotTab('result');
    setRunResult(null);

    const runOne = (testStdin) =>
      interviewAPI.evaluateCode({
        source_code: code,
        language_id: LANG[lang].id,
        language:    lang,
        stdin:       testStdin,
        is_submission: isSubmit,
      });

    try {
      if (testCases.length > 0) {
        const results = [];
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          try {
            const { data } = await runOne(tc.stdin ?? '');
            const actual = (data.output || '').trim();
            const expected = (tc.expected_stdout || '').trim();
            const passed = data.passed && actual === expected;
            results.push({
              index: i + 1,
              passed,
              actual,
              expected,
              stdin: tc.stdin ?? '',
              explanation: tc.explanation || '',
              status: data.status || (passed ? 'Accepted' : 'Wrong Answer'),
            });
          } catch (err) {
            const msg = err?.response?.data?.error || err.message || 'Execution failed';
            results.push({
              index: i + 1,
              passed: false,
              actual: '',
              expected: tc.expected_stdout || '',
              stdin: tc.stdin ?? '',
              explanation: tc.explanation || '',
              status: `Error: ${msg}`,
            });
          }
        }
        const allPassed = results.every((r) => r.passed);
        const passedCount = results.filter((r) => r.passed).length;
        setRunResult({
          status: allPassed ? 'Accepted ✓' : 'Wrong Answer',
          summary: `${passedCount} / ${results.length} cases passed`,
          cases: results,
          passed: allPassed,
        });

        if (isSubmit) {
          // Only move forward if at least the majority passed. Otherwise tell them to fix first.
          if (allPassed) {
            setHistory((h) => [...h, { role: 'system', text: '✅ All test cases passed — asking you a follow-up...', ts: Date.now() }]);
            try {
              const { data: fu } = await interviewAPI.submitCode({
                session_id:   session.session_id,
                question_id:  currentQ.id,
                code,
                language:     lang,
                passed_count: passedCount,
                total_cases:  results.length,
              });
              setPendingCodeFollowup({
                code,
                language: lang,
                passed_count: passedCount,
                total_cases: results.length,
                coding_score: fu.coding_score,
                optimization_hint: fu.optimization_hint || '',
              });
              setLeftTab('ai');
              setHistory((h) => [...h, { role: 'ai', text: fu.followup_question, ts: Date.now() }]);
              setStatus('speaking');
              speak(fu.followup_question, () => setStatus('idle'));
            } catch (err) {
              console.error(err);
              const msg = err?.response?.data?.error || err.message || 'Could not generate follow-up.';
              setHistory((h) => [...h, { role: 'system', text: `Follow-up failed: ${msg}`, ts: Date.now() }]);
            }
          } else {
            setHistory((h) => [...h, { role: 'system', text: `⚠️ ${passedCount}/${results.length} cases passed. Fix the failing ones, then submit again.`, ts: Date.now() }]);
          }
        }
      } else {
        // No test cases — single run with custom stdin
        const { data } = await runOne(stdin);
        setRunResult({
          status: data.status || (data.passed ? 'Accepted' : 'Wrong Answer'),
          summary: data.passed ? 'Executed successfully' : 'Execution finished with issues',
          cases: [],
          customOutput: data.output || '',
          feedback: data.feedback || '',
          passed: !!data.passed,
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Execution failed';
      setRunResult({
        status: 'Error',
        summary: msg,
        cases: [],
      });
    } finally {
      setIsRunning(false);
    }
  };

  /* ─────────────────── render ─────────────────── */
  return (
    <div className="flex flex-col h-screen bg-theme-bg text-theme-text overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ═══════════ TOP NAVBAR ═══════════ */}
      <header className="shrink-0 h-12 bg-theme-surface border-b border-theme-border flex items-center px-4">
        {/* --- LEFT: Logo + Home --- */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-theme-text font-bold text-sm hover:text-theme-accent transition">
            <span className="text-blue-500 font-black text-lg">⚡</span>
            <span>CrackItNow</span>
          </button>
          <span className="text-[#333]">·</span>
          <button onClick={() => navigate('/dashboard')} className="text-xs text-theme-text-muted hover:text-theme-text transition flex items-center gap-1 px-2 py-1 rounded hover:bg-theme-surface">
            ← Home
          </button>
        </div>

        {/* --- CENTER: Status pill --- */}
        <div className="flex-1 flex justify-center">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
            status === 'speaking'   ? 'bg-blue-100 border border-blue-300 text-blue-700' :
            status === 'listening'  ? 'bg-emerald-100 border border-emerald-300 text-emerald-700' :
            status === 'processing' ? 'bg-amber-100 border border-amber-300 text-amber-700' :
            'bg-theme-surface border-theme-border text-theme-text-muted'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === 'speaking'   ? 'bg-theme-accent animate-pulse' :
              status === 'listening'  ? 'bg-green-400 animate-pulse' :
              status === 'processing' ? 'bg-amber-400 animate-bounce' :
              'bg-gray-600'}`} />
            {status === 'speaking' ? 'AI Speaking' : status === 'listening' ? 'Listening…' : status === 'processing' ? 'Processing…' : 'Ready'}
          </div>
        </div>

        {/* --- RIGHT: Timer + End --- */}
        <div className="flex items-center gap-4 min-w-[180px] justify-end">
          <span className="font-mono text-xs text-theme-text-muted tabular-nums">{fmt(timer)}</span>
          <button onClick={() => doEnd()} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 transition-all">
            End Session
          </button>
        </div>
      </header>

      {/* ═══════════ MAIN SPLIT (resizable) ═══════════ */}
      <Group orientation="horizontal" className="flex-1 min-h-0">

        {/* ════ LEFT PANE ════ */}
        <Panel defaultSize={43} minSize={30} maxSize={65}>
        <div className="h-full flex flex-col border-r border-theme-border bg-theme-surface">

          {/* Tab bar */}
          <div className="shrink-0 flex border-b border-theme-border bg-theme-bg">
            {[{ id: 'description', icon: '📄', label: 'Problem' }, { id: 'ai', icon: isSpeaking ? '🔊' : '🤖', label: 'AI Interviewer' }].map((t) => (
              <button key={t.id} onClick={() => setLeftTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  leftTab === t.id ? 'border-blue-500 text-theme-text bg-theme-surface' : 'border-transparent text-theme-text-muted hover:text-theme-text'
                }`}>
                {t.icon} {t.label}
                {t.id === 'ai' && status === 'speaking' && <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-pulse ml-1" />}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-theme-border) var(--color-theme-surface)' }}>

            {/* ── DESCRIPTION ── */}
            {leftTab === 'description' && (
              <div className="p-6 space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-xl font-bold text-theme-text leading-tight">
                    Q{currentQ?.number ?? 1}. {companyLabel} — {
                      session?.role ? session.role.charAt(0).toUpperCase() + session.role.slice(1) : 'Fullstack'
                    } Interview
                  </h1>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {currentQ?.difficulty && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${DIFF_COLOR[currentQ.difficulty] || DIFF_COLOR.medium}`}>
                        {currentQ.difficulty.charAt(0).toUpperCase() + currentQ.difficulty.slice(1)}
                      </span>
                    )}
                    {topics.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-theme-surface border border-theme-border text-theme-text-muted">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Question text */}
                <div className="bg-theme-bg border border-theme-border rounded-xl p-5">
                  <p className="text-sm text-theme-text leading-7 whitespace-pre-wrap">
                    {currentQ?.text || 'Loading question from AI…'}
                  </p>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-theme-text-muted mb-2">
                    <span>Question Progress</span>
                    <span>{currentQ?.number ?? 1} / {currentQ?.total ?? 5}</span>
                  </div>
                  <div className="w-full h-1.5 bg-theme-border rounded-full overflow-hidden">
                    <div className="h-full bg-theme-accent rounded-full transition-all duration-500"
                      style={{ width: `${((currentQ?.number ?? 1) / (currentQ?.total ?? 5)) * 100}%` }} />
                  </div>
                </div>

                {/* Company footnote */}
                <p className="text-xs text-theme-text-muted pt-2 border-t border-theme-border">
                  Company: <span className="text-theme-text-muted font-medium">{companyLabel}</span>
                  {' · '} Difficulty: <span className="text-theme-text-muted font-medium">{currentQ?.difficulty ?? 'medium'}</span>
                </p>
              </div>
            )}

            {/* ── AI CHAT ── */}
            {leftTab === 'ai' && (
              <div className="flex flex-col h-full p-4 gap-4" style={{ minHeight: '500px' }}>
                {/* Avatar + Camera row */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="bg-black border border-theme-border rounded-2xl overflow-hidden aspect-[4/3] relative flex items-center justify-center">
                    <div className="absolute top-2 left-2 z-20 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm shadow text-center">
                      <p className="text-[9px] text-theme-text uppercase tracking-widest">AI Interviewer</p>
                    </div>
                    <div className="absolute inset-x-2 inset-y-2 z-10">
                      <AIAvatar isSpeaking={isSpeaking} isListening={isListening} />
                    </div>
                  </div>
                  <div className="bg-black rounded-2xl border border-theme-border overflow-hidden">
                    <p className="text-[9px] text-theme-text-muted uppercase tracking-widest absolute p-2">You</p>
                    <CameraPreview compact />
                  </div>
                </div>

                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-theme-border) var(--color-theme-surface)' }}>
                  {history.map((msg, i) => {
                    if (msg.role === 'user') {
                      return (
                        <div key={i} className="flex justify-end">
                          <div className="bg-theme-accent/15 border border-theme-accent/30 text-blue-700 text-xs rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] leading-relaxed">
                            {msg.text}
                          </div>
                        </div>
                      );
                    } else if (msg.role === 'ai') {
                      return (
                        <div key={i} className="flex justify-start gap-2">
                          <div className="w-6 h-6 shrink-0 rounded-full bg-theme-accent flex items-center justify-center text-[10px] mt-1">🤖</div>
                          <div className="bg-theme-surface border border-theme-border text-theme-text text-xs rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] leading-relaxed">
                            {msg.text}
                          </div>
                        </div>
                      );
                    } else if (msg.role === 'eval') {
                      return (
                        <div key={i} className="flex justify-center">
                          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] rounded-xl px-4 py-2 max-w-[90%] text-center leading-relaxed">
                            {msg.text}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={i} className="flex justify-center">
                          <div className="bg-theme-surface border border-theme-border text-theme-text-muted text-[10px] rounded-xl px-3 py-1.5">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input area */}
                <div className="shrink-0 space-y-2 border-t border-theme-border pt-3">
                  <textarea
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
                    placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
                    rows={3}
                    disabled={status === 'processing'}
                    className="w-full bg-theme-bg border border-theme-border focus:border-theme-accent text-sm text-theme-text placeholder-theme-text-muted/50 rounded-xl px-4 py-3 resize-none outline-none transition-colors disabled:opacity-50"
                  />
                  <div className="flex gap-2">
                    <button onClick={toggleMic}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-base transition-all ${
                        isListening
                          ? 'bg-red-100 border-red-400 animate-pulse'
                          : 'bg-theme-surface border-theme-border hover:border-gray-500 text-theme-text-muted hover:text-theme-text'
                      }`}>
                      🎙️
                    </button>
                    <button onClick={sendAnswer}
                      disabled={!chatInput.trim() || status === 'processing'}
                      className="flex-1 h-10 bg-theme-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all">
                      {status === 'processing' ? 'Sending…' : 'Send Answer ↵'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </Panel>

        <Separator className="w-1.5 bg-theme-border hover:bg-theme-accent data-[resize-active]:bg-theme-accent transition-colors cursor-col-resize relative">
          <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-theme-text-muted/40" />
        </Separator>

        {/* ════ RIGHT PANE — resizable editor above, console below ════ */}
        <Panel defaultSize={57} minSize={35} maxSize={70}>
        <div className="h-full flex flex-col bg-theme-surface">
          <Group orientation="vertical" className="h-full">
            <Panel defaultSize={65} minSize={35} maxSize={85}>
            <div className="h-full flex flex-col">
          {/* Editor toolbar */}
          <div className="shrink-0 h-10 bg-theme-bg border-b border-theme-border flex items-center px-4 gap-3">
            <select value={lang}
              onChange={(e) => {
                const next = e.target.value;
                setLang(next);
                setCode(starterCode[next] || LANG[next].start);
              }}
              className="bg-theme-border border border-theme-border text-theme-text text-xs rounded-lg px-3 py-1 focus:outline-none focus:border-theme-accent cursor-pointer">
              {Object.entries(LANG).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
            <span className="text-theme-border">|</span>
            <span className="text-[11px] text-theme-text-muted font-mono select-none">
              {companyLabel} • {currentQ?.difficulty ?? 'medium'} • Q{currentQ?.number ?? 1}/{currentQ?.total ?? 5}
            </span>
            <button
              onClick={() => setEditorTheme((t) => (t === 'vs' ? 'vs-dark' : 'vs'))}
              title={editorTheme === 'vs' ? 'Switch editor to dark mode' : 'Switch editor to light mode'}
              aria-label="Toggle editor theme"
              className="ml-auto w-8 h-7 rounded-md border border-theme-border bg-theme-bg hover:bg-theme-border text-theme-text-muted hover:text-theme-text flex items-center justify-center text-sm transition"
            >
              {editorTheme === 'vs' ? '☾' : '☼'}
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={lang}
              theme={editorTheme}
              value={code}
              onChange={(v) => setCode(v || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 22,
                padding: { top: 14 },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'all',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
              }}
            />
          </div>

            </div>
            </Panel>

            <Separator className="h-1.5 bg-theme-border hover:bg-theme-accent data-[resize-active]:bg-theme-accent transition-colors cursor-row-resize relative">
              <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-10 rounded-full bg-theme-text-muted/40" />
            </Separator>

            <Panel defaultSize={35} minSize={20} maxSize={65}>
          {/* ── Console Panel ── */}
          <div className="h-full flex flex-col border-t border-theme-border bg-theme-surface">

            {/* Console tab bar */}
            <div className="shrink-0 flex bg-theme-surface border-b border-theme-border">
              {[{ id: 'testcases', label: 'Testcase' }, { id: 'result', label: 'Test Result' }].map((t) => (
                <button key={t.id} onClick={() => setBotTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-2 text-xs font-medium border-b-2 transition-all ${
                    botTab === t.id ? 'border-green-500 text-theme-text' : 'border-transparent text-theme-text-muted hover:text-theme-text'
                  }`}>
                  {t.label}
                  {t.id === 'result' && isRunning && (
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Console content */}
            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-theme-border) var(--color-theme-surface)' }}>
              {botTab === 'testcases' && (
                <div className="space-y-3 h-full">
                  {testCases.length > 0 ? (
                    <>
                      <div className="text-[10px] font-mono text-theme-text-muted uppercase tracking-widest">
                        Sample Test Cases ({testCases.length})
                      </div>
                      <ul className="space-y-2">
                        {testCases.map((tc, i) => (
                          <li key={i} className="bg-theme-surface border border-theme-border rounded-lg p-3 text-xs font-mono">
                            <div className="text-theme-text-muted mb-1">Case {i + 1}{tc.explanation ? ` — ${tc.explanation}` : ''}</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-[10px] text-theme-text-muted uppercase">stdin</div>
                                <pre className="text-theme-text whitespace-pre-wrap">{tc.stdin ?? ''}</pre>
                              </div>
                              <div>
                                <div className="text-[10px] text-theme-text-muted uppercase">expected stdout</div>
                                <pre className="text-theme-text whitespace-pre-wrap">{tc.expected_stdout ?? ''}</pre>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <label className="text-[10px] font-mono text-theme-text-muted uppercase tracking-widest">Custom stdin input</label>
                      <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={4}
                        placeholder="No test cases for this question. Provide stdin to pass to your program..."
                        className="w-full bg-theme-surface border border-theme-border text-xs font-mono text-theme-text placeholder-theme-text-muted/50 p-3 rounded-lg resize-none focus:outline-none focus:border-theme-accent" />
                    </>
                  )}
                </div>
              )}

              {botTab === 'result' && (
                <div className="h-full">
                  {!runResult && !isRunning && (
                    <div className="h-full flex flex-col items-center justify-center text-theme-text-muted text-xs gap-2">
                      <span className="text-2xl">▶</span>
                      <span>Run your code to see output here</span>
                    </div>
                  )}
                  {isRunning && (
                    <div className="h-full flex items-center justify-center gap-3 text-emerald-600 text-sm">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      Executing…
                    </div>
                  )}
                  {!isRunning && runResult && (
                    <div className="space-y-3">
                      {/* Status line */}
                      <div className="flex items-baseline gap-3">
                        <div className={`text-base font-bold ${runResult.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                          {runResult.status}
                        </div>
                        {runResult.summary && (
                          <div className="text-xs text-theme-text-muted">{runResult.summary}</div>
                        )}
                      </div>

                      {/* Per-case list */}
                      {runResult.cases && runResult.cases.length > 0 && (
                        <ul className="space-y-2">
                          {runResult.cases.map((c) => (
                            <li key={c.index} className={`border rounded-lg p-3 text-xs font-mono ${
                              c.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={c.passed ? 'text-emerald-600' : 'text-red-600'}>
                                  {c.passed ? '✓' : '✗'}
                                </span>
                                <span className="text-theme-text-muted">Case {c.index}</span>
                                <span className="text-[10px] text-theme-text-muted">{c.status}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-[11px]">
                                <div>
                                  <div className="text-[10px] text-theme-text-muted uppercase">stdin</div>
                                  <pre className="text-theme-text whitespace-pre-wrap">{c.stdin || '(none)'}</pre>
                                </div>
                                <div>
                                  <div className="text-[10px] text-theme-text-muted uppercase">expected</div>
                                  <pre className="text-theme-text whitespace-pre-wrap">{c.expected || '(empty)'}</pre>
                                </div>
                                <div>
                                  <div className="text-[10px] text-theme-text-muted uppercase">actual</div>
                                  <pre className={`whitespace-pre-wrap ${c.passed ? 'text-theme-text' : 'text-red-500'}`}>{c.actual || '(empty)'}</pre>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Single-run output when there are no test cases */}
                      {runResult.cases.length === 0 && runResult.customOutput !== undefined && (
                        <div>
                          <div className="text-[10px] text-theme-text-muted uppercase tracking-widest mb-1">Output</div>
                          <pre className="bg-theme-bg border border-theme-border rounded-lg p-3 text-xs font-mono text-theme-text whitespace-pre-wrap overflow-x-auto">
                            {runResult.customOutput || '(no output)'}
                          </pre>
                        </div>
                      )}

                      {runResult.feedback && (
                        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          💡 {runResult.feedback}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-theme-bg border-t border-theme-border">
              <span className="text-[10px] text-theme-text-muted font-mono select-none">console</span>
              <div className="flex gap-2">
                <button onClick={() => runCode(false)} disabled={isRunning}
                  className="px-5 py-1.5 rounded-lg bg-theme-border hover:bg-theme-border disabled:opacity-40 border border-theme-border text-theme-text text-xs font-semibold transition-all">
                  {isRunning ? 'Running…' : 'Run Code'}
                </button>
                <button onClick={() => runCode(true)} disabled={isRunning}
                  className="px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all">
                  {isRunning ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
            </Panel>
          </Group>
        </div>
        </Panel>
      </Group>

      {/* Warning toast */}
      {warning && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-950 border border-red-700/60 text-red-700 px-5 py-2.5 rounded-xl shadow-2xl text-sm font-medium">
          {warning}
        </div>
      )}

      {/* Final scorecard modal */}
      {finalReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-theme-surface border border-theme-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-theme-border">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-bold text-theme-text">Interview Report</h2>
                <span className="text-[11px] text-theme-text-muted font-mono">
                  {companyLabel} · {session?.role || 'general'} · {currentQ?.total ?? 5} questions
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Overall score */}
              <div className="flex items-center gap-6 bg-theme-bg border border-theme-border rounded-xl p-5">
                <div className="text-center shrink-0">
                  <div className="text-5xl font-black text-theme-accent leading-none">
                    {Number(finalReport.overall_score ?? 0).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-theme-text-muted mt-1 uppercase tracking-widest">out of 10</div>
                  {finalReport.penalty > 0 && (
                    <div className="text-[10px] text-red-600 mt-1 font-medium">
                      was {Number(finalReport.raw_score ?? 0).toFixed(1)} · −{finalReport.penalty.toFixed(1)} penalty
                    </div>
                  )}
                </div>
                <p className="text-sm text-theme-text leading-relaxed">{finalReport.summary || 'Interview saved.'}</p>
              </div>

              {/* Integrity / malpractice */}
              <div className={`rounded-xl p-4 border ${finalReport.tab_switches > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-[10px] uppercase tracking-widest mb-1 ${finalReport.tab_switches > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      Integrity Check
                    </div>
                    {finalReport.tab_switches > 0 ? (
                      <p className="text-xs text-red-800 leading-relaxed">
                        Tab switched <b>{finalReport.tab_switches}</b> time{finalReport.tab_switches === 1 ? '' : 's'} during the interview.
                        Each switch = −{PENALTY_PER_TAB_SWITCH} (capped at −{MAX_PENALTY}). Net penalty applied: <b>−{finalReport.penalty.toFixed(1)}</b>.
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        No tab switches detected. Full marks retained.
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`text-2xl font-bold ${finalReport.tab_switches > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {finalReport.tab_switches > 0 ? `−${finalReport.penalty.toFixed(1)}` : '0.0'}
                    </div>
                    <div className="text-[10px] text-theme-text-muted uppercase tracking-widest">penalty</div>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              {finalReport.recommendation && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-widest text-theme-accent mb-1">Recommendation</div>
                  <p className="text-sm text-blue-700 leading-relaxed">{finalReport.recommendation}</p>
                </div>
              )}

              {/* Strengths / weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {finalReport.strengths && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-700 mb-1">Strengths</div>
                    <p className="text-xs text-emerald-700 leading-relaxed whitespace-pre-wrap">{finalReport.strengths}</p>
                  </div>
                )}
                {finalReport.weaknesses && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-widest text-amber-700 mb-1">Areas to Improve</div>
                    <p className="text-xs text-amber-700 leading-relaxed whitespace-pre-wrap">{finalReport.weaknesses}</p>
                  </div>
                )}
              </div>

              {/* Study plan */}
              {finalReport.study_plan && (
                <div className="bg-theme-bg border border-theme-border rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted mb-1">Suggested Study Plan</div>
                  <p className="text-xs text-theme-text leading-relaxed whitespace-pre-wrap">{finalReport.study_plan}</p>
                </div>
              )}

              {/* Per-question eval scores pulled from chat history */}
              {history.some((m) => m.role === 'eval') && (
                <div className="bg-theme-bg border border-theme-border rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-widest text-theme-text-muted mb-2">Per-Question Evaluations</div>
                  <ul className="space-y-1.5">
                    {history.filter((m) => m.role === 'eval').map((m, i) => (
                      <li key={i} className="text-[11px] text-amber-800 border-l-2 border-amber-400 pl-3 leading-relaxed">
                        Q{i + 1}: {m.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-theme-border flex justify-end gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2 rounded-lg bg-theme-accent hover:opacity-90 text-white text-xs font-bold transition-all"
              >
                Back to Dashboard →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
