import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContributionListProps {
  contributions: any[];
  showActions?: boolean;
}

export const ContributionList: React.FC<ContributionListProps> = ({ 
  contributions, 
  showActions = false 
}) => {
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

  if (contributions.length === 0) {
    return (
      <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">All Contributions</CardTitle>
          <CardDescription className="text-gray-400">
            Complete history of your open source contributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-400">
            <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No contributions yet</p>
            <p className="text-sm">Start contributing to build your reputation!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {contributions.map((contribution: any, index: number) => {
        const colors = getContributionColor(contribution.type);
        const Icon = getContributionIcon(contribution.type);
        
        return (
          <motion.div
            key={contribution.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={cn(
              "border-pink-900/30 bg-gray-900/50 backdrop-blur hover:border-pink-500/50 transition-colors",
              colors.border
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn("p-3 rounded-lg", colors.bg, colors.text)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white capitalize">
                          {contribution.type?.replace('_', ' ') || 'Contribution'}
                        </h3>
                        {contribution.verified && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        {contribution.repository || 'Unknown Repository'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(contribution.contributedAt || contribution.createdAt).toLocaleDateString()}
                        </div>
                        {contribution.url && (
                          <a
                            href={contribution.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-pink-500/50 text-pink-400">
                      +{contribution.score || 0} pts
                    </Badge>
                    {showActions && (
                      <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};


