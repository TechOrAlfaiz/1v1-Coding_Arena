/**
 * App.js - Root component with routing & global Neural Network Background
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import NeuralNetworkBackground from './components/NeuralNetworkBackground';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LobbyPage from './pages/LobbyPage';
import MatchPage from './pages/MatchPage';
import ResultPage from './pages/ResultPage';
import LeaderboardPage from './pages/LeaderboardPage';
import DashboardPage from './pages/DashboardPage';
import PracticePage from './pages/PracticePage';
import DailyChallengePage from './pages/DailyChallengePage';
import InterviewSetupPage from './pages/InterviewSetupPage';
import InterviewPage from './pages/InterviewPage';
import LiveAvatarInterviewPage from './pages/LiveAvatarInterviewPage';
import InterviewReportPage from './pages/InterviewReportPage';
import InterviewHistoryPage from './pages/InterviewHistoryPage';
import CompaniesPage from './pages/CompaniesPage';
import QuestionBankPage from './pages/QuestionBankPage';
import LearnPage from './pages/LearnPage';
// Archived: PracticePlanPage moved to ./pages/archive/PracticePlanPage

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Authenticating gladiator...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Auth route (redirect to mode select at / if already logged in)
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes: / is the Mode Select & Arena Showcase landing */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />

      {/* Canonical 1v1 Arena routes */}
      <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
      <Route path="/daily" element={<ProtectedRoute><DailyChallengePage /></ProtectedRoute>} />
      <Route path="/match/:roomId" element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />
      <Route path="/result/:roomId" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/practice" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} />

      {/* Scoped /arena/* alias routes */}
      <Route path="/arena" element={<Navigate to="/lobby" replace />} />
      <Route path="/arena/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
      <Route path="/arena/daily" element={<ProtectedRoute><DailyChallengePage /></ProtectedRoute>} />
      <Route path="/arena/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
      <Route path="/arena/practice" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} />
      <Route path="/arena/match/:roomId" element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />
      <Route path="/arena/result/:roomId" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />

      {/* Canonical Interview Prep routes */}
      <Route path="/interviews/new" element={<ProtectedRoute><InterviewSetupPage /></ProtectedRoute>} />
      <Route path="/interviews/history" element={<ProtectedRoute><InterviewHistoryPage /></ProtectedRoute>} />
      <Route path="/interviews/live/:id" element={<ProtectedRoute><LiveAvatarInterviewPage /></ProtectedRoute>} />
      <Route path="/interviews/:id" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
      <Route path="/interviews/:id/report" element={<ProtectedRoute><InterviewReportPage /></ProtectedRoute>} />
      <Route path="/companies" element={<ProtectedRoute><CompaniesPage /></ProtectedRoute>} />
      <Route path="/questions" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />
      <Route path="/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />

      {/* Scoped /prep/* alias routes */}
      <Route path="/prep" element={<Navigate to="/questions" replace />} />
      <Route path="/prep/questions" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />
      <Route path="/prep/companies" element={<ProtectedRoute><CompaniesPage /></ProtectedRoute>} />
      <Route path="/prep/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
      <Route path="/prep/mock/live/:id" element={<ProtectedRoute><LiveAvatarInterviewPage /></ProtectedRoute>} />
      <Route path="/prep/mock" element={<ProtectedRoute><InterviewSetupPage /></ProtectedRoute>} />
      <Route path="/prep/history" element={<ProtectedRoute><InterviewHistoryPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? "/lobby" : "/"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <div className="relative min-h-screen bg-arena-bg text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Continuously animated global Neural Network Background */}
            <NeuralNetworkBackground opacity={0.45} />
            
            {/* Page content with relative positioning above canvas */}
            <div className="relative z-10">
              <AppRoutes />
            </div>
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

