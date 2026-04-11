import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, LogOut, User, Play, BarChart3, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [stats, setStats] = useState({ sessions: 0, avgScore: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from('users').select('full_name').eq('id', user.id).single().then(({ data }) => {
      if (data) setFullName(data.full_name);
    });

    supabase.from('practice_sessions').select('total_questions, correct_answers').eq('user_id', user.id).then(({ data }) => {
      if (data && data.length > 0) {
        const totalQ = data.reduce((s, r) => s + r.total_questions, 0);
        const totalC = data.reduce((s, r) => s + r.correct_answers, 0);
        setStats({ sessions: data.length, avgScore: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0 });
      }
    });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground font-heading">JAMB Prep</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl font-heading">
            Welcome{fullName ? `, ${fullName}` : ''}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">Your exam preparation dashboard</p>
        </div>

        {/* Start Practice CTA */}
        <Link to="/practice">
          <Card className="mb-6 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Play className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold font-heading">Start Practice</h2>
                <p className="text-sm text-muted-foreground">Practice questions by subject and topic</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-heading">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-heading">Practice Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {stats.sessions > 0 ? `${stats.sessions} sessions · ${stats.avgScore}% avg` : 'No sessions yet'}
              </p>
            </CardContent>
          </Card>

          <Link to="/cbt/setup">
            <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer col-span-2 lg:col-span-1">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading">Full CBT Exam</h3>
                  <p className="text-xs text-muted-foreground">4 subjects · 160 questions · 2 hours</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
