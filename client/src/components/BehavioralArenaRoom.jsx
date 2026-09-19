import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  Sparkles, 
  HelpCircle, 
  Award, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  ThumbsUp, 
  Check
} from 'lucide-react';

const STAR_CRITERIA = [
  { letter: 'S', title: 'Situation', desc: 'Set the context, company, scope, and stakes of the problem.' },
  { letter: 'T', title: 'Task', desc: 'Identify your specific individual ownership and the expected objective.' },
  { letter: 'A', title: 'Action', desc: 'Explain the technical & interpersonal steps YOU personally took.' },
  { letter: 'R', title: 'Result', desc: 'Share quantifiable metrics, business impact, and key engineering takeaways.' },
];

const PROMPT_SCENARIOS = [
  {
    title: 'Severe Production Outage & Incident Escalation',
    prompt: 'Describe a situation where a critical distributed service went down under peak customer traffic. How did you diagnose the root cause, coordinate with cross-functional teams, and establish preventative guardrails?',
    suggestedQuestions: [
      'What observability metrics alerted you first (P99 latency, error rates)?',
      'How did you communicate progress to non-technical stakeholders during the downtime?',
      'What post-mortem action items were prioritized to avoid repeat failure?'
    ]
  },
  {
    title: 'Technical Disagreement on Architecture',
    prompt: 'Tell me about a time when you and a senior engineer strongly disagreed on a fundamental architectural decision (e.g. SQL vs NoSQL, Monolith vs Microservices). How did you resolve the deadlock constructively?',
    suggestedQuestions: [
      'What objective benchmarks or POCs did you run to validate assumptions?',
      'How did you maintain a high-trust working relationship after the decision was made?',
      'If given the chance today, would you choose the same trade-offs?'
    ]
  },
  {
    title: 'Ambitious Deadline Under Incomplete Specifications',
    prompt: 'Walk me through a project where product requirements were ambiguous and the ship date was aggressive. How did you prioritize MVP scope and de-risk technical delivery?',
    suggestedQuestions: [
      'How did you negotiate scope reduction with Product Managers?',
      'What technical debt did you consciously incur, and how did you pay it down later?'
    ]
  }
];

export default function BehavioralArenaRoom({ roomId, socket, user, players = [], onFinish }) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedStarTab, setSelectedStarTab] = useState('A');
  const [starNotes, setStarNotes] = useState({ S: '', T: '', A: '', R: '' });

  const currentScenario = PROMPT_SCENARIOS[scenarioIndex % PROMPT_SCENARIOS.length];

  // Listen for peer behavioral messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('behavioral:message_received', handleMessage);
    return () => {
      socket.off('behavioral:message_received', handleMessage);
    };
  }, [socket]);

  const handleSendMessage = (textToSend = null) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || !socket || !roomId) return;

    socket.emit('behavioral:send_message', {
      roomId,
      message: text.trim(),
      category: 'STAR_Response',
    });

    if (!textToSend) setInputMessage('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Left Column: Scenario & STAR Guidance */}
      <div className="w-full lg:w-5/12 flex flex-col border-r border-white/10 bg-slate-900/50 p-6 overflow-y-auto space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>BEHAVIORAL ARENA // STAR PROTOCOL</span>
          </div>
          <h2 className="text-xl font-bold font-display text-white mb-2">
            {currentScenario.title}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/70 p-4 rounded-2xl border border-white/5">
            {currentScenario.prompt}
          </p>
        </div>

        {/* STAR Framework Guide & Notes */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
            STRUCTURED STAR FRAMEWORK
          </h3>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {STAR_CRITERIA.map((c) => (
              <button
                key={c.letter}
                type="button"
                onClick={() => setSelectedStarTab(c.letter)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedStarTab === c.letter
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-base font-black font-display">{c.letter}</div>
                <div className="text-[10px] font-mono">{c.title}</div>
              </button>
            ))}
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 mb-3 text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-amber-400 font-mono mr-1">
              {STAR_CRITERIA.find((c) => c.letter === selectedStarTab)?.title}:
            </span>
            {STAR_CRITERIA.find((c) => c.letter === selectedStarTab)?.desc}
          </div>

          <textarea
            value={starNotes[selectedStarTab]}
            onChange={(e) => setStarNotes({ ...starNotes, [selectedStarTab]: e.target.value })}
            placeholder={`Jot notes for [${selectedStarTab}] here...`}
            rows={3}
            className="w-full bg-slate-950/90 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans resize-none"
          />
        </div>

        {/* Quick Follow-Up Questions for Interviewer */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
            INTERVIEWER FOLLOW-UP PROMPTS
          </h3>
          <div className="space-y-2">
            {currentScenario.suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(`[Interviewer Follow-Up] ${q}`)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 hover:border-amber-500/40 text-xs text-slate-300 transition-all cursor-pointer flex items-start gap-2"
              >
                <span className="text-amber-400 font-bold">💬</span>
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Live Conversation Stream */}
      <div className="w-full lg:w-7/12 flex flex-col justify-between bg-slate-950 p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              LIVE INTERVIEW CONVERSATION STREAM
            </span>
          </div>
          <button
            type="button"
            onClick={onFinish}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-mono font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            Finish & Evaluate 🏁
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-[350px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
              <MessageSquare className="w-8 h-8 mb-2 text-slate-600" />
              <span>No messages sent yet. Begin by answering or asking follow-ups!</span>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMe = m.sender === user?.username;
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] font-mono text-slate-400 mb-1">
                    {m.sender}
                  </div>
                  <div
                    className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-white/10 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your STAR response or interviewer probing question..."
            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
