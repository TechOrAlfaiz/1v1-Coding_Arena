import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  FileText,
  Briefcase,
  Clock,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Award,
  ChevronRight,
  ListChecks,
  Zap,
  ShieldAlert,
  Sliders,
  ThumbsUp,
  X,
} from 'lucide-react';
import useVoiceInterview from '../hooks/useVoiceInterview';
import LiveAvatarCanvas from '../components/LiveAvatarCanvas';

export const LiveAvatarInterviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const isHr = session?.interviewType === 'hr';
  const themeColor = isHr ? '#a855f7' : '#4FA393';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [rightDrawerTab, setRightDrawerTab] = useState('dialogue'); // 'dialogue' | 'agenda' | 'rubric' | 'jd' | 'resume'
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(30 * 60);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Phase 4: Interruption Engine state
  const [interruption, setInterruption] = useState(null); // { active: boolean, prompt: string, reason: string }
  const lastInterruptionTimeRef = useRef(0);

  // Phase 5: Live Rubric Progress Tracking state
  const [rubricScores, setRubricScores] = useState({
    technicalDepth: 3.8,
    problemBreakdown: 3.7,
    communicationClarity: 4.0,
    practicality: 3.6,
    handlingPushback: 3.9,
    overallScore: 76,
    notes: [
      'Good initial problem framing and architectural vocabulary.',
      'Proactively analyze trade-offs between latency, consistency, and network overhead.',
    ],
  });

  const messagesEndRef = useRef(null);
  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  // Web Speech Hook for STT & TTS
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
    stopSpeaking,
  } = useVoiceInterview({
    onTranscriptComplete: (transcript) => {
      if (transcript && transcript.trim()) {
        handleSendMessage(transcript.trim());
      }
    },
  });

  // Track whether we've already spoken the opening prompt
  const hasSpokenOpeningRef = useRef(false);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/interviews/session/${id}`);
        if (res.data && res.data.session) {
          const sess = res.data.session;
          setSession(sess);

          const transcriptList = sess.transcript || sess.messages || [];
          setMessages(transcriptList);
          setQuestions(sess.questions || []);
          setCurrentQuestionIndex(sess.currentQuestionIndex || 0);
          if (sess.isClosing) {
            setIsClosing(true);
          }

          // Calculate remaining time
          const duration = (sess.durationMinutes || 30) * 60;
          const elapsed = Math.floor((Date.now() - new Date(sess.startTime || sess.createdAt).getTime()) / 1000);
          setTimeLeftSeconds(Math.max(0, duration - elapsed));

          // Auto-speak opening interviewer statement once loaded
          if (!hasSpokenOpeningRef.current && transcriptList.length > 0) {
            const lastMsg = transcriptList[transcriptList.length - 1];
            if (lastMsg.speaker === 'interviewer' || lastMsg.role === 'interviewer') {
              hasSpokenOpeningRef.current = true;
              // Short delay to ensure audio context is ready
              setTimeout(() => {
                speak(lastMsg.message || lastMsg.content);
              }, 600);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load live avatar session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, API_URL, speak]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll dialogue drawer
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiReplying, interimTranscript]);

  // When AI stops speaking, naturally turn on candidate mic if voice enabled
  useEffect(() => {
    if (!isSpeaking && voiceEnabled && voiceSupported && !isAiReplying && hasSpokenOpeningRef.current) {
      // Auto-start listening with small buffer
      const timer = setTimeout(() => {
        startListening();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, voiceEnabled, voiceSupported, isAiReplying, startListening]);

  // Phase 5: Update dynamic provisional rubric scores
  const updateProvisionalRubric = (msgCount, wasChallenged = false) => {
    setRubricScores((prev) => {
      const stepBonus = Math.min(0.9, msgCount * 0.12);
      const pushbackBonus = wasChallenged ? 0.35 : 0;
      const tDepth = Math.min(5.0, Math.round((3.8 + stepBonus) * 10) / 10);
      const pBreak = Math.min(5.0, Math.round((3.7 + stepBonus * 0.85) * 10) / 10);
      const cClarity = Math.min(5.0, Math.round((4.0 + stepBonus * 0.7) * 10) / 10);
      const pract = Math.min(5.0, Math.round((3.6 + stepBonus * 0.9) * 10) / 10);
      const hPush = Math.min(5.0, Math.round((3.8 + stepBonus * 0.6 + pushbackBonus) * 10) / 10);
      const avg = (tDepth + pBreak + cClarity + pract + hPush) / 5;
      const overall = Math.round((avg / 5) * 100);

      const notes = [
        tDepth >= 4.2
          ? 'Exceptional depth on subsystem boundaries and architectural decisions.'
          : 'Continue elaborating on time/space complexity and component failure modes.',
        wasChallenged
          ? 'Constructively addressed interviewer cross-examination with sound justification.'
          : 'Proactively discuss trade-offs (e.g. latency vs consistency) to demonstrate senior judgment.',
      ];

      return {
        technicalDepth: tDepth,
        problemBreakdown: pBreak,
        communicationClarity: cClarity,
        practicality: pract,
        handlingPushback: hPush,
        overallScore: overall,
        notes,
      };
    });
  };

  // Phase 4: Interruption Engine monitoring interim speech transcript
  useEffect(() => {
    if (!interimTranscript || interruption?.active || isSpeaking || isAiReplying) return;

    // Minimum 25s between automatic cross-examinations
    const now = Date.now();
    if (now - lastInterruptionTimeRef.current < 25000) return;

    const lower = interimTranscript.toLowerCase();

    const techProbes = [
      {
        match: (t) => t.includes('microservice') && (t.includes('faster') || t.includes('fast') || t.includes('speed')),
        prompt: "Hold on, why did microservices make it faster? Did you account for the network latency and serialization overhead across service boundaries?",
        reason: "Claimed microservices are inherently faster",
      },
      {
        match: (t) => (t.includes('mongo') || t.includes('nosql')) && (t.includes('faster') || t.includes('better') || t.includes('scale')),
        prompt: "Wait a moment—why would MongoDB be inherently faster than a relational DB here? What happens when you require multi-document transactional consistency?",
        reason: "Claimed MongoDB is unconditionally faster",
      },
      {
        match: (t) => (t.includes('redis') || t.includes('cache')) && (t.includes('solve') || t.includes('everything') || t.includes('all')),
        prompt: "Hold on—what is your cache eviction and invalidation strategy to prevent race conditions or serving stale data during heavy write traffic?",
        reason: "Assuming caching without invalidation strategy",
      },
      {
        match: (t) => (t.includes('no need') || t.includes('didn\'t need')) && t.includes('index'),
        prompt: "Wait, without an index, won't that query degrade to an O(N) full table scan as your data volume explodes?",
        reason: "Dismissing indexing on queried dataset",
      },
      {
        match: (t) => t.includes('scale horizontally') || t.includes('add more servers') || t.includes('add servers'),
        prompt: "Hold on—when you scale horizontally, how do you manage shared session state and database write concurrency bottlenecks?",
        reason: "Unchecked horizontal scale assertion",
      },
      {
        match: (t) => t.includes('kafka') && (t.includes('everything') || t.includes('solve')),
        prompt: "Wait, how do you handle message ordering and deduplication across partitions if consumers scale concurrently?",
        reason: "Unchecked event bus assertion",
      },
    ];

    const hrProbes = [
      {
        match: (t) => (t.includes('we did') || t.includes('the team did') || t.includes('we decided')) && !t.includes(' i ') && !t.includes('my role'),
        prompt: "Pardon the interruption—you've described what the team did, but what was YOUR specific personal ownership and decision in that situation?",
        reason: "Over-reliance on team action without personal ownership",
      },
      {
        match: (t) => t.includes('no conflict') || t.includes('never disagree') || t.includes('everyone agreed'),
        prompt: "Hold on—in high-performing teams, constructive disagreement is healthy. Can you share a time when technical approaches were actively debated?",
        reason: "Claiming no disagreement exists",
      },
      {
        match: (t) => t.includes('not my fault') || t.includes('someone else') || t.includes('they failed'),
        prompt: "Wait, let's look at personal ownership—what proactive measures could you have taken earlier to anticipate or de-risk that dependency?",
        reason: "Externalizing blame without accountability",
      },
    ];

    const probes = isHr ? hrProbes : techProbes;
    const matched = probes.find((p) => p.match(lower));

    if (matched) {
      lastInterruptionTimeRef.current = now;
      stopListening();
      setInterruption({
        active: true,
        prompt: matched.prompt,
        reason: matched.reason,
        timestamp: now,
      });

      // Spoken by avatar with inquisitive voice
      speak(matched.prompt);
    }
  }, [interimTranscript, interruption, isSpeaking, isAiReplying, isHr, stopListening, speak]);

  // Phase 4: Candidate chooses to address cross-question
  const handleAddressInterruption = () => {
    if (!interruption) return;
    const probeMsg = {
      role: 'interviewer',
      speaker: 'interviewer',
      content: interruption.prompt,
      message: interruption.prompt,
      isProbe: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, probeMsg]);
    setInterruption(null);
    updateProvisionalRubric(messages.length + 1, true);
    startListening();
  };

  // Phase 4: Candidate chooses to dismiss interruption ("Let me finish first")
  const handleDismissInterruption = () => {
    if (!interruption) return;
    setInterruption(null);
    const dismissReply = "Understood, please finish explaining your thought.";
    speak(dismissReply);
    setTimeout(() => {
      startListening();
    }, 600);
  };

  // Phase 4: Manual Probe / Challenge button
  const handleManualProbe = () => {
    if (interruption?.active || isSpeaking || isAiReplying) return;
    stopListening();
    const probePrompt = isHr
      ? "Hold on—let's examine that decision. If a key executive objected to your approach, how would you justify the business impact?"
      : "Hold on—let's stress-test that architecture. What single point of failure (SPOF) remains in that design, and how would you achieve zero-downtime failover?";
    setInterruption({
      active: true,
      prompt: probePrompt,
      reason: "Candidate invited architectural stress-test",
      timestamp: Date.now(),
    });
    speak(probePrompt);
  };

  // Send candidate answer (either through speech transcript or text submit)
  const handleSendMessage = async (textToSend) => {
    const msg = textToSend || inputText;
    if (!msg || !msg.trim() || isAiReplying) return;

    // Pause mic listening while sending
    stopListening();
    setInputText('');
    setIsAiReplying(true);

    const candidateMsg = {
      role: 'candidate',
      speaker: 'candidate',
      content: msg.trim(),
      message: msg.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, candidateMsg]);

    try {
      const res = await axios.post(`${API_URL}/api/interviews/session/${id}/message`, {
        message: msg.trim(),
      });

      if (res.data) {
        if (res.data.currentQuestionIndex !== undefined) {
          setCurrentQuestionIndex(res.data.currentQuestionIndex);
        }
        if (res.data.questions && Array.isArray(res.data.questions)) {
          setQuestions(res.data.questions);
        }
        if (res.data.isClosing !== undefined) {
          setIsClosing(res.data.isClosing);
        }
        if (res.data.reply || res.data.message) {
          const replyText = res.data.reply || res.data.message;
          const interviewerMsg = {
            role: 'interviewer',
            speaker: 'interviewer',
            content: replyText,
            message: replyText,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, interviewerMsg]);
          // Trigger avatar speech
          speak(replyText);
        }
      }
    } catch (err) {
      console.error('Failed to send interview message:', err);
    } finally {
      setIsAiReplying(false);
    }
  };

  // Advance to next progressive question
  const handleNextQuestion = async () => {
    if (isAdvancing || isAiReplying) return;
    setIsAdvancing(true);
    stopListening();

    try {
      const res = await axios.post(`${API_URL}/api/interviews/session/${id}/next-question`);
      if (res.data) {
        if (res.data.currentQuestionIndex !== undefined) {
          setCurrentQuestionIndex(res.data.currentQuestionIndex);
        }
        if (res.data.questions && Array.isArray(res.data.questions)) {
          setQuestions(res.data.questions);
        }
        if (res.data.isClosing !== undefined) {
          setIsClosing(res.data.isClosing);
        }
        if (res.data.reply) {
          const interviewerMsg = {
            role: 'interviewer',
            speaker: 'interviewer',
            content: res.data.reply,
            message: res.data.reply,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, interviewerMsg]);
          speak(res.data.reply);
        }
      }
    } catch (err) {
      console.error('Failed to advance question:', err);
    } finally {
      setIsAdvancing(false);
    }
  };

  // Repeat current/latest interviewer question
  const handleRepeatQuestion = () => {
    const interviewerMsgs = messages.filter(
      (m) => m.speaker === 'interviewer' || m.role === 'interviewer'
    );
    if (interviewerMsgs.length > 0) {
      const lastMsg = interviewerMsgs[interviewerMsgs.length - 1];
      speak(lastMsg.message || lastMsg.content);
    }
  };

  // Conclude interview session and navigate to Rubric report
  const handleFinishSession = async (skipConfirm = false) => {
    if (!skipConfirm) {
      setShowConfirmModal(true);
      return;
    }
    setShowConfirmModal(false);

    stopSpeaking();
    stopListening();
    setSubmitting(true);

    try {
      const res = await axios.post(`${API_URL}/api/interviews/session/${id}/finish`);
      if (res.data && res.data.reportId) {
        navigate(`/interviews/${res.data.reportId}/report`);
      } else {
        navigate(`/interviews/${id}/report`);
      }
    } catch (err) {
      console.error('Error concluding interview:', err);
      const errMsg =
        err.response?.data?.details ||
        err.response?.data?.error ||
        err.message ||
        'Failed to complete evaluation.';
      alert(`Evaluation Error: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Latest interviewer message to display front-and-center
  const currentInterviewerMsg = [...messages]
    .reverse()
    .find((m) => m.speaker === 'interviewer' || m.role === 'interviewer');

  // Format countdown clock mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 font-mono text-sm">Preparing Live Avatar Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-gray-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-gray-800/80 bg-gray-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg">
        {/* Breadcrumb Navigation & Role info */}
        <div className="flex items-center gap-3">
          <Link
            to="/interviews/new"
            className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition"
            title="Return to Interview Setup"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                Interview Prep &gt; AI Mock Studio &gt;
              </span>
              <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: themeColor }} />
                Live Avatar Room
              </span>
              <span
                className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: isHr ? 'rgba(168, 85, 247, 0.15)' : 'rgba(79, 163, 147, 0.15)',
                  color: themeColor,
                  border: `1px solid ${themeColor}40`,
                }}
              >
                {isHr ? 'HR & Leadership' : 'Technical Track'}
              </span>
            </div>
            <p className="text-xs text-gray-400 truncate max-w-xs sm:max-w-md mt-0.5">
              Role: <span className="text-gray-200 font-medium">{session?.role || 'Software Engineer'}</span>
            </p>
          </div>
        </div>

        {/* Center Timer & Evaluation Actions */}
        <div className="flex items-center gap-3">
          {/* Countdown Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 font-mono text-xs text-gray-300">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span className={timeLeftSeconds < 300 ? 'text-rose-400 animate-pulse font-bold' : ''}>
              {formatTime(timeLeftSeconds)}
            </span>
          </div>

          {/* End & Submit Button */}
          <button
            type="button"
            onClick={() => handleFinishSession(false)}
            disabled={submitting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-500/50 shadow-md transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{submitting ? 'Evaluating...' : 'End & Evaluate'}</span>
          </button>
        </div>
      </header>

      {/* Evaluating Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mb-4 shadow-lg shadow-teal-500/30" />
          <h2 className="text-xl font-bold text-white mb-2">Analyzing Interview & Generating Dossier...</h2>
          <p className="text-xs text-gray-300 max-w-md leading-relaxed">
            Our AI hiring committee is evaluating your conversational transcript, architectural depth, trade-off reasoning, and pushback handling across all 5 rubric dimensions.
          </p>
          <span className="text-[11px] font-mono text-teal-400 mt-4 animate-pulse">
            Compiling evaluation report...
          </span>
        </div>
      )}

      {/* Main Studio Arena Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Live Avatar Stage & Voice Cockpit (Cols 1-7) */}
        <section className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto border-r border-gray-800/70 bg-gradient-to-b from-[#0e131d] via-[#0a0d14] to-[#0a0d14]">
          {/* Avatar Canvas Stage */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[320px]">
            <LiveAvatarCanvas
              isSpeaking={isSpeaking}
              isListening={isListening}
              isAiThinking={isAiReplying}
              isCrossQuestioning={interruption?.active}
              personaName={isHr ? 'Aria Morgan' : 'Dr. Sarah Vance'}
              roleTitle={isHr ? 'Senior Talent Partner & Leadership Evaluator' : 'Principal Staff Engineer & Hiring Lead'}
              interviewType={session?.interviewType || 'technical'}
            />
          </div>

          {/* Phase 4: Interruption / Cross-Questioning Banner */}
          {interruption?.active && (
            <div className="w-full max-w-2xl mx-auto my-3 animate-pulse">
              <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-950/90 via-gray-900/95 to-amber-950/90 border-2 border-amber-500/80 shadow-2xl shadow-amber-900/40 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                    Interviewer Jumped In (Hold on!)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Challenge Detected
                  </span>
                </div>

                <p className="text-sm font-semibold text-amber-100 mb-3 leading-relaxed">
                  "{interruption.prompt}"
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddressInterruption}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition shadow-md"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Answer Cross-Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDismissInterruption}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 text-xs transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Let Me Finish First</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Time's Almost Up / Wrap-Up Phase Banner */}
          {(timeLeftSeconds <= 180 || isClosing) && (
            <div className="w-full max-w-2xl mx-auto my-2 px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs text-amber-300 backdrop-blur-sm shadow-md animate-fadeIn">
              <span className="flex items-center gap-2 font-medium">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>
                  {isClosing
                    ? 'Final Wrap-Up Phase: Share any closing thoughts or questions for your interviewer.'
                    : 'Time is almost up: Pacing session toward graceful closing remarks.'}
                </span>
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                {formatTime(timeLeftSeconds)}
              </span>
            </div>
          )}

          {/* Dynamic Question Progress Stepper */}
          {questions.length > 0 && (
            <div className="w-full max-w-2xl mx-auto my-1 px-1">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-gray-300 flex items-center gap-1.5">
                  <span className={`font-mono font-bold ${isClosing ? 'text-amber-400' : 'text-teal-400'}`}>
                    {isClosing ? 'Closing Phase:' : `Topic ${currentQuestionIndex + 1} of ${questions.length}:`}
                  </span>
                  <span className="text-white font-semibold truncate max-w-xs sm:max-w-md">
                    {isClosing ? 'Final Reflections & Closing Discussion' : (questions[currentQuestionIndex]?.topic || 'Interview Stage')}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-gray-400">
                  {isClosing ? 'Wrap-Up' : (questions[currentQuestionIndex]?.phase || `Phase ${currentQuestionIndex + 1}`)}
                </span>
              </div>

              {/* Progress Segment Bars (Dynamic based on total questions) */}
              <div className="flex items-center gap-1.5 h-1.5 w-full">
                {questions.map((q, idx) => {
                  const isDone = idx < currentQuestionIndex;
                  const isCurrent = idx === currentQuestionIndex && !isClosing;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-full rounded-full transition-all duration-300 ${
                        isDone
                          ? 'bg-teal-500 shadow-sm shadow-teal-500/30'
                          : isCurrent
                          ? (isHr ? 'bg-purple-500 animate-pulse shadow-md shadow-purple-500/50' : 'bg-teal-400 animate-pulse shadow-md shadow-teal-400/50')
                          : 'bg-gray-800'
                      }`}
                      title={`Topic ${idx + 1}: ${q.topic}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Spoken Question & Candidate Interim Transcription Area */}
          <div className="w-full max-w-2xl mx-auto space-y-4 my-2">
            {/* Current Spoken Question Bubble */}
            <div className="relative rounded-2xl bg-gray-900/90 border border-gray-700/80 p-4 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Interviewer Question
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRepeatQuestion}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-teal-300 transition px-2 py-1 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50"
                    title="Repeat question audio"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Repeat Voice
                  </button>

                  {!isClosing && timeLeftSeconds > 60 ? (
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      disabled={isAdvancing || isAiReplying}
                      className="flex items-center gap-1 text-[11px] text-teal-300 hover:text-teal-200 transition px-2.5 py-1 rounded-lg bg-teal-950/80 hover:bg-teal-900 border border-teal-500/40 disabled:opacity-40 font-medium shadow-sm"
                      title={timeLeftSeconds <= 180 ? 'Wrap up interview discussion' : 'Advance to next progressive question'}
                    >
                      <span>{isAdvancing ? 'Advancing...' : (timeLeftSeconds <= 180 ? 'Wrap-Up' : 'Next Topic')}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFinishSession(false)}
                      disabled={submitting}
                      className="flex items-center gap-1.5 text-[11px] text-white transition px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 border border-rose-500/50 font-semibold shadow-md animate-pulse disabled:opacity-50"
                      title="Finish and generate evaluation dossier"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Evaluating...' : 'End & Evaluate'}</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-100 leading-relaxed font-normal">
                {currentInterviewerMsg ? currentInterviewerMsg.message || currentInterviewerMsg.content : 'Getting ready to interview...'}
              </p>
            </div>

            {/* Live Candidate Speech / Transcription Card */}
            <div
              className={`rounded-2xl p-4 transition-all duration-200 border ${
                isListening
                  ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-900/10'
                  : 'bg-gray-900/60 border-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-400 flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isListening ? 'bg-rose-500 animate-ping' : 'bg-gray-600'
                    }`}
                  />
                  {isListening ? 'Live Speech Recognition (STT Active)' : 'Your Answer'}
                </span>
                {isListening && (
                  <span className="text-[11px] font-mono text-rose-300 animate-pulse">
                    Speaking now...
                  </span>
                )}
              </div>

              {/* Interim voice transcript or helper instructions */}
              <div className="min-h-[44px] flex items-center text-sm">
                {interimTranscript ? (
                  <p className="text-rose-200 italic font-mono text-sm leading-snug">
                    "{interimTranscript}"
                  </p>
                ) : isListening ? (
                  <p className="text-gray-500 text-xs italic">
                    Start speaking your answer clearly. Web Speech API will transcribe your response in real-time.
                  </p>
                ) : (
                  <p className="text-gray-500 text-xs">
                    Tap the microphone below to begin answering with your voice, or type in the box.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Voice Cockpit Controls & Text Input Fallback Bar */}
          <div className="w-full max-w-2xl mx-auto pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-gray-900/90 border border-gray-700/80 p-2.5 rounded-2xl shadow-xl">
              {/* Mic Push to Talk / Toggle */}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={!voiceSupported}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isListening
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                    : 'bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40'
                }`}
                title={isListening ? 'Mute Mic' : 'Unmute Mic / Push to Speak'}
              >
                {isListening ? <Mic className="w-4 h-4 animate-bounce" /> : <MicOff className="w-4 h-4" />}
                <span>{isListening ? 'Mute Microphone' : 'Start Speaking (Mic On)'}</span>
              </button>

              {/* TTS Speaker Toggle */}
              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-2 rounded-xl border text-xs transition ${
                  voiceEnabled
                    ? 'bg-gray-800 text-gray-200 border-gray-700 hover:text-white'
                    : 'bg-gray-800/50 text-gray-500 border-gray-700'
                }`}
                title={voiceEnabled ? 'Mute Interviewer Voice' : 'Enable Interviewer Voice'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Challenge / Cross-Examine Button */}
              <button
                type="button"
                onClick={handleManualProbe}
                disabled={interruption?.active || isSpeaking || isAiReplying}
                className="p-2 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 text-xs transition disabled:opacity-40"
                title="Invite AI Interviewer to challenge your architectural assertions"
              >
                <Zap className="w-4 h-4 text-amber-400" />
              </button>

              {/* Text Input Fallback */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex-1 flex items-center gap-2 w-full"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Or type your response here..."
                  disabled={isAiReplying}
                  className="flex-1 bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isAiReplying}
                  className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white transition flex items-center justify-center"
                  title="Send written response"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Right Column: Context HUD & Reference Drawer (Cols 8-12) */}
        <section className="lg:col-span-5 flex flex-col bg-[#0b0f17] border-t lg:border-t-0 border-gray-800/80 overflow-hidden h-[500px] lg:h-auto">
          {/* Drawer Tabs */}
          <div className="p-3 border-b border-gray-800/80 bg-gray-900/40">
            <div className="grid grid-cols-5 gap-1 p-1 bg-gray-900/80 rounded-xl border border-gray-800 text-[10px]">
              <button
                type="button"
                onClick={() => setRightDrawerTab('dialogue')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg font-medium transition ${
                  rightDrawerTab === 'dialogue'
                    ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span className="truncate">Log ({messages.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightDrawerTab('agenda')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg font-medium transition ${
                  rightDrawerTab === 'agenda'
                    ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <ListChecks className="w-3 h-3" />
                <span className="truncate">Plan ({questions.length || 5})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightDrawerTab('rubric')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg font-medium transition ${
                  rightDrawerTab === 'rubric'
                    ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span className="truncate">Rubric ({rubricScores.overallScore}%)</span>
              </button>

              <button
                type="button"
                onClick={() => setRightDrawerTab('jd')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg font-medium transition ${
                  rightDrawerTab === 'jd'
                    ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                <span className="truncate">Job Spec</span>
              </button>

              <button
                type="button"
                onClick={() => setRightDrawerTab('resume')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg font-medium transition ${
                  rightDrawerTab === 'resume'
                    ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span className="truncate">Resume</span>
              </button>
            </div>
          </div>

          {/* Drawer Tab Contents */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
            {/* Tab 1: Full Dialogue Log */}
            {rightDrawerTab === 'dialogue' && (
              <div className="space-y-3">
                {messages.map((m, idx) => {
                  const isCand = m.speaker === 'candidate' || m.role === 'candidate';
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border ${
                        isCand
                          ? 'bg-gray-800/70 border-gray-700/60 ml-4'
                          : 'bg-teal-950/20 border-teal-700/30 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-[11px] font-semibold">
                        <span className={isCand ? 'text-blue-400' : 'text-teal-400'}>
                          {isCand ? 'Candidate (You)' : 'AI Interviewer'}
                        </span>
                        <span className="text-gray-500 font-normal">
                          {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="font-sans text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">
                        {m.message || m.content}
                      </p>
                    </div>
                  );
                })}

                {isAiReplying && (
                  <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-700/30 mr-4 animate-pulse">
                    <span className="text-teal-400 text-xs font-medium">Interviewer is formulating response...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Tab 2: Question Plan / Agenda */}
            {rightDrawerTab === 'agenda' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-xs text-gray-400 font-sans">
                  <span>Progressive Question Structure</span>
                  <span className="font-mono text-teal-400">
                    {currentQuestionIndex + 1} / {questions.length || 5} Active
                  </span>
                </div>

                {questions.map((q, idx) => {
                  const isDone = idx < currentQuestionIndex;
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-teal-950/30 border-teal-500/50 shadow-md shadow-teal-900/20'
                          : isDone
                          ? 'bg-gray-900/40 border-gray-800/80 opacity-75'
                          : 'bg-gray-900/20 border-gray-800/40 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isDone
                                ? 'bg-teal-500 text-black'
                                : isCurrent
                                ? 'bg-teal-400 text-black animate-pulse'
                                : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-gray-100 font-sans">
                            {q.topic}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                            isCurrent
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : isDone
                              ? 'bg-gray-800 text-gray-400'
                              : 'bg-gray-800/40 text-gray-500'
                          }`}
                        >
                          {isCurrent ? 'Current Topic' : isDone ? 'Completed' : 'Upcoming'}
                        </span>
                      </div>

                      <p className="font-sans text-xs text-gray-300 leading-relaxed mb-2">
                        {q.question}
                      </p>

                      {q.expectedCompetencies && q.expectedCompetencies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {q.expectedCompetencies.map((comp, cIdx) => (
                            <span
                              key={cIdx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-400 border border-gray-700/50"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab: Live Rubric Progress Tracking (Phase 5) */}
            {rightDrawerTab === 'rubric' && (
              <div className="space-y-3 font-sans">
                {/* Overall Score Header Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-gray-900 to-teal-950/30 border border-teal-500/40 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                        Provisional Evaluation
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-bold text-teal-300 font-mono">
                          {rubricScores.overallScore}%
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-medium">
                          {rubricScores.overallScore >= 80
                            ? 'Strong Hire Track'
                            : rubricScores.overallScore >= 68
                            ? 'Hire Track'
                            : 'Developing Track'}
                        </span>
                      </div>
                    </div>
                    <Award className="w-8 h-8 text-teal-400/80" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    Live calibrated across 5 core evaluation dimensions based on your responses, architectural depth, and pushback handling.
                  </p>
                </div>

                {/* 5 Rubric Dimension Cards */}
                <div className="space-y-2.5">
                  {[
                    {
                      key: 'technicalDepth',
                      name: isHr ? '1. STAR Structure & Story Cohesion' : '1. Technical Depth & Architecture',
                      score: rubricScores.technicalDepth,
                      tip: isHr ? 'Demarcate Situation, Task, Action, and measurable Result.' : 'Examine memory usage, cache boundaries, and internal bottlenecks.',
                    },
                    {
                      key: 'problemBreakdown',
                      name: '2. Problem Breakdown & Trade-offs',
                      score: rubricScores.problemBreakdown,
                      tip: 'Analyze trade-offs between latency, consistency, and simplicity.',
                    },
                    {
                      key: 'communicationClarity',
                      name: '3. Communication Clarity',
                      score: rubricScores.communicationClarity,
                      tip: 'State assumptions early and structure arguments logically.',
                    },
                    {
                      key: 'practicality',
                      name: '4. Real-world Practicality & Resilience',
                      score: rubricScores.practicality,
                      tip: 'Address production failovers, monitoring, and scale spikes.',
                    },
                    {
                      key: 'handlingPushback',
                      name: '5. Handling Follow-ups & Pushback',
                      score: rubricScores.handlingPushback,
                      tip: 'Defend decisions constructively when the interviewer challenges your assertions.',
                    },
                  ].map((dim, idx) => {
                    const pct = Math.round((dim.score / 5) * 100);
                    const isHigh = dim.score >= 4.0;
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-200">{dim.name}</span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className={isHigh ? 'text-teal-300 font-bold' : 'text-gray-300'}>
                              {dim.score.toFixed(1)} / 5.0
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-sans ${
                                isHigh ? 'bg-teal-500/20 text-teal-300' : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {isHigh ? 'Strong' : 'Competent'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden my-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHigh ? 'bg-teal-400 shadow-sm shadow-teal-400/40' : 'bg-teal-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <p className="text-[10px] text-gray-400 italic leading-tight mt-1">
                          💡 {dim.tip}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Real-time Feedback Notes */}
                {rubricScores.notes && rubricScores.notes.length > 0 && (
                  <div className="p-3 rounded-xl bg-gray-900/40 border border-gray-800 text-xs">
                    <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1 mb-1.5">
                      <ThumbsUp className="w-3 h-3 text-teal-400" />
                      Live Coach Notes
                    </span>
                    <ul className="space-y-1 text-gray-400 text-[11px] list-disc list-inside">
                      {rubricScores.notes.map((note, nIdx) => (
                        <li key={nIdx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conclude & Generate Official Evaluation Report CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleFinishSession(false)}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-[0.98] transition border border-rose-500/60 shadow-xl shadow-rose-950/50 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? 'Generating Official Evaluation Report...' : 'Conclude & Generate Official Report'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Job Description */}
            {rightDrawerTab === 'jd' && (
              <div className="font-sans text-gray-300 text-xs leading-relaxed whitespace-pre-wrap p-2 bg-gray-900/50 rounded-xl border border-gray-800">
                {session?.jobDescription ? (
                  session.jobDescription
                ) : (
                  <p className="text-gray-500 italic">No custom Job Description was uploaded for this session.</p>
                )}
              </div>
            )}

            {/* Tab 3: Resume */}
            {rightDrawerTab === 'resume' && (
              <div className="font-sans text-gray-300 text-xs leading-relaxed whitespace-pre-wrap p-2 bg-gray-900/50 rounded-xl border border-gray-800">
                {session?.resumeText ? (
                  session.resumeText
                ) : (
                  <p className="text-gray-500 italic">No custom resume content was uploaded for this session.</p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Custom Sleek In-App Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700/80 p-6 shadow-2xl shadow-black/80 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Conclude Live Practice Session?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your full transcript, verbal pacing, and technical problem-solving will be analyzed by the AI assessment engine to generate your official evaluation report.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition"
              >
                Continue Practice
              </button>
              <button
                type="button"
                onClick={() => handleFinishSession(true)}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.98] transition border border-rose-500 shadow-lg shadow-rose-950/50 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Analyzing...' : 'End & Evaluate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveAvatarInterviewPage;
