import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Users,
  Lock,
  Award,
  Vote,
  FileText,
  Zap,
  BarChart3,
  PieChart,
  Settings,
  Play,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";

interface TokenomicsParams {
  totalSupply: number; // in millions
  initialDistribution: {
    community: number; // percentage
    treasury: number;
    team: number;
    investors: number;
    staking: number;
  };
  inflationRate: number; // annual percentage
  stakingRewardRate: number; // annual percentage
  reputationWeight: number; // weight of reputation in token distribution
  governanceThreshold: number; // minimum tokens to create proposal
}

interface GovernanceProposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  category: "reputation" | "tokenomics" | "parameters" | "treasury";
  status: "active" | "passed" | "rejected" | "executed";
  votesFor: number;
  votesAgainst: number;
  threshold: number;
  endBlock: number;
  currentBlock: number;
  reputationImpact?: string;
}

const COLORS = {
  community: "#6C3CF0",
  treasury: "#A074FF",
  team: "#8B5CF6",
  investors: "#A78BFA",
  staking: "#C4B5FD"
};

export default function TokenomicsSimulationPage() {
  const [params, setParams] = useState<TokenomicsParams>({
    totalSupply: 1000, // 1 billion tokens
    initialDistribution: {
      community: 40,
      treasury: 20,
      team: 15,
      investors: 15,
      staking: 10
    },
    inflationRate: 5,
    stakingRewardRate: 12,
    reputationWeight: 0.3,
    governanceThreshold: 1000
  });

  const [selectedProposal, setSelectedProposal] = useState<GovernanceProposal | null>(null);
  const [simulationYears, setSimulationYears] = useState(5);

  // Mock governance proposals
  const mockProposals: GovernanceProposal[] = [
    {
      id: 1,
      title: "Adjust Reputation-to-Token Conversion Rate",
      description: "Proposal to increase the reputation weight in token distribution from 30% to 40% to better incentivize quality contributions.",
      proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      category: "reputation",
      status: "active",
      votesFor: 1250,
      votesAgainst: 320,
      threshold: 1500,
      endBlock: 125000,
      currentBlock: 124500,
      reputationImpact: "High - Will increase token rewards for high-reputation users"
    },
    {
      id: 2,
      title: "Reduce Inflation Rate to 3%",
      description: "Proposal to reduce annual inflation from 5% to 3% to maintain token value while still providing staking rewards.",
      proposer: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      category: "tokenomics",
      status: "active",
      votesFor: 890,
      votesAgainst: 210,
      threshold: 1000,
      endBlock: 124800,
      currentBlock: 124500,
      reputationImpact: "Medium - May reduce overall token distribution but increase value"
    },
    {
      id: 3,
      title: "Minimum Reputation Score for Governance Participation",
      description: "Require minimum reputation score of 50 to create governance proposals, ensuring quality proposals from active contributors.",
      proposer: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      category: "reputation",
      status: "passed",
      votesFor: 2100,
      votesAgainst: 150,
      threshold: 2000,
      endBlock: 123000,
      currentBlock: 124500,
      reputationImpact: "High - Will gate governance participation by reputation"
    },
    {
      id: 4,
      title: "Reputation-Based Staking Rewards Multiplier",
      description: "Implement a multiplier system where users with higher reputation scores receive increased staking rewards (up to 2x for top reputation).",
      proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      category: "reputation",
      status: "active",
      votesFor: 1450,
      votesAgainst: 280,
      threshold: 1500,
      endBlock: 125200,
      currentBlock: 124500,
      reputationImpact: "Very High - Will significantly incentivize reputation building"
    }
  ];

  // Calculate distribution values
  const distributionData = useMemo(() => {
    const total = params.totalSupply;
    return [
      { name: "Community", value: (total * params.initialDistribution.community) / 100, percentage: params.initialDistribution.community },
      { name: "Treasury", value: (total * params.initialDistribution.treasury) / 100, percentage: params.initialDistribution.treasury },
      { name: "Team", value: (total * params.initialDistribution.team) / 100, percentage: params.initialDistribution.team },
      { name: "Investors", value: (total * params.initialDistribution.investors) / 100, percentage: params.initialDistribution.investors },
      { name: "Staking Pool", value: (total * params.initialDistribution.staking) / 100, percentage: params.initialDistribution.staking }
    ];
  }, [params]);

  // Generate inflation projection data
  const inflationData = useMemo(() => {
    const data = [];
    let currentSupply = params.totalSupply;
    
    for (let year = 0; year <= simulationYears; year++) {
      data.push({
        year: year,
        supply: currentSupply,
        stakingRewards: (currentSupply * params.initialDistribution.staking / 100) * (params.stakingRewardRate / 100),
        reputationRewards: (currentSupply * params.reputationWeight) * (params.inflationRate / 100)
      });
      currentSupply = currentSupply * (1 + params.inflationRate / 100);
    }
    return data;
  }, [params, simulationYears]);

  // Calculate total distribution percentage
  const totalDistribution = useMemo(() => {
    return Object.values(params.initialDistribution).reduce((sum, val) => sum + val, 0);
  }, [params.initialDistribution]);

  const updateDistribution = (key: keyof TokenomicsParams["initialDistribution"], value: number) => {
    setParams(prev => ({
      ...prev,
      initialDistribution: {
        ...prev.initialDistribution,
        [key]: value
      }
    }));
  };

  const resetParams = () => {
    setParams({
      totalSupply: 1000,
      initialDistribution: {
        community: 40,
        treasury: 20,
        team: 15,
        investors: 15,
        staking: 10
      },
      inflationRate: 5,
      stakingRewardRate: 12,
      reputationWeight: 0.3,
      governanceThreshold: 1000
    });
  };

  const getStatusBadge = (status: GovernanceProposal["status"]) => {
    const variants = {
      active: "bg-blue-100 text-blue-800 border-blue-300",
      passed: "bg-green-100 text-green-800 border-green-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      executed: "bg-purple-100 text-purple-800 border-purple-300"
    };
    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getCategoryIcon = (category: GovernanceProposal["category"]) => {
    switch (category) {
      case "reputation":
        return <Award className="w-4 h-4" />;
      case "tokenomics":
        return <Coins className="w-4 h-4" />;
      case "parameters":
        return <Settings className="w-4 h-4" />;
      case "treasury":
        return <FileText className="w-4 h-4" />;
    }
  };

  const calculateProgress = (proposal: GovernanceProposal) => {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const needed = proposal.threshold - totalVotes;
    const progress = (totalVotes / proposal.threshold) * 100;
    return { progress: Math.min(progress, 100), needed, totalVotes };
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-[#131313] mb-2">
              Tokenomics & DAO Governance
            </h1>
            <p className="text-[#4F4F4F]">
              Simulate token economics and participate in reputation-focused governance
            </p>
          </div>

          <Tabs defaultValue="simulation" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simulation">
                <BarChart3 className="w-4 h-4 mr-2" />
                Tokenomics Simulation
              </TabsTrigger>
              <TabsTrigger value="governance">
                <Vote className="w-4 h-4 mr-2" />
                DAO Governance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="simulation" className="space-y-6">
              {/* Parameter Controls */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#131313] flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    Simulation Parameters
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetParams}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Run Simulation
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold text-[#131313] mb-2 block">
                        Total Supply: {params.totalSupply}M tokens
                      </Label>
                      <Slider
                        value={[params.totalSupply]}
                        onValueChange={([value]) => setParams(prev => ({ ...prev, totalSupply: value }))}
                        min={100}
                        max={5000}
                        step={100}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-[#131313] mb-2 block">
                        Annual Inflation Rate: {params.inflationRate}%
                      </Label>
                      <Slider
                        value={[params.inflationRate]}
                        onValueChange={([value]) => setParams(prev => ({ ...prev, inflationRate: value }))}
                        min={0}
                        max={20}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-[#131313] mb-2 block">
                        Staking Reward Rate: {params.stakingRewardRate}%
                      </Label>
                      <Slider
                        value={[params.stakingRewardRate]}
                        onValueChange={([value]) => setParams(prev => ({ ...prev, stakingRewardRate: value }))}
                        min={0}
                        max={30}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold text-[#131313] mb-2 block">
                        Reputation Weight: {params.reputationWeight * 100}%
                      </Label>
                      <Slider
                        value={[params.reputationWeight * 100]}
                        onValueChange={([value]) => setParams(prev => ({ ...prev, reputationWeight: value / 100 }))}
                        min={0}
                        max={100}
                        step={1}
                        className="mt-2"
                      />
                      <p className="text-xs text-[#4F4F4F] mt-1">
                        Percentage of token distribution based on reputation score
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-[#131313] mb-2 block">
                        Governance Threshold: {params.governanceThreshold.toLocaleString()} tokens
                      </Label>
                      <Slider
                        value={[params.governanceThreshold]}
                        onValueChange={([value]) => setParams(prev => ({ ...prev, governanceThreshold: value }))}
                        min={100}
                        max={10000}
                        step={100}
                        className="mt-2"
                      />
                      <p className="text-xs text-[#4F4F4F] mt-1">
                        Minimum tokens required to create a proposal
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-[#131313] mb-2 block">
                        Simulation Period: {simulationYears} years
                      </Label>
                      <Slider
                        value={[simulationYears]}
                        onValueChange={([value]) => setSimulationYears(value)}
                        min={1}
                        max={10}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Distribution Controls */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-[#131313] mb-6 flex items-center gap-2">
                  <PieChart className="w-6 h-6" />
                  Initial Token Distribution
                </h2>
                
                {totalDistribution !== 100 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Total distribution: {totalDistribution}% (must equal 100%)
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(params.initialDistribution).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-[#131313] capitalize">
                          {key}
                        </Label>
                        <span className="text-sm font-bold text-[#6C3CF0]">
                          {value}%
                        </span>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={([newValue]) => updateDistribution(key as keyof TokenomicsParams["initialDistribution"], newValue)}
                        min={0}
                        max={100}
                        step={1}
                        className="mt-2"
                      />
                      <p className="text-xs text-[#4F4F4F]">
                        {(params.totalSupply * value / 100).toFixed(1)}M tokens
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribution Pie Chart */}
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-[#131313] mb-4">Token Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(1)}M tokens (${distributionData.find(d => d.name === name)?.percentage}%)`,
                          name
                        ]}
                      />
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Supply Projection */}
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-[#131313] mb-4">Supply Projection</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={inflationData}>
                      <defs>
                        <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6C3CF0" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6C3CF0" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(1)}M tokens`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="supply" 
                        stroke="#6C3CF0" 
                        fillOpacity={1} 
                        fill="url(#colorSupply)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Rewards Breakdown */}
              <Card className="p-6">
                <h3 className="text-xl font-bold text-[#131313] mb-4">Rewards Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={inflationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(1)}M tokens`}
                    />
                    <Legend />
                    <Bar dataKey="stakingRewards" fill="#A074FF" name="Staking Rewards" />
                    <Bar dataKey="reputationRewards" fill="#6C3CF0" name="Reputation Rewards" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4F4F4F]">Current Supply</p>
                      <p className="text-2xl font-bold text-[#131313]">
                        {params.totalSupply}M
                      </p>
                    </div>
                    <Coins className="w-8 h-8 text-[#6C3CF0]" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4F4F4F]">Annual Inflation</p>
                      <p className="text-2xl font-bold text-[#131313]">
                        {params.inflationRate}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4F4F4F]">Staking APY</p>
                      <p className="text-2xl font-bold text-[#131313]">
                        {params.stakingRewardRate}%
                      </p>
                    </div>
                    <Lock className="w-8 h-8 text-[#A074FF]" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4F4F4F]">Reputation Weight</p>
                      <p className="text-2xl font-bold text-[#131313]">
                        {(params.reputationWeight * 100).toFixed(0)}%
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-purple-600" />
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="governance" className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#131313] mb-2">
                    Reputation Governance Proposals
                  </h2>
                  <p className="text-[#4F4F4F]">
                    Proposals that affect the social reputation system and tokenomics
                  </p>
                </div>
                <Button className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]">
                  <FileText className="w-4 h-4 mr-2" />
                  Create Proposal
                </Button>
              </div>

              {/* Filter by category */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="cursor-pointer">All</Badge>
                <Badge variant="outline" className="cursor-pointer">Reputation</Badge>
                <Badge variant="outline" className="cursor-pointer">Tokenomics</Badge>
                <Badge variant="outline" className="cursor-pointer">Parameters</Badge>
                <Badge variant="outline" className="cursor-pointer">Treasury</Badge>
              </div>

              {/* Active Proposals */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[#131313] flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Active Proposals
                </h3>
                {mockProposals
                  .filter(p => p.status === "active")
                  .map((proposal) => {
                    const { progress, needed, totalVotes } = calculateProgress(proposal);
                    const blocksRemaining = proposal.endBlock - proposal.currentBlock;
                    
                    return (
                      <Card 
                        key={proposal.id} 
                        className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setSelectedProposal(proposal)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(proposal.category)}
                            <div>
                              <h3 className="text-xl font-bold text-[#131313]">{proposal.title}</h3>
                              <p className="text-sm text-[#4F4F4F] mt-1">
                                Proposer: {proposal.proposer.slice(0, 16)}...{proposal.proposer.slice(-8)}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(proposal.status)}
                        </div>

                        <p className="text-[#4F4F4F] mb-4">{proposal.description}</p>

                        {proposal.reputationImpact && (
                          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Award className="w-4 h-4 text-purple-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-purple-900">Reputation Impact</p>
                                <p className="text-sm text-purple-700">{proposal.reputationImpact}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#4F4F4F]">Voting Progress</span>
                            <span className="font-semibold">{totalVotes} / {proposal.threshold} votes</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-600">
                                {proposal.votesFor} For
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-semibold text-red-600">
                                {proposal.votesAgainst} Against
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-[#4F4F4F]">
                              <Clock className="w-4 h-4" />
                              <span>{blocksRemaining.toLocaleString()} blocks remaining</span>
                            </div>
                            <Button 
                              size="sm"
                              className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                            >
                              Vote <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>

              {/* Historical Proposals */}
              <div className="space-y-4 mt-8">
                <h3 className="text-xl font-bold text-[#131313] flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Historical Proposals
                </h3>
                {mockProposals
                  .filter(p => p.status !== "active")
                  .map((proposal) => (
                    <Card key={proposal.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(proposal.category)}
                          <div>
                            <h3 className="text-xl font-bold text-[#131313]">{proposal.title}</h3>
                            <p className="text-sm text-[#4F4F4F] mt-1">
                              Proposer: {proposal.proposer.slice(0, 16)}...{proposal.proposer.slice(-8)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(proposal.status)}
                      </div>
                      <p className="text-[#4F4F4F] mb-4">{proposal.description}</p>
                      {proposal.reputationImpact && (
                        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Award className="w-4 h-4 text-purple-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-purple-900">Reputation Impact</p>
                              <p className="text-sm text-purple-700">{proposal.reputationImpact}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600 font-semibold">
                          ✓ {proposal.votesFor} For
                        </span>
                        <span className="text-red-600 font-semibold">
                          ✗ {proposal.votesAgainst} Against
                        </span>
                      </div>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

