import { useEffect, useState } from 'react';
import { getUserStats, UserStats } from '@/lib/contentManagement';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Award, Target, TrendingUp, Clock, BookOpen } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import PerformanceInsights from '@/components/PerformanceInsights';

const StudentAnalytics = () => {
  const { user } = useAdmin();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id]);

  const loadStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await getUserStats(user.id);
    setStats(data);
    setLoading(false);
  };

  const getGradeColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    description,
    color,
  }: {
    icon: any;
    title: string;
    value: string | number;
    description?: string;
    color?: string;
  }) => (
    <Card className="bg-[#111111] border-[#1A1A1A] hover:border-[#FFD700] transition">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[#B0B0B0] text-sm mb-2">{title}</p>
            <p className={`text-3xl font-bold ${color || 'text-[#FFD700]'}`}>{value}</p>
            {description && <p className="text-xs text-[#B0B0B0] mt-2">{description}</p>}
          </div>
          <div className="bg-[#0B0B0B] p-3 rounded-lg">
            <Icon className="h-6 w-6 text-[#FFD700]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white py-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-[#FFD700]" />
            Your Performance Analytics
          </h1>
          <p className="text-[#B0B0B0]">Track your progress and identify improvement areas</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 bg-[#111111]" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard
                icon={Award}
                title="Average Score"
                value={`${Math.round(stats.average_score)}%`}
                description={`Best: ${stats.best_score}%`}
                color={getGradeColor(stats.average_score)}
              />
              <StatCard
                icon={Target}
                title="Tests Taken"
                value={stats.total_tests_taken}
                description={`${stats.worst_score ? `Worst: ${stats.worst_score}%` : 'Getting started'}`}
              />
              <StatCard
                icon={TrendingUp}
                title="Strongest Subject"
                value={stats.strongest_subject || 'N/A'}
                description="Best performance area"
              />
              <StatCard
                icon={BookOpen}
                title="Weakest Subject"
                value={stats.weakest_subject || 'N/A'}
                description="Focus area"
              />
            </div>

            {/* Time Spent Card */}
            <Card className="bg-[#111111] border-[#1A1A1A] mb-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#FFD700]" />
                  Total Time Invested
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#FFD700]">
                  {Math.floor(stats.total_time_spent_seconds / 3600)}h{' '}
                  {Math.floor((stats.total_time_spent_seconds % 3600) / 60)}m
                </div>
                <p className="text-[#B0B0B0] mt-2">
                  Average per test: {Math.round(stats.total_time_spent_seconds / Math.max(stats.total_tests_taken, 1) / 60)} minutes
                </p>
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <div className="mb-12">
              <PerformanceInsights userId={user?.id || ''} />
            </div>

            {/* Leaderboards */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Leaderboard examType="cbt" limit={10} title="CBT Leaderboard" />
              <Leaderboard examType="practice" limit={10} title="Practice Leaderboard" />
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <BarChart3 className="h-16 w-16 text-[#1A1A1A] mx-auto mb-4" />
            <p className="text-[#B0B0B0] text-lg">
              Start taking exams to see your analytics and track progress.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAnalytics;
