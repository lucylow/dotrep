/**
 * Real-time Reputation Display Component
 * Shows live reputation updates from cloud subscriptions
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RealTimeReputationProps {
  accountAddress: string;
}

interface ReputationUpdate {
  score: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  timestamp: number;
}

export const RealTimeReputation: React.FC<RealTimeReputationProps> = ({ accountAddress }) => {
  const [reputationUpdate, setReputationUpdate] = useState<ReputationUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accountAddress) return;

    const reputationEndpoint = process.env.VITE_CLOUD_REPUTATION_ENDPOINT || 
      'https://reputation.dotrep.cloud/stream';

    // Connect to real-time reputation updates
    const eventSource = new EventSource(`${reputationEndpoint}/${accountAddress}`);

    eventSource.onopen = () => {
      console.log('Connected to real-time reputation updates');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: ReputationUpdate = JSON.parse(event.data);
        setReputationUpdate(update);
      } catch (error) {
        console.error('Failed to parse reputation update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Real-time reputation error:', error);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [accountAddress]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'bg-green-500/20 text-green-500';
      case 'down':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  if (!reputationUpdate) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">Reputation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">--</span>
            <Badge variant="outline" className={!isConnected ? 'opacity-50' : ''}>
              {isConnected ? 'Live' : 'Connecting...'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">Reputation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold">{reputationUpdate.score}</span>
          <Badge variant="outline" className={getTrendColor(reputationUpdate.trend)}>
            <div className="flex items-center gap-1">
              {getTrendIcon(reputationUpdate.trend)}
              <span>
                {reputationUpdate.change > 0 ? '+' : ''}{reputationUpdate.change}
              </span>
            </div>
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live updates' : 'Offline'}
          </span>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
};


