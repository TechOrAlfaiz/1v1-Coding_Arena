import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Bot, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Building2, 
  Sliders, 
  UserCheck, 
  Code2, 
  MessageSquare, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

const PERSONAS = [
  {
    id: 'Balanced & Encouraging',
    name: 'Balanced & Encouraging',
    icon: '🤝',
    description: 'Constructive feedback, supportive tone, ideal for building interview confidence.',
  },
  {
    id: 'FAANG Principal Architect',
    name: 'FAANG Principal Architect',
    icon: '🏛️',
    description: 'Relentless focus on scalability, edge cases, micro-optimizations, and trade-offs.',
  },
  {
    id: 'Socratic Mentor',
    name: 'Socratic Mentor',
    icon: '🦉',
    description: 'Guides through probing questions rather than answers. Tests foundational depth.',
  },
  {
    id: 'Tough Grilling',
    name: 'Tough Grilling',
    icon: '🔥',
    description: 'High-pressure technical interrogation testing resilience and composure.',
  },
];

const INTERVIEW_TYPES = [
  { id: 'coding', label: 'Coding & Algorithms', icon: '💻', desc: 'Monaco live editor, complexity analysis, test validation' },
  { id: 'system_design', label: 'System Design Whiteboard', icon: '🏛️', desc: 'Interactive architecture canvas, scalability, bottlenecks' },
  { id: 'behavioral', label: 'Behavioral (STAR Method)', icon: '🌟', desc: 'Leadership principles, conflict resolution, metrics-driven' },
  { id: 'mixed', label: 'Full Round (Mixed)', icon: '⚡', desc: 'Algorithmic problem solving combined with architectural deep dive' },
];

