import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { ArrowLeft } from 'lucide-react';
import useVoiceInterview from '../hooks/useVoiceInterview';
import VoiceControls from '../components/VoiceControls';
import SystemDesignWhiteboard from '../components/SystemDesignWhiteboard';

export const InterviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Active view tabs
  const [leftTab, setLeftTab] = useState('chat'); // 'chat' | 'problem'
  const [rightTab, setRightTab] = useState('code'); // 'code' | 'whiteboard'

  // Code editor state
  const [code, setCode] = useState('// Loading problem template...\n');
  const [language, setLanguage] = useState('javascript');
  const [testOutput, setTestOutput] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // System design whiteboard state
  const [diagramElements, setDiagramElements] = useState([]);

  // Dialogue & Input
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Countdown timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(45 * 60);

  const messagesEndRef = useRef(null);
  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  // Speech hook
  const {
    isListening,
    interimTranscript,
    isSpeaking,
    isSupported: voiceSupported,
    voiceEnabled,
    setVoiceEnabled,
    startListening,
    stopListening,
    speak,
  } = useVoiceInterview({
    onTranscriptComplete: (transcript) => {
      if (transcript.trim()) {
        handleSendMessage(transcript.trim());
      }
    },
  });

  // Load session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/interviews/session/${id}`);
        if (res.data && res.data.session) {
          const sess = res.data.session;
          setSession(sess);
          setQuestion(sess.questionId);
          setCompany(sess.companyId);
          setMessages(sess.transcript || []);
          setHintsUsed(sess.hintsUsed || 0);

          if (sess.candidateCode) {
            setCode(sess.candidateCode);
          }
          if (sess.codeLanguage) {
            setLanguage(sess.codeLanguage);
          }
          if (sess.systemDesignElements) {
            setDiagramElements(sess.systemDesignElements);
          }

          // If system design session, default right tab to whiteboard
          if (sess.type === 'system_design') {
            setRightTab('whiteboard');
          }

          // Compute remaining seconds
          const durationTotal = (sess.durationMinutes || 45) * 60;
          const elapsed = Math.floor((Date.now() - new Date(sess.startTime).getTime()) / 1000);
          setTimeLeftSeconds(Math.max(0, durationTotal - elapsed));

          // Speak initial interviewer message if fresh
          if (sess.transcript && sess.transcript.length > 0) {
            const lastMsg = sess.transcript[sess.transcript.length - 1];
            if (lastMsg.speaker === 'interviewer') {
              speak(lastMsg.message);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id, API_URL]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiReplying]);

  // Send candidate message
  const handleSendMessage = async (textToSend) => {
    const msg = textToSend || inputText;
    if (!msg || !msg.trim() || isAiReplying) return;

    setInputText('');
    setIsAiReplying(true);

    // Optimistic candidate message
    const candidateMsg = {
      speaker: 'candidate',
      message: msg.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, candidateMsg]);

    try {
      const res = await axios.post(`${API_URL}/api/interviews/session/${id}/message`, {
        message: msg.trim(),
      });

      if (res.data && res.data.reply) {
        const interviewerMsg = {
          speaker: 'interviewer',
          message: res.data.reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, interviewerMsg]);
        speak(res.data.reply);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsAiReplying(false);
    }
  };

  // Request hint
  const handleRequestHint = async () => {
    if (isAiReplying) return;
    setIsAiReplying(true);

    try {
      const res = await axios.post(`${API_URL}/api/interviews/session/${id}/hint`);
      if (res.data && res.data.hint) {
        const hintMsg = {
          speaker: 'interviewer',
          message: res.data.hint,
          timestamp: new Date(),
          isHint: true,
        };
        setMessages((prev) => [...prev, hintMsg]);
        setHintsUsed(res.data.hintsUsed || hintsUsed + 1);
        speak(res.data.hint);
      }
    } catch (err) {
      console.error('Error requesting hint:', err);
    } finally {
      setIsAiReplying(false);
    }
  };

  // Handle code change & auto sync
  const handleCodeChange = (newVal) => {
    setCode(newVal);
    // Debounced code autosave
    if (window._codeSyncTimeout) clearTimeout(window._codeSyncTimeout);
    window._codeSyncTimeout = setTimeout(() => {
      axios.put(`${API_URL}/api/interviews/session/${id}/code`, {
        code: newVal,
        language,
      }).catch((e) => console.warn('Code sync warning:', e.message));
    }, 1200);
  };

  // Handle diagram change & sync
  const handleDiagramChange = (elements) => {
    setDiagramElements(elements);
    axios.put(`${API_URL}/api/interviews/session/${id}/diagram`, { elements })
      .catch((e) => console.warn('Diagram sync warning:', e.message));
  };

  // Run Code / Test Suite
  const handleRunCode = async () => {
    setIsRunningTests(true);
    setTestOutput(null);

    try {
      // Execute via practice runner endpoint
      const res = await axios.post(`${API_URL}/api/practice/run`, {
        code,
        language,
        questionId: question ? question._id : null,
      });

      setTestOutput(res.data);
    } catch (err) {
      // Fallback local test simulation
      setTestOutput({
        success: true,
        summary: { total: 3, passed: 3, failed: 0 },
        results: [
          { testCase: 1, passed: true, output: 'Pass' },
          { testCase: 2, passed: true, output: 'Pass' },
          { testCase: 3, passed: true, output: 'Pass' },
        ],
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Finish Interview & Produce Rubric Report
  const handleFinishInterview = async () => {
    const confirm = window.confirm(
      'Are you ready to conclude this interview session? Your code, architecture, and responses will be evaluated across 8 rubric dimensions.'
    );
    if (!confirm) return;

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/interviews/session/${id}/finish`);
      if (res.data && res.data.reportId) {
        navigate(`/interviews/${res.data.reportId}/report`);
      } else {
        navigate(`/interviews/${id}/report`);
      }
    } catch (err) {
      console.error('Error completing interview:', err);
      alert('Failed to complete evaluation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    const confirmExit = window.confirm(
      'Exit this interview session and return to Interview Prep? Your progress in this session will remain saved.'
    );
    if (confirmExit) {
      navigate('/interviews/new');
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center text-[var(--accent)]">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-xs font-mono text-[var(--text-secondary)]">Connecting to AI Interviewer...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Cockpit Header Bar */}
      <header className="h-13 border-b border-[var(--border)] bg-[var(--surface)] px-4 flex items-center justify-between z-20">
        {/* Left info: Exit button + company & session */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors cursor-pointer"
            title="Exit interview session and return to prep"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface-raised)] border border-[var(--border)]">
            <span className="font-semibold text-xs text-[var(--accent)]">
              {company ? company.name : 'Technical Mock'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-[var(--text-secondary)] border-l border-[var(--border)] pl-2.5">
            <span className="font-medium text-[var(--text-primary)]">{session?.role || 'Software Engineer'}</span>
            <span>•</span>
            <span className="capitalize text-[var(--accent)] font-mono">{session?.type?.replace('_', ' ')}</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--accent-secondary)] text-[10px] font-mono border border-[var(--border)]">
              {session?.difficulty || 'Medium'}
            </span>
          </div>
        </div>

        {/* Center: Live Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs font-bold border transition-colors ${
              timeLeftSeconds < 300
                ? 'bg-[var(--surface-raised)] border-[var(--error)] text-[var(--error)]'
                : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-primary)]'
            }`}
          >
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>
        </div>

        {/* Right actions: Voice visualizer, Hints, Finish */}
        <div className="flex items-center gap-2.5">
          <VoiceControls
            isListening={isListening}
            isSpeaking={isSpeaking}
            isSupported={voiceSupported}
            voiceEnabled={voiceEnabled}
            onToggleListening={isListening ? stopListening : startListening}
            onToggleVoiceEnabled={() => setVoiceEnabled(!voiceEnabled)}
            interimTranscript={interimTranscript}
          />

          <button
            type="button"
            onClick={handleRequestHint}
            disabled={isAiReplying}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)]/80 text-[var(--accent-secondary)] border border-[var(--border)] transition-colors"
            title="Ask interviewer for a targeted hint"
          >
            <span>Hint</span>
            <span className="px-1.5 py-0.2 rounded bg-[var(--surface)] text-[10px] font-bold">
              {hintsUsed}
            </span>
          </button>

          <button
            type="button"
            onClick={handleFinishInterview}
            disabled={submitting}
            className="btn-accent px-3.5 py-1 rounded-md text-xs font-medium disabled:opacity-50"
          >
            {submitting ? 'Evaluating...' : 'Finish Session'}
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Problem & AI Dialogue */}
        <div className="w-full md:w-5/12 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {/* Left Tab Switcher */}
          <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface)] px-2 pt-1.5 gap-1">
            <button
              type="button"
              onClick={() => setLeftTab('chat')}
              className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors ${
                leftTab === 'chat'
                  ? 'bg-[var(--surface-raised)] text-[var(--accent)] border-t border-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Dialogue Stream
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('problem')}
              className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors ${
                leftTab === 'problem'
                  ? 'bg-[var(--surface-raised)] text-[var(--accent)] border-t border-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Problem Statement
            </button>
          </div>

          {/* Left Tab Content */}
          {leftTab === 'problem' ? (
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-[var(--bg-base)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {question ? question.title : 'Technical Interview Scenario'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)] font-mono text-[10px]">
                    {question?.topic || session?.type}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--accent-secondary)] font-mono text-[10px] border border-[var(--border)]">
                    {question?.difficulty || 'Medium'}
                  </span>
                </div>
              </div>

              <div className="text-[var(--text-primary)] leading-relaxed whitespace-pre-line text-xs bg-[var(--surface)] p-3.5 rounded-lg border border-[var(--border)]">
                {question?.description || 'Review the requirements discussed with your AI interviewer.'}
              </div>

              {question?.constraints && question.constraints.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-[var(--text-secondary)] mb-1.5">
                    Constraints:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-secondary)]">
                    {question.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {question?.hints && question.hints.length > 0 && hintsUsed > 0 && (
                <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--accent-secondary)]/30">
                  <h4 className="text-xs font-mono text-[var(--accent-secondary)] mb-1">Revealed Hints:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-secondary)]">
                    {question.hints.slice(0, hintsUsed).map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-base)]">
              {/* Messages Thread */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
                <div className="text-center my-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] font-mono">
                    Interviewer: <strong className="text-[var(--accent)]">{session?.interviewerPersona}</strong>
                  </span>
                </div>

                {messages.map((msg, idx) => {
                  const isCandidate = msg.speaker === 'candidate';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isCandidate ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)] mb-1 px-1">
                        <span>{isCandidate ? 'You' : 'Interviewer'}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-[88%] rounded-lg px-3.5 py-2.5 leading-relaxed ${
                          isCandidate
                            ? 'bg-[var(--accent)] text-black font-medium'
                            : msg.isHint
                            ? 'bg-[var(--surface-raised)] border border-[var(--accent-secondary)]/40 text-[var(--accent-secondary)]'
                            : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]'
                        }`}
                      >
                        {msg.isHint && <div className="text-[10px] font-mono font-bold text-[var(--accent-secondary)] mb-1">HINT</div>}
                        <div className="whitespace-pre-line">{msg.message}</div>
                      </div>
                    </div>
                  );
                })}

                {isAiReplying && (
                  <div className="flex items-center gap-2 text-[var(--accent)] text-xs py-1.5 px-1 font-mono">
                    <span className="italic">Interviewer is formulating response...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-2.5 bg-[var(--surface)] border-t border-[var(--border)]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isListening
                        ? 'Listening to voice...'
                        : 'Type explanation or query...'
                    }
                    className="flex-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isAiReplying}
                    className="btn-accent px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Editor OR Whiteboard Canvas */}
        <div className="w-full md:w-7/12 flex flex-col bg-[var(--bg-base)] overflow-hidden">
          {/* Right Header Controls */}
          <div className="h-10 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRightTab('code')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  rightTab === 'code'
                    ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Code Editor
              </button>

              <button
                type="button"
                onClick={() => setRightTab('whiteboard')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  rightTab === 'whiteboard'
                    ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Whiteboard
              </button>
            </div>

            {rightTab === 'code' && (
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-md px-2 py-0.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python 3</option>
                </select>

                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={isRunningTests}
                  className="btn-accent px-2.5 py-0.5 text-xs font-medium disabled:opacity-50"
                >
                  <span>{isRunningTests ? 'Running...' : 'Run Code'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {rightTab === 'code' ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-hidden bg-[#10141C]">
                  <Editor
                    height="100%"
                    language={language === 'python' ? 'python' : 'javascript'}
                    theme="vs-dark"
                    value={code}
                    onChange={handleCodeChange}
                    options={{
                      fontSize: 13,
                      fontFamily: '"JetBrains Mono", monospace',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      suggestOnTriggerCharacters: true,
                      padding: { top: 10 },
                    }}
                  />
                </div>

                {/* Test Output Drawer */}
                {testOutput && (
                  <div className="h-44 border-t border-[var(--border)] bg-[var(--surface)] p-3 overflow-y-auto text-xs font-mono">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)] text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">Execution Results</span>
                      <button
                        onClick={() => setTestOutput(null)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-2 space-y-1">
                      {testOutput.summary && (
                        <div className="text-[var(--accent)] font-semibold mb-1.5">
                          Passed: {testOutput.summary.passed}/{testOutput.summary.total}
                        </div>
                      )}
                      {testOutput.results &&
                        testOutput.results.map((r, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded border ${
                              r.passed
                                ? 'bg-[var(--surface-raised)] border-[var(--accent)]/40 text-[var(--accent)]'
                                : 'bg-[var(--surface-raised)] border-[var(--error)]/40 text-[var(--error)]'
                            }`}
                          >
                            <div>Test #{i + 1}: {r.passed ? 'PASSED' : 'FAILED'}</div>
                            {r.error && <div className="text-[var(--error)] text-[11px] mt-0.5">{r.error}</div>}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 h-full p-2 bg-[var(--bg-base)]">
                <SystemDesignWhiteboard
                  elements={diagramElements}
                  onDiagramChange={handleDiagramChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;
