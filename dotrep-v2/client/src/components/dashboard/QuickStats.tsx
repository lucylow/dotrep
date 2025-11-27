import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, GitBranch, Shield, Award, Activity, Star } from 'lucide-react';

interface QuickStatsProps {
  profile?: any;
  contributions?: any[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ profile, contributions = [] }) => {
  const stats = {
    totalScore: profile?.reputationScore || 0,
    contributions: contributions.length,
    verified: contributions.filter((c: any) => c.verified).length,
    achievements: profile?.achievements?.length || 0,
  };

  const verificationRate = stats.contributions > 0 
    ? Math.round((stats.verified / stats.contributions) * 100) 
    : 0;

  const statCards = [
    {
      title: 'Reputation Score',
      value: stats.totalScore.toLocaleString(),
      icon: TrendingUp,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'from-pink-900/20 to-gray-900/50',
      borderColor: 'border-pink-900/30',
      iconColor: 'text-pink-400',
      subtitle: 'Top 10% this month',
      subtitleIcon: Star,
    },
    {
      title: 'Contributions',
      value: stats.contributions,
      icon: GitBranch,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'from-purple-900/20 to-gray-900/50',
      borderColor: 'border-purple-900/30',
      iconColor: 'text-purple-400',
      subtitle: `${contributions.filter((c: any) => c.type === 'commit').length} commits`,
      subtitleIcon: Activity,
    },
    {
      title: 'Verification Rate',
      value: `${verificationRate}%`,
      icon: Shield,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'from-indigo-900/20 to-gray-900/50',
      borderColor: 'border-indigo-900/30',
      iconColor: 'text-indigo-400',
      subtitle: `${stats.verified} of ${stats.contributions} verified`,
      subtitleIcon: Shield,
    },
    {
      title: 'Achievements',
      value: stats.achievements,
      icon: Award,
      color: 'from-orange-500 to-pink-500',
      bgColor: 'from-orange-900/20 to-gray-900/50',
      borderColor: 'border-orange-900/30',
      iconColor: 'text-orange-400',
      subtitle: '3 new this week',
      subtitleIcon: Star,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`relative overflow-hidden border ${stat.borderColor} bg-gradient-to-br ${stat.bgColor} backdrop-blur`}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-3xl`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-400">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <stat.subtitleIcon className="mr-1 h-3 w-3" />
                <span>{stat.subtitle}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};


