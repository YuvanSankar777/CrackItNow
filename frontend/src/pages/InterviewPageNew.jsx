import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { interviewAPI } from '../api/client';
import DIDAvatar from '../components/DIDAvatar';
import CameraPreview from '../components/CameraPreview';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useDIDStream } from '../hooks/useDIDStream';

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
  easy:   'text-emerald-400 bg-emerald-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  hard:   'text-red-400 bg-red-900/30',
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
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const [status, setStatus]         = useState('idle'); // idle | speaking | listening | processing
  const [history, setHistory]       = useState([]);
  const [currentQ, setCurrentQ]     = useState(null);
  const [chatInput, setChatInput]   = useState('');
  const [timer, setTimer]           = useState(0);
  const [warning, setWarning]       = useState('');

  const chatEndRef = useRef(null);
  const timerRef   = useRef(null);
  const inputRef   = useRef(null);

  /* Company & topics */
  const company = session?.company || '';
  const companyLabel = company || 'General';
  const topics = COMPANY_TOPICS[company] || ['Algorithms', 'Data Structures', 'Problem Solving'];

  /* Voice & Avatar Stream */
  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { stream, didStatus, speak: didSpeak, disconnect } = useDIDStream();
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const stop = () => { disconnect(); setIsSpeaking(false); };
  
  const speak = useCallback((text, cb) => {
    setIsSpeaking(true);
    didSpeak(text, () => {
      setIsSpeaking(false);
      if (cb) cb();
    });
  }, [didSpeak]);

  /* ── Init ── */
  useEffect(() => {
    if (!session) { navigate('/companies'); return; }

    const q = {
      id:         session.question_id,
      text:       session.question,
      number:     session.question_number || 1,
      total:      session.total_questions || 5,
      difficulty: session.difficulty || 'medium',
    };
    setCurrentQ(q);
    setHistory([{ role: 'ai', text: q.text, ts: Date.now() }]);
    setStatus('speaking');
    speak(q.text, () => setStatus('idle'));

    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { stop(); stopListening(); clearInterval(timerRef.current); };
  }, []);

  /* Sync voice transcript → input */
  useEffect(() => { if (transcript) setChatInput(transcript.trim()); }, [transcript]);
  /* Auto scroll chat */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);
  /* Warning auto-dismiss */
  useEffect(() => { if (warning) { const t = setTimeout(() => setWarning(''), 4000); return () => clearTimeout(t); } }, [warning]);
  /* Tab-switch detection */
  useEffect(() => {
    const h = () => { if (document.hidden) setWarning('⚠️ Tab switching detected and flagged.'); };
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
      const { data } = await interviewAPI.respond({
        session_id:  session.session_id,
        question_id: currentQ.id,
        answer_text: text,
      });

      // Evaluation message
      const evalText = `Score: ${data.evaluation?.score ?? '?'}/10 — ${data.evaluation?.feedback ?? 'Good answer.'}`;
      setHistory((h) => [...h, { role: 'eval', text: evalText, ts: Date.now() }]);

      if (data.is_finished) {
        setHistory((h) => [...h, { role: 'system', text: 'Interview complete! Redirecting to dashboard...', ts: Date.now() }]);
        await doEnd();
      } else if (data.next_question) {
        const nextQ = {
          id:         data.next_question_id,
          text:       data.next_question,
          number:     (currentQ.number || 1) + 1,
          total:      currentQ.total,
          difficulty: data.difficulty || currentQ.difficulty,
        };
        setCurrentQ(nextQ);
        setHistory((h) => [...h, { role: 'ai', text: data.next_question, ts: Date.now() }]);
        setStatus('speaking');
        speak(data.next_question, () => setStatus('idle'));
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.error || 'AI response failed. Please try again.';
      setHistory((h) => [...h, { role: 'system', text: errMsg, ts: Date.now() }]);
      setStatus('idle');
    }
  }, [chatInput, currentQ, session, speak]);

  /* ── End ── */
  const doEnd = useCallback(async () => {
    clearInterval(timerRef.current);
    stop();
    stopListening();
    try { if (session?.session_id) await interviewAPI.end({ session_id: session.session_id }); } catch (e) { console.error(e); }
    navigate('/dashboard');
  }, [session, navigate, stop, stopListening]);

  /* ── Run Code ── */
  const runCode = async (isSubmit = false) => {
    if (!code.trim()) return;
    setIsRunning(true);
    setBotTab('result');
    setRunResult(null);
    try {
      const { data } = await interviewAPI.evaluateCode({
        source_code: code,
        language_id: LANG[lang].id,
        language:    lang,
        stdin:       stdin,
        is_submission: isSubmit,
      });

      setRunResult({
        passed:   data.passed,
        status:   data.status || (data.passed ? 'Accepted' : 'Wrong Answer'),
        output:   data.output || '',
        time:     data.time_complexity,
        space:    data.space_complexity,
        feedback: data.feedback || '',
        suggestions: data.suggestions || [],
      });

      if (data.passed && isSubmit) {
        setHistory((h) => [...h, { role: 'system', text: '✅ Code submitted and accepted! Great job.', ts: Date.now() }]);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Execution failed';
      setRunResult({ passed: false, status: 'Error', output: msg, feedback: '' });
    } finally {
      setIsRunning(false);
    }
  };

  /* ─────────────────── render ─────────────────── */
  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] text-gray-200 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ═══════════ TOP NAVBAR ═══════════ */}
      <header className="shrink-0 h-12 bg-[#111] border-b border-[#222] flex items-center px-4">
        {/* --- LEFT: Logo + Home --- */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-white font-bold text-sm hover:text-blue-400 transition">
            <span className="text-blue-500 font-black text-lg">⚡</span>
            <span>CrackItNow</span>
          </button>
          <span className="text-[#333]">·</span>
          <button onClick={() => navigate('/dashboard')} className="text-xs text-gray-500 hover:text-gray-200 transition flex items-center gap-1 px-2 py-1 rounded hover:bg-[#1e1e1e]">
            ← Home
          </button>
        </div>

        {/* --- CENTER: Status pill --- */}
        <div className="flex-1 flex justify-center">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
            status === 'speaking'   ? 'bg-blue-600/15 border-blue-500/30 text-blue-300' :
            status === 'listening'  ? 'bg-green-600/15 border-green-500/30 text-green-300' :
            status === 'processing' ? 'bg-amber-600/15 border-amber-500/30 text-amber-300' :
            'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === 'speaking'   ? 'bg-blue-400 animate-pulse' :
              status === 'listening'  ? 'bg-green-400 animate-pulse' :
              status === 'processing' ? 'bg-amber-400 animate-bounce' :
              'bg-gray-600'}`} />
            {status === 'speaking' ? 'AI Speaking' : status === 'listening' ? 'Listening…' : status === 'processing' ? 'Processing…' : 'Ready'}
          </div>
        </div>

        {/* --- RIGHT: Timer + End --- */}
        <div className="flex items-center gap-4 min-w-[180px] justify-end">
          <span className="font-mono text-xs text-gray-400 tabular-nums">{fmt(timer)}</span>
          <button onClick={() => doEnd()} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 text-red-400 hover:text-red-200 transition-all">
            End Session
          </button>
        </div>
      </header>

      {/* ═══════════ MAIN SPLIT ═══════════ */}
      <div className="flex flex-1 min-h-0">

        {/* ════ LEFT PANE ════ */}
        <div className="w-[43%] shrink-0 flex flex-col border-r border-[#222] bg-[#111]">

          {/* Tab bar */}
          <div className="shrink-0 flex border-b border-[#222] bg-[#0d0d0d]">
            {[{ id: 'description', icon: '📄', label: 'Problem' }, { id: 'ai', icon: isSpeaking ? '🔊' : '🤖', label: 'AI Interviewer' }].map((t) => (
              <button key={t.id} onClick={() => setLeftTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  leftTab === t.id ? 'border-blue-500 text-white bg-[#111]' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}>
                {t.icon} {t.label}
                {t.id === 'ai' && status === 'speaking' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse ml-1" />}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 #111' }}>

            {/* ── DESCRIPTION ── */}
            {leftTab === 'description' && (
              <div className="p-6 space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-xl font-bold text-white leading-tight">
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
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] text-gray-400">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Question text */}
                <div className="bg-[#161616] border border-[#252525] rounded-xl p-5">
                  <p className="text-sm text-gray-200 leading-7 whitespace-pre-wrap">
                    {currentQ?.text || 'Loading question from AI…'}
                  </p>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Question Progress</span>
                    <span>{currentQ?.number ?? 1} / {currentQ?.total ?? 5}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${((currentQ?.number ?? 1) / (currentQ?.total ?? 5)) * 100}%` }} />
                  </div>
                </div>

                {/* Company footnote */}
                <p className="text-xs text-gray-600 pt-2 border-t border-[#1e1e1e]">
                  Company: <span className="text-gray-400 font-medium">{companyLabel}</span>
                  {' · '} Difficulty: <span className="text-gray-400 font-medium">{currentQ?.difficulty ?? 'medium'}</span>
                </p>
              </div>
            )}

            {/* ── AI CHAT ── */}
            {leftTab === 'ai' && (
              <div className="flex flex-col h-full p-4 gap-4" style={{ minHeight: '500px' }}>
                {/* Avatar + Camera row */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="bg-black border border-[#252525] rounded-2xl overflow-hidden aspect-[4/3] relative flex items-center justify-center">
                    <div className="absolute top-2 left-2 z-20 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm shadow text-center">
                      <p className="text-[9px] text-gray-300 uppercase tracking-widest">AI Interviewer</p>
                    </div>
                    <div className="absolute inset-x-2 inset-y-2 z-10">
                      <DIDAvatar stream={stream} didStatus={didStatus} isSpeaking={isSpeaking || didStatus === 'connecting'} isListening={isListening} />
                    </div>
                  </div>
                  <div className="bg-black rounded-2xl border border-[#252525] overflow-hidden">
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest absolute p-2">You</p>
                    <CameraPreview compact />
                  </div>
                </div>

                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 #111' }}>
                  {history.map((msg, i) => {
                    if (msg.role === 'user') {
                      return (
                        <div key={i} className="flex justify-end">
                          <div className="bg-blue-600/20 border border-blue-500/25 text-blue-100 text-xs rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] leading-relaxed">
                            {msg.text}
                          </div>
                        </div>
                      );
                    } else if (msg.role === 'ai') {
                      return (
                        <div key={i} className="flex justify-start gap-2">
                          <div className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[10px] mt-1">🤖</div>
                          <div className="bg-[#1e1e1e] border border-[#2e2e2e] text-gray-200 text-xs rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] leading-relaxed">
                            {msg.text}
                          </div>
                        </div>
                      );
                    } else if (msg.role === 'eval') {
                      return (
                        <div key={i} className="flex justify-center">
                          <div className="bg-amber-900/20 border border-amber-700/30 text-amber-300 text-[10px] rounded-xl px-4 py-2 max-w-[90%] text-center leading-relaxed">
                            {msg.text}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={i} className="flex justify-center">
                          <div className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 text-[10px] rounded-xl px-3 py-1.5">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input area */}
                <div className="shrink-0 space-y-2 border-t border-[#222] pt-3">
                  <textarea
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
                    placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
                    rows={3}
                    disabled={status === 'processing'}
                    className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-blue-500/50 text-sm text-gray-200 placeholder-gray-700 rounded-xl px-4 py-3 resize-none outline-none transition-colors disabled:opacity-50"
                  />
                  <div className="flex gap-2">
                    <button onClick={toggleMic}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-base transition-all ${
                        isListening
                          ? 'bg-red-500/20 border-red-500/50 animate-pulse'
                          : 'bg-[#1e1e1e] border-[#333] hover:border-gray-500 text-gray-400 hover:text-white'
                      }`}>
                      🎙️
                    </button>
                    <button onClick={sendAnswer}
                      disabled={!chatInput.trim() || status === 'processing'}
                      className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all">
                      {status === 'processing' ? 'Sending…' : 'Send Answer ↵'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT PANE ════ */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">

          {/* Editor toolbar */}
          <div className="shrink-0 h-10 bg-[#161616] border-b border-[#222] flex items-center px-4 gap-3">
            <select value={lang}
              onChange={(e) => { setLang(e.target.value); setCode(LANG[e.target.value].start); }}
              className="bg-[#252525] border border-[#333] text-gray-300 text-xs rounded-lg px-3 py-1 focus:outline-none focus:border-blue-500/50 cursor-pointer">
              {Object.entries(LANG).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
            <span className="text-[#444]">|</span>
            <span className="text-[11px] text-gray-600 font-mono select-none">
              {companyLabel} • {currentQ?.difficulty ?? 'medium'} • Q{currentQ?.number ?? 1}/{currentQ?.total ?? 5}
            </span>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={lang}
              theme="vs-dark"
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

          {/* ── Console Panel ── */}
          <div className="shrink-0 h-[220px] flex flex-col border-t border-[#222] bg-[#141414]">

            {/* Console tab bar */}
            <div className="shrink-0 flex bg-[#111] border-b border-[#222]">
              {[{ id: 'testcases', label: 'Testcase' }, { id: 'result', label: 'Test Result' }].map((t) => (
                <button key={t.id} onClick={() => setBotTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-2 text-xs font-medium border-b-2 transition-all ${
                    botTab === t.id ? 'border-green-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
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
            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 #141414' }}>
              {botTab === 'testcases' && (
                <div className="space-y-2 h-full">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Custom stdin input:</label>
                  <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3}
                    placeholder="Enter input data to pass as stdin to your code..."
                    className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-xs font-mono text-gray-300 placeholder-gray-700 p-3 rounded-lg resize-none focus:outline-none focus:border-blue-500/30" />
                </div>
              )}

              {botTab === 'result' && (
                <div className="h-full">
                  {!runResult && !isRunning && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs gap-2">
                      <span className="text-2xl">▶</span>
                      <span>Run your code to see output here</span>
                    </div>
                  )}
                  {isRunning && (
                    <div className="h-full flex items-center justify-center gap-3 text-green-400 text-sm">
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
                      {/* Status */}
                      <div className={`text-base font-bold ${runResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {runResult.status}
                      </div>

                      {/* Output */}
                      {runResult.output && (
                        <div>
                          <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Output</div>
                          <pre className="bg-[#0d0d0d] border border-[#222] rounded-lg p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto">
                            {runResult.output}
                          </pre>
                        </div>
                      )}

                      {/* Complexity */}
                      {(runResult.time || runResult.space) && (
                        <div className="flex gap-6 text-xs text-gray-500">
                          {runResult.time && <span>Runtime: <span className="text-yellow-400 font-mono">{runResult.time}</span></span>}
                          {runResult.space && <span>Memory: <span className="text-yellow-400 font-mono">{runResult.space}</span></span>}
                        </div>
                      )}

                      {/* AI Feedback */}
                      {runResult.feedback && (
                        <p className="text-xs text-blue-300 bg-blue-900/10 border border-blue-900/30 rounded-lg px-3 py-2">
                          💡 {runResult.feedback}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#0d0d0d] border-t border-[#222]">
              <span className="text-[10px] text-gray-700 font-mono select-none">console</span>
              <div className="flex gap-2">
                <button onClick={() => runCode(false)} disabled={isRunning}
                  className="px-5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#2e2e2e] disabled:opacity-40 border border-[#333] text-gray-200 text-xs font-semibold transition-all">
                  {isRunning ? 'Running…' : 'Run Code'}
                </button>
                <button onClick={() => runCode(true)} disabled={isRunning}
                  className="px-5 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg shadow-green-900/20">
                  {isRunning ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning toast */}
      {warning && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-950 border border-red-700/60 text-red-200 px-5 py-2.5 rounded-xl shadow-2xl text-sm font-medium">
          {warning}
        </div>
      )}
    </div>
  );
}
