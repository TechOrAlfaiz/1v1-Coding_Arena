import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

export const LearnPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  // Quiz state
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/courses`);
        const list = res.data.courses || [];
        setCourses(list);
        if (list.length > 0) {
          setSelectedCourse(list[0]);
          if (list[0].modules && list[0].modules.length > 0) {
            setSelectedModule(list[0].modules[0]);
            if (list[0].modules[0].lessons && list[0].modules[0].lessons.length > 0) {
              setSelectedLesson(list[0].modules[0].lessons[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [API_URL]);

  const handleSelectLesson = (mod, lesson) => {
    setSelectedModule(mod);
    setSelectedLesson(lesson);
    setSelectedOption(null);
    setQuizResult(null);
  };

  const handleQuizSubmit = async (quizId) => {
    if (selectedOption === null || submittingQuiz) return;
    setSubmittingQuiz(true);

    try {
      const res = await axios.post(`${API_URL}/api/courses/quiz/submit`, {
        courseId: selectedCourse._id,
        moduleId: selectedModule._id,
        quizId,
        selectedOption,
      });

      setQuizResult(res.data);
    } catch (err) {
      console.error('Error submitting quiz:', err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <BreadcrumbNav 
          items={[{ label: 'Academy' }]} 
          backTo="/questions" 
          backLabel="Back to Questions" 
        />

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono mb-3">
            <span>Learning Tracks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Interview Engineering Modules
          </h1>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">
            Core algorithmic patterns, distributed systems primitives, and behavioral frameworks.
          </p>
        </div>

        {/* Course Track Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {courses.map((course) => (
            <div
              key={course._id}
              onClick={() => {
                setSelectedCourse(course);
                if (course.modules && course.modules.length > 0) {
                  setSelectedModule(course.modules[0]);
                  if (course.modules[0].lessons && course.modules[0].lessons.length > 0) {
                    setSelectedLesson(course.modules[0].lessons[0]);
                  }
                }
                setQuizResult(null);
                setSelectedOption(null);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                selectedCourse?._id === course._id
                  ? 'bg-[var(--surface)] border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border)]/80 hover:bg-[var(--surface-raised)]/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xl">{course.badgeIcon || '⚡'}</span>
                <span className="text-[10px] font-mono font-medium text-[var(--accent-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded border border-[var(--border)]">
                  +{course.xpReward || 150} XP
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">{course.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{course.description}</p>
            </div>
          ))}
        </div>

        {/* Selected Course Content Viewer */}
        {selectedCourse && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Curriculum Sidebar */}
            <div className="lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-mono text-[var(--text-secondary)] px-1">
                Curriculum
              </h3>

              <div className="space-y-3">
                {selectedCourse.modules?.map((mod) => (
                  <div key={mod._id} className="space-y-1">
                    <div className="text-xs font-semibold text-[var(--accent)] px-1 py-1">
                      {mod.title}
                    </div>

                    <div className="space-y-1">
                      {mod.lessons?.map((les) => (
                        <button
                          key={les.id}
                          type="button"
                          onClick={() => handleSelectLesson(mod, les)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                            selectedLesson?.id === les.id
                              ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/50'
                          }`}
                        >
                          <span className="truncate">{les.title}</span>
                          <span className="text-[10px] font-mono text-[var(--text-secondary)] ml-2">{les.duration}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Lesson Reader & Quiz Area */}
            <div className="lg:col-span-8 space-y-5">
              {selectedLesson ? (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-7 space-y-5">
                  {/* Lesson Header */}
                  <div className="border-b border-[var(--border)] pb-3.5">
                    <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-mono mb-1">
                      <span>{selectedModule?.title}</span> • <span>{selectedLesson.duration}</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedLesson.title}</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{selectedLesson.summary}</p>
                  </div>

                  {/* Lesson Markdown Content */}
                  <div className="text-xs text-[var(--text-primary)] leading-relaxed space-y-2.5 bg-[var(--surface-raised)] p-4 rounded-lg border border-[var(--border)]">
                    {selectedLesson.contentMarkdown}
                  </div>

                  {/* Code Snippet Box */}
                  {selectedLesson.codeSnippet && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-mono text-[var(--text-secondary)]">
                        Implementation Example:
                      </div>
                      <pre className="bg-[var(--surface-raised)] border border-[var(--border)] p-3.5 rounded-lg text-xs font-mono text-[var(--accent)] overflow-x-auto leading-relaxed">
                        {selectedLesson.codeSnippet}
                      </pre>
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {selectedLesson.keyTakeaways && selectedLesson.keyTakeaways.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] space-y-1.5">
                      <h4 className="text-xs font-semibold text-[var(--accent)]">Key Engineering Takeaways:</h4>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-secondary)]">
                        {selectedLesson.keyTakeaways.map((takeaway, idx) => (
                          <li key={idx}>{takeaway}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Interactive Quiz Checkpoint */}
                  {selectedLesson.quiz && selectedLesson.quiz.length > 0 && (
                    <div className="pt-4 border-t border-[var(--border)] space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                          Checkpoint Quiz
                        </h4>
                        <span className="text-xs text-[var(--accent-secondary)] font-mono">+35 XP</span>
                      </div>

                      {selectedLesson.quiz.map((q) => (
                        <div key={q._id || 'quiz_1'} className="space-y-2.5 bg-[var(--surface-raised)] p-4 rounded-lg border border-[var(--border)]">
                          <div className="text-xs font-medium text-[var(--text-primary)]">{q.question}</div>

                          <div className="space-y-1.5">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = selectedOption === optIdx;
                              let optClass = 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]';

                              if (quizResult) {
                                if (optIdx === quizResult.correctAnswer) {
                                  optClass = 'bg-[var(--surface)] border-[var(--accent)] text-[var(--accent)] font-medium';
                                } else if (isSelected && !quizResult.isCorrect) {
                                  optClass = 'bg-[var(--surface)] border-[var(--error)] text-[var(--error)]';
                                }
                              } else if (isSelected) {
                                optClass = 'bg-[var(--surface)] border-[var(--accent)] text-[var(--accent)]';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  onClick={() => !quizResult && setSelectedOption(optIdx)}
                                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${optClass}`}
                                >
                                  {opt}
                                </div>
                              );
                            })}
                          </div>

                          {/* Submit & Result */}
                          {!quizResult ? (
                            <button
                              type="button"
                              onClick={() => handleQuizSubmit(q._id)}
                              disabled={selectedOption === null || submittingQuiz}
                              className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-black hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50"
                            >
                              {submittingQuiz ? 'Evaluating...' : 'Submit Answer'}
                            </button>
                          ) : (
                            <div className={`mt-2 p-3 rounded-lg border text-xs ${
                              quizResult.isCorrect
                                ? 'bg-[var(--surface)] border-[var(--accent)] text-[var(--accent)]'
                                : 'bg-[var(--surface)] border-[var(--error)] text-[var(--error)]'
                            }`}>
                              <div className="font-semibold mb-0.5">
                                {quizResult.isCorrect ? 'Correct! +35 XP Awarded' : 'Incorrect'}
                              </div>
                              <div className="text-[var(--text-secondary)]">{quizResult.explanation}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center text-[var(--text-secondary)] text-sm">
                  Select a lesson from the curriculum sidebar to begin.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage;
