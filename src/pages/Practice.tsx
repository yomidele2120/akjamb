import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BookOpen, LogOut, CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Subject = { id: string; name: string };
type Topic = { id: string; name: string; subject_id: string };
type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
};

type Phase = 'select' | 'practice' | 'summary';

const Practice = () => {
  const { user, signOut } = useAuth();

  // Selection state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  // Practice state
  const [phase, setPhase] = useState<Phase>('select');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  useEffect(() => {
    supabase.from('subjects').select('id, name').order('name').then(({ data }) => {
      if (data) setSubjects(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedSubject) { setTopics([]); setSelectedTopic(''); return; }
    supabase.from('topics').select('id, name, subject_id').eq('subject_id', selectedSubject).order('name').then(({ data }) => {
      if (data) setTopics(data);
      setSelectedTopic('');
    });
  }, [selectedSubject]);

  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const startPractice = async () => {
    if (!selectedSubject || !selectedTopic || !user) return;
    setLoadingQuestions(true);

    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', selectedSubject)
      .eq('topic_id', selectedTopic);

    if (!qs || qs.length === 0) {
      setLoadingQuestions(false);
      return;
    }

    const shuffled = shuffleArray(qs);

    // Create session
    const { data: session } = await supabase
      .from('practice_sessions')
      .insert({ user_id: user.id, subject_id: selectedSubject, topic_id: selectedTopic, total_questions: 0, correct_answers: 0 })
      .select('id')
      .single();

    setQuestions(shuffled);
    setCurrentIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setCorrectCount(0);
    setTotalAnswered(0);
    setSessionId(session?.id ?? null);
    setPhase('practice');
    setLoadingQuestions(false);
  };

  const currentQuestion = questions[currentIndex];
  const options = currentQuestion ? [
    { key: 'A', text: currentQuestion.option_a },
    { key: 'B', text: currentQuestion.option_b },
    { key: 'C', text: currentQuestion.option_c },
    { key: 'D', text: currentQuestion.option_d },
  ] : [];

  const handleSubmitAnswer = async () => {
    if (!selectedOption || !currentQuestion || !sessionId) return;
    setSubmitted(true);
    const isCorrect = selectedOption === currentQuestion.correct_option;
    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    const newTotal = totalAnswered + 1;
    setCorrectCount(newCorrect);
    setTotalAnswered(newTotal);

    // Save answer
    await supabase.from('practice_answers').insert({
      session_id: sessionId,
      question_id: currentQuestion.id,
      selected_option: selectedOption,
      correct_option: currentQuestion.correct_option,
      is_correct: isCorrect,
    });

    // Update session
    await supabase.from('practice_sessions').update({
      total_questions: newTotal,
      correct_answers: newCorrect,
    }).eq('id', sessionId);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('summary');
      return;
    }
    setCurrentIndex(currentIndex + 1);
    setSelectedOption(null);
    setSubmitted(false);
  };

  const handleEndPractice = () => setPhase('summary');

  const handleRestart = () => {
    setPhase('select');
    setSelectedSubject('');
    setSelectedTopic('');
    setQuestions([]);
    setSessionId(null);
  };

  const scorePercent = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground font-heading">JAMB Prep</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        {/* SELECTION PHASE */}
        {phase === 'select' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold font-heading text-foreground">Start Practice</h1>
              <p className="text-sm text-muted-foreground mt-1">Choose a subject and topic to begin</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedSubject ? 'Select a topic' : 'Choose a subject first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full mt-2"
                  size="lg"
                  disabled={!selectedSubject || !selectedTopic || loadingQuestions}
                  onClick={startPractice}
                >
                  {loadingQuestions ? 'Loading…' : 'Start Practice'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PRACTICE PHASE */}
        {phase === 'practice' && currentQuestion && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span>{correctCount}/{totalAnswered} correct</span>
              </div>
              <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
            </div>

            {/* Question */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg font-heading leading-relaxed">
                  {currentQuestion.question_text}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {options.map(opt => {
                  const isSelected = selectedOption === opt.key;
                  const isCorrect = opt.key === currentQuestion.correct_option;

                  let optionClass = 'border-border hover:border-primary/50 hover:bg-accent/50 cursor-pointer';
                  if (submitted) {
                    if (isCorrect) optionClass = 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400';
                    else if (isSelected && !isCorrect) optionClass = 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400';
                    else optionClass = 'border-border opacity-50';
                  } else if (isSelected) {
                    optionClass = 'border-primary bg-primary/10 ring-2 ring-primary/20';
                  }

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={submitted}
                      onClick={() => setSelectedOption(opt.key)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border p-3 md:p-4 text-left transition-all',
                        optionClass
                      )}
                    >
                      <span className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                        submitted && isCorrect ? 'border-green-500 bg-green-500 text-white' :
                        submitted && isSelected && !isCorrect ? 'border-red-500 bg-red-500 text-white' :
                        isSelected ? 'border-primary bg-primary text-primary-foreground' :
                        'border-muted-foreground/30'
                      )}>
                        {opt.key}
                      </span>
                      <span className="text-sm md:text-base pt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Feedback */}
            {submitted && (
              <Card className={cn(
                'border-l-4',
                selectedOption === currentQuestion.correct_option ? 'border-l-green-500' : 'border-l-red-500'
              )}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedOption === currentQuestion.correct_option ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-semibold text-green-700 dark:text-green-400">Correct!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-semibold text-red-700 dark:text-red-400">
                          Incorrect — Answer is {currentQuestion.correct_option}
                        </span>
                      </>
                    )}
                  </div>
                  {currentQuestion.explanation && (
                    <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!submitted ? (
                <Button className="flex-1" size="lg" disabled={!selectedOption} onClick={handleSubmitAnswer}>
                  Submit Answer
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="lg" onClick={handleEndPractice} className="flex-1">
                    End Practice
                  </Button>
                  <Button size="lg" onClick={handleNext} className="flex-1 gap-2">
                    {currentIndex + 1 >= questions.length ? 'View Results' : 'Next'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* SUMMARY PHASE */}
        {phase === 'summary' && (
          <div className="space-y-6">
            <Card className="text-center">
              <CardContent className="pt-8 pb-8 space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-heading">Practice Complete!</h2>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <div className="text-2xl font-bold font-heading">{totalAnswered}</div>
                    <div className="text-xs text-muted-foreground">Questions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-heading text-green-600">{correctCount}</div>
                    <div className="text-xs text-muted-foreground">Correct</div>
                  </div>
                  <div>
                    <div className={cn('text-2xl font-bold font-heading', scorePercent >= 50 ? 'text-green-600' : 'text-red-500')}>
                      {scorePercent}%
                    </div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                </div>
                <Progress value={scorePercent} className="h-3 mt-4" />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={handleRestart}>
                <RotateCcw className="h-4 w-4" />
                New Practice
              </Button>
              <Link to="/dashboard" className="flex-1">
                <Button size="lg" className="w-full">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Practice;
