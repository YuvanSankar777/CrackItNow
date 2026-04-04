/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { interviewAPI } from '../api/client';
import VoiceOrb from '../components/VoiceOrb';
import InterviewSidebar from '../components/InterviewSidebar';
import CameraPreview from '../components/CameraPreview';
import CodeAnalysis from '../components/CodeAnalysis';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const LANGUAGE_TEMPLATES = {
  javascript: {
    name: 'JavaScript',
    icon: '⚡',
    starter: 'function solution() {\n  // Write your code here\n  return;\n}',
    languageId: 63,
  },
  python: {
    name: 'Python',
    icon: '🐍',
    starter: 'def solution():\n    # Write your code here\n    pass',
    languageId: 71,
  },
  java: {
    name: 'Java',
    icon: '☕',
    starter: 'public class Solution {\n    public void solve() {\n        // Write your code here\n    }\n}',
    languageId: 62,
  },
  cpp: {
    name: 'C++',
    icon: '⚙️',
    starter: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',
    languageId: 54,
  },
};

const SAMPLE_PROBLEM = {
  title: 'Two Sum',
  prompt: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  testCases: [
    { input: '[2, 7, 11, 15], 9', expected: '[0, 1]' },
    { input: '[3, 2, 4], 6', expected: '[1, 2]' },
    { input: '[3, 3], 6', expected: '[0, 1]' },
  ],
};

