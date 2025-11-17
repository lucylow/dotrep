import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, GitBranch, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  contributions?: any[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ contributions = [] }) => {
  const recentContributions = contributions.slice(0, 10);

  const getContributionIcon = (type: string) => {
    return GitBranch;
  };

  const getContributionColor = (type: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      commit: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
      pull_request: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
      issue: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
      review: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
    };
    return colors[type] || colors.commit;
  };

  if (recentContributions.length === 0) {
    return (
      <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-pink-400" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your latest contributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            No contributions yet. Start contributing to build your reputation!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-pink-400" />
          Recent Activity
        </CardTitle>
        <CardDescription className="text-gray-400">
          Your latest contributions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentContributions.map((contribution: any, index: number) => {
            const colors = getContributionColor(contribution.type);
            const Icon = getContributionIcon(contribution.type);
            
            return (
              <motion.div
                key={contribution.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border transition-colors",
                  colors.border,
                  "hover:border-opacity-100"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-full", colors.bg, colors.text)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-white capitalize">
                      {contribution.type?.replace('_', ' ') || 'Contribution'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {contribution.repository || 'Unknown'} • {new Date(contribution.contributedAt || contribution.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("border-pink-500/50 text-pink-400")}>
                    +{contribution.score || 0} pts
                  </Badge>
                  {contribution.verified && (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};