export const InterviewSetupPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Studio Mode: 'live_avatar' (New) vs 'standard' (Existing)
  const initialMode = searchParams.get('mode') === 'standard' ? 'standard' : 'live_avatar';
  const [studioMode, setStudioMode] = useState(initialMode);

  // Standard Lab Form state
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'coding');
  const [selectedCompanyId, setSelectedCompanyId] = useState(searchParams.get('companyId') || '');
  const [selectedQuestionId, setSelectedQuestionId] = useState(searchParams.get('questionId') || '');
  const [role, setRole] = useState('Software Engineer (L4/L5)');
  const [difficulty, setDifficulty] = useState('Medium');
  const [interviewerPersona, setInterviewerPersona] = useState('Balanced & Encouraging');
  const [durationMinutes, setDurationMinutes] = useState(45);

  // Live Avatar Form state (Phase 1)
  const [avatarInterviewType, setAvatarInterviewType] = useState('technical'); // 'technical' | 'hr'
  const [avatarRole, setAvatarRole] = useState('Senior Software Engineer');
  const [avatarDuration, setAvatarDuration] = useState(30);

  // JD state
  const [jdInputMode, setJdInputMode] = useState('paste'); // 'paste' | 'upload'
  const [jobDescription, setJobDescription] = useState('');
  const [jdFileName, setJdFileName] = useState('');
  const [parsingJd, setParsingJd] = useState(false);

  // Resume state
  const [resumeInputMode, setResumeInputMode] = useState('paste'); // 'paste' | 'upload'
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [parsingResume, setParsingResume] = useState(false);

  // General state
  const [companies, setCompanies] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const jdFileInputRef = useRef(null);
  const resumeFileInputRef = useRef(null);

  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [compRes, questRes] = await Promise.all([
          axios.get(`${API_URL}/api/companies`),
          axios.get(`${API_URL}/api/questions?category=${selectedType === 'mixed' ? 'coding' : selectedType}`),
        ]);
        setCompanies(compRes.data.companies || []);
        setQuestions(questRes.data.questions || []);
      } catch (err) {
        console.error('Error loading setup data:', err);
      }
    };
    fetchData();
  }, [selectedType, API_URL]);

  // Handle PDF Parsing
  const handleFileUpload = async (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF document.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('arena_token') || localStorage.getItem('token');

    if (target === 'jd') {
      setParsingJd(true);
      setJdFileName(file.name);
    } else {
      setParsingResume(true);
      setResumeFileName(file.name);
    }
    setError('');

    try {
      const res = await axios.post(`${API_URL}/api/interviews/parse-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.data?.text) {
        if (target === 'jd') {
          setJobDescription(res.data.text);
        } else {
          setResumeText(res.data.text);
        }
      }
    } catch (err) {
      console.error('PDF parsing error:', err);
      setError('Failed to parse text from the uploaded PDF. You can paste the text manually below.');
    } finally {
      if (target === 'jd') setParsingJd(false);
      else setParsingResume(false);
    }
  };

  // Launch Standard Interview
  const handleStartStandard = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('arena_token') || localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${API_URL}/api/interviews/start`,
        {
          type: selectedType,
          companyId: selectedCompanyId || null,
          role,
          questionId: selectedQuestionId || null,
          difficulty,
          interviewerPersona,
          durationMinutes: parseInt(durationMinutes, 10),
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.data && response.data.session) {
        navigate(`/interviews/${response.data.session._id}`);
      }
    } catch (err) {
      console.error('Failed to start interview:', err);
      setError(err.response?.data?.error || 'Failed to initialize interview session.');
    } finally {
      setLoading(false);
    }
  };

  // Launch Live Avatar Interview (Phase 1 + 2)
  const handleStartLiveAvatar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!jobDescription.trim() && !resumeText.trim()) {
      setError('Please upload or paste at least a Job Description or a Resume.');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('arena_token') || localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${API_URL}/api/interviews/live-avatar/start`,
        {
          jobDescription: jobDescription.trim(),
          resumeText: resumeText.trim(),
          interviewType: avatarInterviewType,
          role: avatarRole,
          durationMinutes: parseInt(avatarDuration, 10),
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.data?.session?._id) {
        navigate(`/interviews/live/${response.data.session._id}`);
      }
    } catch (err) {
      console.error('Failed to initialize live avatar session:', err);
      setError(err.response?.data?.error || 'Failed to initialize live avatar session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <BreadcrumbNav 
          items={[
            { label: 'AI Mock Studio', to: '/interviews/new' },
            { label: studioMode === 'live_avatar' ? 'Live Avatar Setup' : 'Session Setup' }
          ]} 
          backTo="/questions" 
          backLabel="Back to Questions" 
        />

        {/* Studio Header HUD */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>AI Mock Interview Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Select Your Interview Format
          </h1>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">
            Practice realistic interviews calibrated for top tech standards with live voice avatars, speech recognition, and STAR rubrics.
          </p>
        </div>

        {/* Mode Switcher Segmented Control */}
        <div className="bg-[var(--surface)] border border-[var(--border)] p-1.5 rounded-2xl flex items-center justify-center max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => {
              setStudioMode('live_avatar');
              setSearchParams({ mode: 'live_avatar' });
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              studioMode === 'live_avatar'
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm border border-[var(--border-active)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Bot className="w-4 h-4 text-[var(--accent)]" />
            <span>Live Avatar Interview</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
              NEW
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStudioMode('standard');
              setSearchParams({ mode: 'standard' });
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              studioMode === 'standard'
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm border border-[var(--border-active)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders className="w-4 h-4 text-[var(--accent)]" />
            <span>Standard Lab Config</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--error)]/50 text-[var(--error)] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-sm font-bold opacity-70 hover:opacity-100">&times;</button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MODE A: LIVE AVATAR INTERVIEW (PHASE 1 SETUP FLOW)
            ───────────────────────────────────────────────────────────── */}
        {studioMode === 'live_avatar' && (
          <form onSubmit={handleStartLiveAvatar} className="space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-7 rounded-2xl space-y-6">
              
              {/* Step 1: Target Role & Round Type */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Step 1: Choose Interview Track
                  </span>
                  <span className="text-[11px] font-mono text-[var(--accent)]">
                    Free Browser Web Speech
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div
                    onClick={() => setAvatarInterviewType('technical')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      avatarInterviewType === 'technical'
                        ? 'bg-[var(--surface-raised)] border-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/30'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border)]/80 hover:bg-[var(--surface-raised)]/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">💻</span>
                        {avatarInterviewType === 'technical' && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                        Technical Round
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Evaluates algorithmic problem solving, system architecture trade-offs, and skills matched to your resume & JD.
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)]">
                      Focus: DSA, Architecture, Tech Stack
                    </div>
                  </div>

                  <div
                    onClick={() => setAvatarInterviewType('hr')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      avatarInterviewType === 'hr'
                        ? 'bg-[var(--surface-raised)] border-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/30'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border)]/80 hover:bg-[var(--surface-raised)]/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">🤝</span>
                        {avatarInterviewType === 'hr' && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                        HR & Leadership Round
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Behavioral scenarios, conflict resolution, leadership principles, and cultural alignment using the STAR method.
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)]">
                      Focus: STAR Framework, Culture, Leadership
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Role Title & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Target Role Title
                  </label>
                  <input
                    type="text"
                    value={avatarRole}
                    onChange={(e) => setAvatarRole(e.target.value)}
                    placeholder="e.g. Full Stack Engineer (L4/L5)"
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Session Duration
                  </label>
                  <select
                    value={avatarDuration}
                    onChange={(e) => setAvatarDuration(e.target.value)}
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="15">15 mins (Quick Sprint)</option>
                    <option value="30">30 mins (Standard Mock)</option>
                    <option value="45">45 mins (Comprehensive)</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Job Description (Upload PDF or Paste Text) */}
              <div className="pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Step 2: Job Description (JD)
                  </label>
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setJdInputMode('paste')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        jdInputMode === 'paste' 
                          ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)]' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Paste Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setJdInputMode('upload')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        jdInputMode === 'upload' 
                          ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)]' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Upload PDF
                    </button>
                  </div>
                </div>

                {jdInputMode === 'upload' ? (
                  <div 
                    onClick={() => jdFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-5 text-center cursor-pointer transition-colors bg-[var(--surface-raised)]/30 hover:bg-[var(--surface-raised)]/60"
                  >
                    <input 
                      type="file" 
                      ref={jdFileInputRef} 
                      onChange={(e) => handleFileUpload(e, 'jd')} 
                      accept=".pdf" 
                      className="hidden" 
                    />
                    <Upload className="w-6 h-6 text-[var(--accent)] mx-auto mb-2" />
                    <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                      {parsingJd ? 'Extracting text from PDF...' : jdFileName ? `Selected: ${jdFileName}` : 'Click to upload Job Description (PDF)'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                      {jobDescription ? `✅ ${jobDescription.length} characters parsed successfully` : 'Max 10MB • Powered by pdf-parse'}
                    </p>
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the Job Description or target role requirements here..."
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono leading-relaxed"
                  />
                )}
                {jobDescription && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--accent)] mt-1 px-1">
                    <span>Ready • {jobDescription.split(/\s+/).filter(Boolean).length} words</span>
                    <button type="button" onClick={() => setJobDescription('')} className="text-[var(--text-secondary)] hover:text-[var(--error)]">Clear</button>
                  </div>
                )}
              </div>

              {/* Step 4: Candidate Resume (Upload PDF or Paste Text) */}
              <div className="pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Step 3: Candidate Resume
                  </label>
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setResumeInputMode('paste')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        resumeInputMode === 'paste' 
                          ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)]' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Paste Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeInputMode('upload')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        resumeInputMode === 'upload' 
                          ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)]' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Upload PDF
                    </button>
                  </div>
                </div>

                {resumeInputMode === 'upload' ? (
                  <div 
                    onClick={() => resumeFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-5 text-center cursor-pointer transition-colors bg-[var(--surface-raised)]/30 hover:bg-[var(--surface-raised)]/60"
                  >
                    <input 
                      type="file" 
                      ref={resumeFileInputRef} 
                      onChange={(e) => handleFileUpload(e, 'resume')} 
                      accept=".pdf" 
                      className="hidden" 
                    />
                    <FileText className="w-6 h-6 text-[var(--accent)] mx-auto mb-2" />
                    <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                      {parsingResume ? 'Extracting text from PDF...' : resumeFileName ? `Selected: ${resumeFileName}` : 'Click to upload Resume (PDF)'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                      {resumeText ? `✅ ${resumeText.length} characters parsed successfully` : 'Max 10MB • Text extracted locally on server'}
                    </p>
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your Resume text or projects, skills, and past experience summary here..."
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono leading-relaxed"
                  />
                )}
                {resumeText && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--accent)] mt-1 px-1">
                    <span>Ready • {resumeText.split(/\s+/).filter(Boolean).length} words</span>
                    <button type="button" onClick={() => setResumeText('')} className="text-[var(--text-secondary)] hover:text-[var(--error)]">Clear</button>
                  </div>
                )}
              </div>

              {/* Action Banner */}
              <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span>Interactive SpeechSynthesis speaking avatar with live SpeechRecognition</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || parsingJd || parsingResume}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0E121A] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Initializing Avatar Session...</span>
                    </>
                  ) : (
                    <>
                      <span>Launch Live Avatar Interview</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MODE B: STANDARD PRACTICE LAB (PHASE 0 REDESIGN)
            ───────────────────────────────────────────────────────────── */}
        {studioMode === 'standard' && (
          <form onSubmit={handleStartStandard} className="space-y-6 bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-7 rounded-2xl">
            {/* 1. Interview Format */}
            <div>
              <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                1. Interview Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTERVIEW_TYPES.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id);
                      setSelectedQuestionId('');
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedType === type.id
                        ? 'border-[var(--accent)] bg-[var(--surface-raised)] shadow-sm ring-1 ring-[var(--accent)]/30'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80 hover:bg-[var(--surface-raised)]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <div className="font-semibold text-xs text-[var(--text-primary)]">{type.label}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{type.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Target Company & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  2. Target Company
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="">Any / General Tech Assessment</option>
                  {companies.map((comp) => (
                    <option key={comp._id} value={comp._id}>
                      {comp.name} ({comp.tier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Target Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            {/* 3. AI Interviewer Persona */}
            <div className="pt-4 border-t border-[var(--border)]">
              <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">
                3. AI Interviewer Persona
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERSONAS.map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => setInterviewerPersona(persona.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      interviewerPersona === persona.id
                        ? 'border-[var(--accent)] bg-[var(--surface-raised)] shadow-sm ring-1 ring-[var(--accent)]/30'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80 hover:bg-[var(--surface-raised)]/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{persona.icon}</span>
                      <div>
                        <div className="font-semibold text-xs text-[var(--text-primary)]">{persona.name}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{persona.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Question & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  4. Select Problem (Optional)
                </label>
                <select
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                  className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="">Auto-Match (Randomized by AI)</option>
                  {questions.map((q) => (
                    <option key={q._id} value={q._id}>
                      [{q.difficulty}] {q.title} ({q.topic || q.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="30">30 Minutes (Sprint)</option>
                  <option value="45">45 Minutes (Standard)</option>
                  <option value="60">60 Minutes (Deep Dive)</option>
                </select>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-[var(--text-secondary)]">
                Dual Editor, Whiteboard & Speech Support
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0E121A] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Initializing Session...</span>
                  </>
                ) : (
                  <>
                    <span>Start Practice Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InterviewSetupPage;