const InterviewPageNew = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const session = state?.session;

  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Code editor states
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript.starter);
  const [codeAnalysis, setCodeAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Interview states
  const [status, setStatus] = useState('idle');
  const [history, setHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [warning, setWarning] = useState('');

  // AI interaction
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  const { speak, stop } = useSpeechSynthesis();
  const debounceRef = useRef(null);

  // Initialize session
  useEffect(() => {
    if (!session) {
      navigate('/setup');
      return;
    }

    setCurrentQuestion({
      id: session.question_id,
      text: session.question || SAMPLE_PROBLEM.prompt,
      isCoding: true,
      number: session.question_number || 1,
      total: session.total_questions || 1,
    });

    setHistory([
      { speaker: 'AI', text: session.question || SAMPLE_PROBLEM.prompt },
    ]);

    setStatus('speaking');
    speak(session.question || SAMPLE_PROBLEM.prompt, () => {
      setStatus('listening');
      startListening();
    });

    // Fetch full session questions
    (async () => {
      try {
        if (session?.session_id) {
          const res = await interviewAPI.results(session.session_id);
          setQuestionsList(res.data.questions || []);
        }
      } catch (err) {
        console.error('Failed to fetch questions:', err);
      }
    })();

    return () => {
      stop();
      stopListening();
    };
  }, []);

  // Tab switching warning
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const warningMessage = '⚠️ Tab switching is not allowed during the interview.';
        setWarning(warningMessage);
        setHistory((prev) => {
          const alreadyAdded = prev.some((entry) => entry.text === warningMessage);
          return alreadyAdded ? prev : [...prev, { speaker: 'System', text: warningMessage }];
        });
      }
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
      setWarning('Right-click is disabled during the interview.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Debounced code update for AI feedback
  const handleEditorChange = (value) => {
    setCode(value);
    // Clear analysis when code changes
    setCodeAnalysis(null);
  };

  // Compile code
  const handleCompile = async () => {
    setIsAnalyzing(true);
    try {
      // Call backend to run against sample test cases
      const response = await interviewAPI.evaluateCode({
        session_id: session.session_id,
        question_id: currentQuestion?.id,
        code,
        language: selectedLanguage,
      });

      const analysis = {
        passed: response.passed || false,
        testResults: response.test_results || [],
        timeComplexity: response.time_complexity || 'O(n)',
        spaceComplexity: response.space_complexity || 'O(1)',
        suggestions: response.suggestions || [],
        feedback: response.feedback || 'Run your solution against test cases.',
      };

      setCodeAnalysis(analysis);
      setHistory((prev) => [
        ...prev,
        { speaker: 'System', text: `Compiled with ${analysis.passed ? '✓ all tests passing' : '✗ some tests failing'}` },
      ]);
    } catch (error) {
      console.error('Compilation failed:', error);
      setWarning('Compilation failed. Check your syntax.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit code
  const handleSubmit = async () => {
    setIsAnalyzing(true);
    try {
      const response = await interviewAPI.evaluateCode({
        session_id: session.session_id,
        question_id: currentQuestion?.id,
        code,
        language: selectedLanguage,
        isSubmission: true,
      });

      setCodeAnalysis({
        passed: response.passed || false,
        testResults: response.test_results || [],
        timeComplexity: response.time_complexity || 'O(n)',
        spaceComplexity: response.space_complexity || 'O(1)',
        suggestions: response.suggestions || [],
        feedback: response.feedback || 'Great effort!',
      });

      setHistory((prev) => [
        ...prev,
        {
          speaker: 'System',
          text: `Submission ${response.passed ? '✓ Accepted!' : '✗ Rejected - see analysis'}`,
        },
      ]);
    } catch (error) {
      console.error('Submission failed:', error);
      setWarning('Submission failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`flex h-screen bg-theme-bg ${isFullscreen ? 'overflow-hidden' : ''}`}>
      {/* Sidebar */}
      <InterviewSidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        chatHistory={history}
        questions={questionsList}
        currentQuestionId={currentQuestion?.id}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex justify-between items-center p-3 bg-theme-surface border-b border-theme-border">
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => {
                const lang = e.target.value;
                setSelectedLanguage(lang);
                setCode(LANGUAGE_TEMPLATES[lang].starter);
              }}
              className="px-3 py-1.5 bg-theme-bg border border-theme-border rounded text-theme-text text-sm font-medium focus:outline-none focus:border-theme-accent"
            >
              {Object.entries(LANGUAGE_TEMPLATES).map(([key, lang]) => (
                <option key={key} value={key}>
                  {lang.icon} {lang.name}
                </option>
              ))}
            </select>

            {/* Problem Title */}
            <span className="text-sm font-semibold text-theme-text">{SAMPLE_PROBLEM.title}</span>
          </div>
        </div>

        {/* Editor & Analysis Layout */}
        <div className="flex-1 flex gap-3 p-3 overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col bg-theme-surface rounded-lg overflow-hidden border border-theme-border">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              language={selectedLanguage}
              theme="vs-dark"
              value={code}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineHeight: 20,
                padding: { top: 16 },
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                formatOnPaste: true,
              }}
            />

            {/* Action Buttons at Bottom */}
            <div className="flex gap-2 p-3 bg-theme-surface border-t border-theme-border">
              <button
                onClick={handleCompile}
                disabled={isAnalyzing}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors"
              >
                {isAnalyzing ? 'Compiling...' : '▶ Compile & Test'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isAnalyzing}
                className="flex-1 px-4 py-2 bg-theme-accent hover:bg-blue-600 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors"
              >
                {isAnalyzing ? 'Submitting...' : '✓ Submit'}
              </button>
            </div>
          </div>

          {/* Analysis & Camera Panel */}
          <div className="w-80 flex flex-col gap-3">
            {/* Analysis Panel */}
            <div className="flex-1 bg-theme-surface rounded-lg overflow-y-auto border border-theme-border">
              <CodeAnalysis analysis={codeAnalysis} isLoading={isAnalyzing} />
            </div>

            {/* Camera Preview */}
            <div className="h-48 rounded-lg overflow-hidden border border-theme-accent">
              <CameraPreview
                isFullscreen={isFullscreen}
                onFullscreen={() => setIsFullscreen(!isFullscreen)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warning Toast */}
      {warning && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          {warning}
        </div>
      )}
    </div>
  );
};

export default InterviewPageNew;
