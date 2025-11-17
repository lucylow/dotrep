import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  GitPullRequest, 
  Users, 
  Star,
  Zap,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { ReputationScoreCard } from '@/components/reputation/ReputationScoreCard';
import { SkeletonCard } from '@/components/ui/EnhancedLoading';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { NetworkMap } from '@/components/dashboard/NetworkMap';
import { ContributionList } from '@/components/contributions/ContributionList';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { CloudDashboardHeader, CloudMetrics, EnhancedAccountCard } from '@/components/cloud/PolkadotCloudIntegration';
import { useDotRepWallet } from '@/_core/hooks/useDotRepWallet';

type ViewMode = 'grid' | 'list';
type TimeFilter = '7d' | '30d' | '90d' | 'all';

const EnhancedDashboard: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { connectionResult } = useDotRepWallet();
  const { data: contributor, isLoading: contributorLoading } = trpc.contributor.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: allContributions = [] } = trpc.contribution.list.useQuery(
    { contributorId: contributor?.id || 0 },
    { enabled: !!contributor }
  );

  const { data: achievements = [] } = trpc.achievement.list.useQuery(
    { contributorId: contributor?.id || 0 },
    { enabled: !!contributor }
  );

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'network'>('overview');

  // Filter contributions based on time filter
  const filteredContributions = useMemo(() => {
    if (!allContributions) return [];
    
    const now = Date.now();
    const filterTime = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity
    }[timeFilter];

    return allContributions.filter((contribution: any) => {
      const contributionTime = new Date(contribution.contributedAt || contribution.createdAt).getTime();
      return now - contributionTime <= filterTime;
    });
  }, [allContributions, timeFilter]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (loading || contributorLoading) {
    return (
      <UnifiedSidebar>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <Zap className="h-8 w-8 animate-pulse text-white" />
            </div>
            <div className="text-xl text-gray-600 dark:text-gray-400">Loading Dashboard...</div>
          </motion.div>
        </div>
      </UnifiedSidebar>
    );
  }

  if (!isAuthenticated) {
    navigate('/');
    return null;
  }

  return (
    <UnifiedSidebar>
      <motion.div
        className="p-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header with Cloud Features */}
          {connectionResult?.account?.address ? (
            <CloudDashboardHeader accountAddress={connectionResult.account.address} />
          ) : (
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Reputation Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Track and manage your contributions across the Polkadot ecosystem
                </p>
              </div>
            </div>
          )}

          {/* Cloud Metrics */}
          <CloudMetrics responseTime={120} activeVerifications={5} />
            
          {/* View Controls */}
          <div className="flex items-center space-x-4">
              {/* Time Filter */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(['7d', '30d', '90d', 'all'] as TimeFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200",
                      timeFilter === filter
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    {filter === 'all' ? 'All Time' : filter}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-md transition-colors duration-200",
                    viewMode === 'grid'
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-md transition-colors duration-200",
                    viewMode === 'list'
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: TrendingUp },
                { id: 'contributions', name: 'Contributions', icon: GitPullRequest },
                { id: 'network', name: 'Network', icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200",
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <tab.icon size={16} />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Main Content */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Quick Stats */}
                    <QuickStats profile={contributor} contributions={filteredContributions} />

                    {/* Reputation Score */}
                    {contributor ? (
                      <ReputationScoreCard
                        score={contributor.totalReputationScore || 0}
                        showBreakdown={true}
                        animated={true}
                      />
                    ) : (
                      <SkeletonCard />
                    )}

                    {/* Recent Activity */}
                    <ActivityFeed contributions={filteredContributions.slice(0, 10)} />
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Enhanced Account Card with Cloud Features */}
                    {connectionResult?.account?.address && (
                      <EnhancedAccountCard address={connectionResult.account.address} />
                    )}
                    
                    {/* Network Status */}
                    <NetworkMap />

                    {/* Achievement Preview */}
                    <motion.div
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Star className="w-5 h-5 text-yellow-500 mr-2" />
                        Recent Achievements
                      </h3>
                      <div className="space-y-3">
                        {achievements.slice(0, 4).map((achievement: any, index: number) => (
                          <div
                            key={achievement.id || index}
                            className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                          >
                            <span className="text-sm font-medium">{achievement.name || 'Achievement'}</span>
                            <Star className="w-4 h-4 fill-current" />
                          </div>
                        ))}
                        {achievements.length === 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                            No achievements yet
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {activeTab === 'contributions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Your Contributions
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {filteredContributions.length} contributions
                    </span>
                  </div>
                  
                  <ContributionList 
                    contributions={filteredContributions}
                    showActions={true}
                  />
                </div>
              )}

              {activeTab === 'network' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Network Overview
                  </h2>
                  <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Network Insights
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Advanced network visualization coming soon...
                    </p>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </UnifiedSidebar>
  );
};

export default EnhancedDashboard;

