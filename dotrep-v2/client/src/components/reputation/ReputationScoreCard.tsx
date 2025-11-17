import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, Award } from 'lucide-react';

interface ReputationScoreCardProps {
  score: number;
  showBreakdown?: boolean;
  animated?: boolean;
}

export const ReputationScoreCard: React.FC<ReputationScoreCardProps> = ({ 
  score, 
  showBreakdown = false,
  animated = false 
}) => {
  const scorePercentage = Math.min((score / 10000) * 100, 100);
  const level = score < 1000 ? 'Beginner' : score < 5000 ? 'Intermediate' : score < 10000 ? 'Advanced' : 'Expert';

  return (
    <Card className="relative overflow-hidden border-pink-900/30 bg-gradient-to-br from-pink-900/20 to-purple-900/20 backdrop-blur">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-full blur-3xl" />
      <CardHeader className="relative z-10">
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-pink-400" />
          Reputation Score
        </CardTitle>
        <CardDescription className="text-gray-400">
          Your overall contribution reputation
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4">
        <div className="flex items-end gap-4">
          <motion.div
            initial={animated ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-6xl font-bold text-white"
          >
            {score.toLocaleString()}
          </motion.div>
          <div className="mb-2">
            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/50">
              {level}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress to next level</span>
            <span className="text-gray-300">{scorePercentage.toFixed(1)}%</span>
          </div>
          <Progress value={scorePercentage} className="h-2" />
        </div>

        {showBreakdown && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{Math.floor(score * 0.4).toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">Commits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{Math.floor(score * 0.35).toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">PRs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{Math.floor(score * 0.25).toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">Reviews</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

