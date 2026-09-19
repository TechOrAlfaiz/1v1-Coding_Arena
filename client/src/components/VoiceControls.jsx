import React from 'react';

/**
 * VoiceControls Component
 * Provides interactive audio visualizer, mic recording toggle,
 * and AI voice output toggle.
 */
const VoiceControls = ({
  isListening,
  isSpeaking,
  isSupported,
  voiceEnabled,
  onToggleListening,
  onToggleVoiceEnabled,
  interimTranscript,
}) => {
  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 text-xs text-gray-400">
        <span className="text-amber-400">🎙️</span> Text Mode (Voice API unavailable)
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-gray-900/90 border border-gray-700/70 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg">
      {/* Mic Record Button */}
      <button
        type="button"
        onClick={onToggleListening}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 ${
          isListening
            ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-600'
        }`}
        title={isListening ? 'Stop Speaking' : 'Push to Speak (Live STT)'}
      >
        <span className="relative flex h-2.5 w-2.5">
          {isListening && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isListening ? 'bg-white' : 'bg-gray-400'
            }`}
          ></span>
        </span>
        <span>{isListening ? 'Listening...' : 'Push to Talk'}</span>
      </button>

      {/* Dynamic Equalizer Waves when recording or AI speaking */}
      <div className="flex items-center gap-0.5 h-4 px-1">
        {[40, 90, 60, 100, 50, 75, 30].map((h, idx) => (
          <span
            key={idx}
            className={`w-1 rounded-full transition-all duration-150 ${
              isListening
                ? 'bg-rose-500'
                : isSpeaking
                ? 'bg-cyan-400'
                : 'bg-gray-700'
            }`}
            style={{
              height: isListening || isSpeaking ? `${Math.max(4, (h * Math.sin(idx + 1)) % 16)}px` : '4px',
            }}
          />
        ))}
      </div>

      {/* AI Voice Output Speaker Toggle */}
      <button
        type="button"
        onClick={onToggleVoiceEnabled}
        className={`p-1.5 rounded-lg text-xs transition-colors ${
          voiceEnabled
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'
            : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-400'
        }`}
        title={voiceEnabled ? 'Mute AI Voice Responses' : 'Enable AI Voice Responses'}
      >
        {voiceEnabled ? '🔊 AI Audio On' : '🔇 AI Audio Off'}
      </button>

      {/* Real-time Interim Speech Bubble Preview */}
      {isListening && interimTranscript && (
        <div className="hidden lg:flex items-center text-xs text-rose-300 italic truncate max-w-xs">
          "{interimTranscript}"
        </div>
      )}
    </div>
  );
};

export default VoiceControls;
