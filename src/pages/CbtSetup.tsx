import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, LogOut, Clock, CheckSquare, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Subject = { id: string; name: string; questionCount: number };

const ENGLISH_NAME = 'english language';
const QUESTIONS_PER_SUBJECT = 40;
const TOTAL_SUBJECTS = 4;

const CbtSetup = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [englishId, setEnglishId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check for active session
      const { data: active } = await supabase
        .from('cbt_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .limit(1);

      if (active && active.length > 0) {
        setActiveSession(active[0].id);
      }

      // Load subjects with question counts
      const { data: subs } = await supabase.from('subjects').select('id, name').order('name');
      if (!subs) { setLoading(false); return; }

      const withCounts: Subject[] = [];
      for (const s of subs) {
        const { count } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('subject_id', s.id);
        withCounts.push({ ...s, questionCount: count ?? 0 });

        if (s.name.toLowerCase() === ENGLISH_NAME) {
          setEnglishId(s.id);
          setSelectedIds(prev => new Set(prev).add(s.id));
        }
      }
      setSubjects(withCounts);
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleSubject = (id: string) => {
    if (id === englishId) return; // English is mandatory
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Max 3 non-English subjects
        const nonEnglish = [...next].filter(x => x !== englishId);
        if (nonEnglish.length >= 3) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const canStart = selectedIds.size === TOTAL_SUBJECTS &&
    [...selectedIds].every(id => {
      const s = subjects.find(x => x.id === id);
      return s && s.questionCount >= QUESTIONS_PER_SUBJECT;
    });

  const startExam = async () => {
    if (!user || !canStart) return;
    setStarting(true);

    try {
      // Create session
      const subjectIdsArray = [...selectedIds];
      const { data: session, error: sessionErr } = await supabase
        .from('cbt_sessions')
        .insert({
          user_id: user.id,
          subject_ids: subjectIdsArray,
          status: 'in_progress',
          duration_minutes: 120,
          total_questions: TOTAL_SUBJECTS * QUESTIONS_PER_SUBJECT,
        })
        .select('id')
        .single();

      if (sessionErr || !session) throw new Error(sessionErr?.message || 'Failed to create session');

      // Load random questions per subject and create answer slots
      let questionIndex = 0;
      const answerRows: Array<{
        session_id: string;
        question_id: string;
        subject_id: string;
        selected_option: null;
        question_index: number;
      }> = [];

      for (const subId of subjectIdsArray) {
        const { data: qs } = await supabase
          .from('questions')
          .select('id')
          .eq('subject_id', subId);

        if (!qs || qs.length < QUESTIONS_PER_SUBJECT) {
          throw new Error('Not enough questions for selected subjects');
        }

        // Shuffle and pick 40
        const shuffled = [...qs].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, QUESTIONS_PER_SUBJECT);

        for (const q of picked) {
          answerRows.push({
            session_id: session.id,
            question_id: q.id,
            subject_id: subId,
            selected_option: null,
            question_index: questionIndex++,
          });
        }
      }

      // Insert all answer slots
      const { error: ansErr } = await supabase.from('cbt_answers').insert(answerRows);
      if (ansErr) throw new Error('Failed to setup exam questions');

      navigate(`/cbt/exam/${session.id}`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground font-heading">JAMB Prep</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        {/* Resume active session */}
        {activeSession && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="flex items-center gap-4 py-5">
              <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">You have an exam in progress</p>
                <p className="text-xs text-muted-foreground">Resume to continue where you left off</p>
              </div>
              <Button size="sm" onClick={() => navigate(`/cbt/exam/${activeSession}`)}>
                Resume
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Start CBT Exam</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Simulate a full JAMB CBT exam — {TOTAL_SUBJECTS} subjects, {TOTAL_SUBJECTS * QUESTIONS_PER_SUBJECT} questions, 2 hours
            </p>
          </div>

          {/* Exam info */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" /> 2 Hours
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
              <CheckSquare className="h-3.5 w-3.5" /> {TOTAL_SUBJECTS * QUESTIONS_PER_SUBJECT} Questions
            </div>
          </div>

          {/* Subject selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">
                Select your subjects ({selectedIds.size}/{TOTAL_SUBJECTS})
              </CardTitle>
              <p className="text-xs text-muted-foreground">English is compulsory. Pick 3 more subjects.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading subjects…</p>
              ) : (
                subjects.map(s => {
                  const isEnglish = s.id === englishId;
                  const isSelected = selectedIds.has(s.id);
                  const hasEnough = s.questionCount >= QUESTIONS_PER_SUBJECT;
                  const disabled = !hasEnough || (
                    !isSelected && !isEnglish &&
                    [...selectedIds].filter(x => x !== englishId).length >= 3
                  );

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isEnglish || (!isSelected && disabled)}
                      onClick={() => toggleSubject(s.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                          : 'border-border hover:border-primary/30',
                        (!hasEnough && !isEnglish) && 'opacity-40 cursor-not-allowed',
                        isEnglish && 'cursor-default'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-6 w-6 items-center justify-center rounded border text-xs font-bold',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}>
                          {isSelected ? '✓' : ''}
                        </div>
                        <span className="text-sm font-medium">{s.name}</span>
                        {isEnglish && (
                          <span className="text-[10px] bg-primary/20 text-primary rounded px-1.5 py-0.5 font-semibold">
                            Required
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        'text-xs',
                        hasEnough ? 'text-muted-foreground' : 'text-red-500'
                      )}>
                        {s.questionCount} questions {!hasEnough && `(need ${QUESTIONS_PER_SUBJECT})`}
                      </span>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            disabled={!canStart || starting}
            onClick={startExam}
          >
            {starting ? 'Setting up exam…' : 'Start Exam'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CbtSetup;
