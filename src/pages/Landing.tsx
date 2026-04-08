import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Shield, Clock } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="font-heading text-xl font-bold text-foreground">JAMB Prep</span>
          </div>
          <Link to="/login">
            <Button size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4">
        <section className="flex flex-col items-center justify-center py-20 text-center md:py-32">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Private Training Platform
          </div>
          <h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            Master Your JAMB Exams
          </h1>
          <p className="mb-8 max-w-lg text-lg text-muted-foreground">
            Computer-based test practice designed to build your confidence and improve your scores. Exclusive access for registered students.
          </p>
          <Link to="/login">
            <Button size="lg" className="px-8 text-base">
              Get Started
            </Button>
          </Link>
        </section>

        {/* Features */}
        <section className="grid gap-6 pb-20 md:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: 'Real Exam Format',
              desc: 'Practice with questions structured exactly like the JAMB CBT exam.',
            },
            {
              icon: Clock,
              title: 'Timed Practice',
              desc: 'Build speed and accuracy with exam-length timed sessions.',
            },
            {
              icon: Shield,
              title: 'Secure Access',
              desc: 'Private platform exclusively for registered lesson students.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <f.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="mb-1 text-lg font-semibold text-card-foreground"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} JAMB Prep. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
