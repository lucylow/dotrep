/**
 * Polkadot Cloud Integration Components
 * Enhanced wallet connection with Polkadot Cloud features
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDotRepWallet } from '@/_core/hooks/useDotRepWallet';
import { RealTimeReputation } from './RealTimeReputation';
import { CloudNotificationBell } from './CloudNotificationBell';

/**
 * Enhanced Account Card with Cloud Features
 */
export const EnhancedAccountCard: React.FC<{ address: string }> = ({ address }) => {
  const { connectionResult } = useDotRepWallet();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Address</p>
          <p className="font-mono text-sm break-all">{address}</p>
        </div>
        
        {connectionResult?.reputation && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Reputation</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {connectionResult.reputation.score}
              </span>
              <Badge variant="secondary">
                {connectionResult.reputation.tier}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            View Reputation
          </Button>
          <Button variant="outline" size="sm">
            Manage Identity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Cloud-Enhanced Dashboard Header
 */
export const CloudDashboardHeader: React.FC<{ accountAddress?: string }> = ({ accountAddress }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold">DotRep Cloud Dashboard</h1>
        <p className="text-muted-foreground">Real-time reputation and contribution tracking</p>
      </div>
      <div className="flex items-center gap-4">
        {accountAddress && (
          <>
            <RealTimeReputation accountAddress={accountAddress} />
            <CloudNotificationBell accountAddress={accountAddress} />
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Cloud Metrics Display
 */
export const CloudMetrics: React.FC<{
  responseTime?: number;
  activeVerifications?: number;
}> = ({ responseTime = 0, activeVerifications = 0 }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cloud Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{responseTime}ms</div>
          <p className="text-sm text-muted-foreground">Average Response Time</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeVerifications}</div>
          <p className="text-sm text-muted-foreground">Cloud Workers</p>
        </CardContent>
      </Card>
    </div>
  );
};

