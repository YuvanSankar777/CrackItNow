/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { interviewAPI } from '../api/client';
import VoiceOrb from '../components/VoiceOrb';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const SAMPLE_LIBRARY = {
  frontend: {
    title: 'Two Sum',
    prompt:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    starterCode: `function twoSum(nums, target) {
  // Write your solution here
  return [];
}`,
    testCases: [
      'Input: nums = [2, 7, 11, 15], target = 9 → Output: [0, 1]',
      'Input: nums = [3, 2, 4], target = 6 → Output: [1, 2]',
      'Input: nums = [3, 3], target = 6 → Output: [0, 1]',
    ],
  },
  backend: {
    title: 'Valid Parentheses',
    prompt:
      'Given a string containing only the characters ()[]{} determine if the input string is valid.',
    starterCode: `function isValid(s) {
  // Return true when brackets are balanced
  return false;
}`,
    testCases: [
      'Input: s = "()" → Output: true',
      'Input: s = "()[]{}" → Output: true',
      'Input: s = "(]" → Output: false',
    ],
  },
  fullstack: {
    title: 'Merge Intervals',
    prompt:
      'Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals.',
    starterCode: `function merge(intervals) {
  // Return the merged intervals
  return intervals;
}`,
    testCases: [
      'Input: [[1,3],[2,6],[8,10],[15,18]] → Output: [[1,6],[8,10],[15,18]]',
      'Input: [[1,4],[4,5]] → Output: [[1,5]]',
      'Input: [[1,4],[0,2],[3,5]] → Output: [[0,5]]',
    ],
  },
  general: {
    title: 'Palindrome Check',
    prompt:
      'Return true if the given string is a palindrome after ignoring non-alphanumeric characters and casing.',
    starterCode: `function isPalindrome(value) {
  // Normalize and compare
  return false;
}`,
    testCases: [
      'Input: "A man, a plan, a canal: Panama" → Output: true',
      'Input: "race a car" → Output: false',
      'Input: " " → Output: true',
    ],
  },
};

const getSampleContent = (session) => {
  const roleKey = session?.role || 'fullstack';
  return SAMPLE_LIBRARY[roleKey] || SAMPLE_LIBRARY.fullstack;
};

const InterviewPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const session = state?.session;

  const [status, setStatus] = useState('idle');
  const [history, setHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [liveCodeFeedback, setLiveCodeFeedback] = useState(null);
  const [warning, setWarning] = useState('');
  const debounceRef = useRef(null);
  const wsRef = useRef(null);

  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { speak, stop } = useSpeechSynthesis();

  const sampleContent = useMemo(() => getSampleContent(session), [session]);

  useEffect(() => {
    if (!session) {
      navigate('/setup');
      return;
    }

    const firstQuestion = {
      id: session.question_id,
      text: session.question || sampleContent.prompt,
      isCoding: true,
      number: session.question_number || 1,
      total: session.total_questions || 1,
    };

    setCurrentQuestion(firstQuestion);
    setCode(sampleContent.starterCode);
    setHistory([
      { speaker: 'AI', text: session.question || sampleContent.prompt },
      {
        speaker: 'AI',
        text: `Sample problem loaded: ${sampleContent.title}. Review the sample test cases in the IDE sidebar before submitting.`,
      },
    ]);

    setStatus('speaking');
    speak(session.question || sampleContent.prompt, () => {
      setStatus('listening');
      startListening();
    });

    // Fetch full session details (questions list)
    (async () => {
      try {
        if (session?.session_id) {
          const res = await interviewAPI.results(session.session_id);
          setQuestionsList(res.data.questions || []);
        }
      } catch (err) {
        // ignore non-fatal
      }
    })();

    return () => {
      stop();
      stopListening();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!session?.session_id) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/interview/${session.session_id}/`);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'code_feedback') {
          setLiveCodeFeedback(payload.data);
        }
      } catch {
        // Ignore malformed ws payloads
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [session?.session_id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const warningMessage = 'Warning: tab switching is not allowed during an active session.';
        setWarning(warningMessage);
        setHistory((prev) => {
          const alreadyAdded = prev.some((entry) => entry.text === warningMessage);
          return alreadyAdded ? prev : [...prev, { speaker: 'System', text: warningMessage }];
        });
      }
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
      setWarning('Right click is disabled while the interview is in progress.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const handleEditorChange = (value) => {
    setCode(value);
    
    // Debounce the code feedback for the live evaluation websocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        wsRef.current.send(JSON.stringify({
          type: 'code_update',
          data: { code: value, question_id: currentQuestion?.id }
        }));
      }, 1000);
    }
  };

  const handleRunCode = async () => {
    setStatus('evaluating');
    try {
      const response = await interviewAPI.evaluateCode({
        session_id: session.session_id,
        question_id: currentQuestion?.id,
        code,
        language: 'javascript'
      });
      setEvaluation(response);
      setHistory(prev => [...prev, { speaker: 'System', text: `Code evaluation completed. Score: ${response.score}/10` }]);
    } catch (error) {
      console.error('Failed to evaluate code:', error);
      setWarning('Failed to evaluate code. Please try again.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="flex h-screen bg-theme-bg text-theme-text">
      {/* Left Panel - Interview Chat & Details */}
      <div className="w-1/3 flex flex-col border-r border-theme-border p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-theme-accent">AI Interviewer</h2>
        
        {warning && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded mb-4">
            {warning}
          </div>
        )}

        <div className="flex justify-center my-6">
          <VoiceOrb isSpeaking={status === 'speaking'} isListening={isListening} />
        </div>

        <div className="flex-1 overflow-y-auto bg-theme-surface rounded-lg p-4 mb-4">
          {history.map((msg, idx) => (
            <div key={idx} className={`mb-3 ${msg.speaker === 'User' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block p-2 rounded-lg ${msg.speaker === 'User' ? 'bg-theme-accent text-white' : 'bg-theme-border/30 text-theme-text'}`}>
                <strong>{msg.speaker}: </strong>{msg.text}
              </span>
            </div>
          ))}
          {isListening && transcript && (
             <div className="mb-3 text-right">
               <span className="inline-block p-2 rounded-lg bg-theme-accent/30 italic text-theme-text">
                 {transcript}
               </span>
             </div>
          )}
        </div>

        {currentQuestion && (
          <div className="bg-theme-surface rounded-lg p-4 mb-4">
            <h3 className="font-bold text-lg text-theme-accent mb-2">
              Question {currentQuestion.number} of {currentQuestion.total}: {sampleContent.title}
            </h3>
            <p className="text-theme-text-muted mb-4">{currentQuestion.text}</p>
            
            <div className="mt-4">
              <h4 className="font-semibold text-theme-text-muted mb-2">Sample Test Cases:</h4>
              <ul className="list-disc pl-5 text-sm text-theme-text-muted space-y-1">
                {sampleContent.testCases.map((tc, idx) => (
                  <li key={idx} className="bg-theme-bg p-2 rounded font-mono">{tc}</li>
                ))}
              </ul>
            </div>

            {questionsList.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-theme-text-muted mb-2">All Questions</h4>
                <ol className="list-decimal pl-5 text-sm text-theme-text-muted space-y-1">
                  {questionsList.map((q) => (
                    <li key={q.id} className={`p-2 rounded ${q.id === currentQuestion?.id ? 'bg-theme-accent/20 text-theme-text' : 'bg-theme-bg'}`}>
                      <div className="font-medium">{q.question_text}</div>
                      <div className="text-xs text-theme-text-muted">{q.is_coding ? 'Coding' : 'Behavioral'}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel - IDE */}
      <div className="w-2/3 flex flex-col bg-theme-surface">
        <div className="flex justify-between items-center p-4 bg-theme-bg border-b border-theme-border">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-theme-text">JavaScript</span>
            {liveCodeFeedback && (
               <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-600 rounded">
                 AI Feedback: {liveCodeFeedback}
               </span>
            )}
          </div>
          <button 
            onClick={handleRunCode}
            disabled={status === 'evaluating'}
            className="px-4 py-2 bg-theme-accent hover:bg-blue-600 disabled:opacity-50 text-white rounded font-medium transition-colors"
          >
            {status === 'evaluating' ? 'Evaluating...' : 'Submit Code'}
          </button>
        </div>
        
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 24,
              padding: { top: 16 },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {evaluation && (
          <div className="h-48 bg-theme-bg border-t border-theme-border p-4 overflow-y-auto">
            <h3 className="font-bold text-theme-text mb-2">Evaluation Results</h3>
            <p className="text-theme-text-muted mb-2">Score: <span className="text-theme-accent font-bold">{evaluation.score}/10</span></p>
            <p className="text-theme-text-muted whitespace-pre-wrap">{evaluation.feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPage;
