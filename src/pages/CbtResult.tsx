import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, LogOut, Trophy, Target, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type SubjectScore = {
  correct: number;
  total: number;
  name: string;
};

const CbtResult = () => {
  const { user, signOut } = useAuth();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<{
    total_score: number;
    total_questions: number;
    correct_answers: number;
    subject_scores: Record<string, SubjectScore>;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !sessionId) return;

    const load = async () => {
      const { data } = await supabase
        .from('cbt_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setResult({
          total_score: data.total_score,
          total_questions: data.total_questions,
          correct_answers: data.correct_answers,
          subject_scores: data.subject_scores as Record<string, SubjectScore>,
          created_at: data.created_at,
        });
      }
      setLoading(false);
    };
    load();
  }, [user, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading results…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Result not found</p>
        <Link to="/dashboard"><Button>Back to Dashboard</Button></Link>
      </div>
    );
  }

  const scorePercent = Math.round((result.correct_answers / result.total_questions) * 100);
  const subjectEntries = Object.entries(result.subject_scores);

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
        <div className="space-y-6">
          {/* Overall score */}
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className={cn(
                'mx-auto flex h-20 w-20 items-center justify-center rounded-full',
                scorePercent >= 50 ? 'bg-green-500/10' : 'bg-red-500/10'
              )}>
                <Trophy className={cn(
                  'h-10 w-10',
                  scorePercent >= 50 ? 'text-green-500' : 'text-red-500'
                )} />
              </div>

              <div>
                <h1 className="text-3xl font-bold font-heading">CBT Exam Complete</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(result.created_at).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>

              <div className={cn(
                'text-5xl font-bold font-heading',
                scorePercent >= 50 ? 'text-green-600' : 'text-red-500'
              )}>
                {scorePercent}%
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-center gap-1.5 text-xl font-bold font-heading">
                    <Target className="h-5 w-5 text-primary" />
                    {result.total_questions}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1.5 text-xl font-bold font-heading text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    {result.correct_answers}
                  </div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1.5 text-xl font-bold font-heading text-red-500">
                    <XCircle className="h-5 w-5" />
                    {result.total_questions - result.correct_answers}
                  </div>
                  <div className="text-xs text-muted-foreground">Wrong</div>
                </div>
              </div>

              <Progress value={scorePercent} className="h-3 mt-2" />
            </CardContent>
          </Card>

          {/* Per-subject breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Subject Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subjectEntries.map(([subId, score]) => {
                const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
                return (
                  <div key={subId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{score.name}</span>
                      <span className={cn(
                        'text-sm font-bold',
                        pct >= 50 ? 'text-green-600' : 'text-red-500'
                      )}>
                        {score.correct}/{score.total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct >= 50 ? 'bg-green-500' : 'bg-red-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/cbt/setup" className="flex-1">
              <Button variant="outline" size="lg" className="w-full gap-2">
                <RotateCcw className="h-4 w-4" /> Take Another Exam
              </Button>
            </Link>
            <Link to="/dashboard" className="flex-1">
              <Button size="lg" className="w-full">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CbtResult;
