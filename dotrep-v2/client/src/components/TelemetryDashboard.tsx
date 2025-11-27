import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Zap, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface TelemetryData {
  daHealth: {
    status: 'healthy' | 'degraded' | 'down';
    latency: number;
    successRate: number;
  };
  anchorStats: {
    totalAnchors: number;
    last24h: number;
    avgLatency: number;
    pendingBatches: number;
  };
  systemHealth: {
    uptime: number;
    requestsPerMin: number;
    errorRate: number;
  };
}

export function TelemetryDashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    daHealth: {
      status: 'healthy',
      latency: 145,
      successRate: 99.8,
    },
    anchorStats: {
      totalAnchors: 1247,
      last24h: 89,
      avgLatency: 2.3,
      pendingBatches: 3,
    },
    systemHealth: {
      uptime: 99.95,
      requestsPerMin: 42,
      errorRate: 0.02,
    },
  });

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        anchorStats: {
          ...prev.anchorStats,
          last24h: prev.anchorStats.last24h + Math.floor(Math.random() * 2),
          pendingBatches: Math.max(0, prev.anchorStats.pendingBatches + (Math.random() > 0.5 ? 1 : -1)),
        },
        systemHealth: {
          ...prev.systemHealth,
          requestsPerMin: Math.max(0, prev.systemHealth.requestsPerMin + Math.floor(Math.random() * 10 - 5)),
        },
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 border-green-500/50 bg-green-500/10';
      case 'degraded':
        return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
      case 'down':
        return 'text-red-400 border-red-500/50 bg-red-500/10';
      default:
        return 'text-gray-400 border-gray-500/50 bg-gray-500/10';
    }
  }, []);

  const statusColor = useMemo(() => getStatusColor(telemetry.daHealth.status), [getStatusColor, telemetry.daHealth.status]);

  // Memoize activity log to prevent unnecessary re-renders
  const activityLog = useMemo(() => [
    { time: '2s ago', event: 'Batch #1247 anchored on-chain', type: 'success' },
    { time: '15s ago', event: 'Merkle proof generated for contribution #8932', type: 'info' },
    { time: '32s ago', event: 'DA pin successful: QmX...abc', type: 'success' },
    { time: '1m ago', event: 'New contribution verified', type: 'info' },
    { time: '2m ago', event: 'SBT minted for contributor #456', type: 'success' },
  ], []);

  return (
    <div className="space-y-6">
      {/* System Status Banner */}
      <Card className="border-green-900/30 bg-gradient-to-br from-green-900/20 to-gray-900/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              System Status
            </CardTitle>
            <Badge variant="outline" className={statusColor}>
              <div className="mr-2 h-2 w-2 rounded-full bg-current animate-pulse" aria-hidden="true" />
              {telemetry.daHealth.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Uptime</div>
                <div className="text-xl font-bold text-white">{telemetry.systemHealth.uptime}%</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Zap className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Requests/min</div>
                <div className="text-xl font-bold text-white">{telemetry.systemHealth.requestsPerMin}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <AlertCircle className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Error Rate</div>
                <div className="text-xl font-bold text-white">{telemetry.systemHealth.errorRate}%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* DA Health */}
        <Card className="border-indigo-900/30 bg-gray-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-400" />
              Data Availability
            </CardTitle>
            <CardDescription className="text-gray-400">
              Polkadot Cloud DA performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <span className="text-sm text-gray-400">Latency</span>
              <div className="flex items-center gap-2">
                <motion.span
                  key={telemetry.daHealth.latency}
                  initial={{ scale: 1.2, color: '#ec4899' }}
                  animate={{ scale: 1, color: '#a78bfa' }}
                  className="font-semibold text-purple-400"
                >
                  {telemetry.daHealth.latency}ms
                </motion.span>
                {telemetry.daHealth.latency < 200 && (
                  <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                    Fast
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <span className="text-sm text-gray-400">Success Rate</span>
              <span className="font-semibold text-green-400">
                {telemetry.daHealth.successRate}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <span className="text-sm text-gray-400">Status</span>
              <Badge variant="outline" className={statusColor}>
                {telemetry.daHealth.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Anchor Stats */}
        <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-pink-400" />
              Anchor Statistics
            </CardTitle>
            <CardDescription className="text-gray-400">
              On-chain anchoring performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <span className="text-sm text-gray-400">Total Anchors</span>
              <span className="font-semibold text-white">
                {telemetry.anchorStats.totalAnchors.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <span className="text-sm text-gray-400">Last 24 Hours</span>
              <motion.span
                key={telemetry.anchorStats.last24h}
                initial={{ scale: 1.2, color: '#ec4899' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="font-semibold text-white"
              >
                {telemetry.anchorStats.last24h}
              </motion.span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <span className="text-sm text-gray-400">Avg Latency</span>
              <span className="font-semibold text-blue-400">
                {telemetry.anchorStats.avgLatency}s
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
              <span className="text-sm text-gray-400">Pending Batches</span>
              <motion.span
                key={telemetry.anchorStats.pendingBatches}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`font-semibold ${
                  telemetry.anchorStats.pendingBatches > 5 
                    ? 'text-yellow-400' 
                    : 'text-green-400'
                }`}
              >
                {telemetry.anchorStats.pendingBatches}
              </motion.span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Log */}
      <Card className="border-purple-900/30 bg-gray-900/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            Live Activity
          </CardTitle>
          <CardDescription className="text-gray-400">
            Real-time system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto" role="log" aria-live="polite" aria-label="Live system activity">
            {activityLog.map((log, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-2 rounded bg-gray-800/30 text-sm"
              >
                <div className={`h-2 w-2 rounded-full ${
                  log.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                }`} />
                <span className="text-gray-500 text-xs w-16">{log.time}</span>
                <span className="text-gray-300 flex-1">{log.event}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default TelemetryDashboard;
