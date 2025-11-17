import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Vote, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Zap
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SkeletonCard } from "@/components/ui/EnhancedLoading";

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  status: "active" | "passed" | "rejected" | "executed";
  votesFor: number;
  votesAgainst: number;
  threshold: number;
  endBlock: number;
  currentBlock: number;
  type: "parameter" | "upgrade" | "treasury" | "general";
}

export default function GovernancePage() {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const { data: proposals, isLoading } = trpc.polkadot.governance.getProposals.useQuery();

  const mockProposals: Proposal[] = [
    {
      id: 1,
      title: "Update Reputation Algorithm Weights",
      description: "Proposal to adjust the weight distribution for different contribution types to better reflect community values.",
      proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      status: "active",
      votesFor: 1250,
      votesAgainst: 320,
      threshold: 1500,
      endBlock: 125000,
      currentBlock: 124500,
      type: "parameter"
    },
    {
      id: 2,
      title: "Increase Minimum Verifier Stake",
      description: "Proposal to increase the minimum stake required to become a verifier from 10 DOT to 50 DOT for better security.",
      proposer: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      status: "active",
      votesFor: 890,
      votesAgainst: 210,
      threshold: 1000,
      endBlock: 124800,
      currentBlock: 124500,
      type: "parameter"
    },
    {
      id: 3,
      title: "Runtime Upgrade v2.1.0",
      description: "Upgrade the DotRep runtime to version 2.1.0 with improved XCM support and gas optimizations.",
      proposer: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      status: "passed",
      votesFor: 2100,
      votesAgainst: 150,
      threshold: 2000,
      endBlock: 123000,
      currentBlock: 124500,
      type: "upgrade"
    }
  ];

  const getStatusBadge = (status: Proposal["status"]) => {
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

  const getTypeIcon = (type: Proposal["type"]) => {
    switch (type) {
      case "parameter":
        return <TrendingUp className="w-4 h-4" />;
      case "upgrade":
        return <Zap className="w-4 h-4" />;
      case "treasury":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const calculateProgress = (proposal: Proposal) => {
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
            <h1 className="text-4xl font-extrabold text-[#131313] mb-2">Governance</h1>
            <p className="text-[#4F4F4F]">
              Participate in on-chain governance to shape the future of DotRep
            </p>
          </div>

          <Tabs defaultValue="proposals" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="proposals">Active Proposals</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="create">Create Proposal</TabsTrigger>
            </TabsList>

            <TabsContent value="proposals" className="space-y-4">
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
                          {getTypeIcon(proposal.type)}
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
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {mockProposals
                .filter(p => p.status !== "active")
                .map((proposal) => (
                  <Card key={proposal.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#131313]">{proposal.title}</h3>
                        <p className="text-sm text-[#4F4F4F] mt-1">
                          Proposer: {proposal.proposer.slice(0, 16)}...{proposal.proposer.slice(-8)}
                        </p>
                      </div>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <p className="text-[#4F4F4F]">{proposal.description}</p>
                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <span className="text-green-600 font-semibold">
                        ✓ {proposal.votesFor} For
                      </span>
                      <span className="text-red-600 font-semibold">
                        ✗ {proposal.votesAgainst} Against
                      </span>
                    </div>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="create">
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-[#131313] mb-6">Create New Proposal</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#131313] mb-2">
                      Proposal Type
                    </label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg">
                      <option>Parameter Change</option>
                      <option>Runtime Upgrade</option>
                      <option>Treasury Proposal</option>
                      <option>General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#131313] mb-2">
                      Title
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Enter proposal title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#131313] mb-2">
                      Description
                    </label>
                    <textarea 
                      className="w-full p-3 border border-gray-300 rounded-lg h-32"
                      placeholder="Describe your proposal in detail..."
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Proposal Requirements</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Minimum deposit: 1,000 DOT</li>
                          <li>Voting period: 7 days (10,080 blocks)</li>
                          <li>Enactment period: 7 days after approval</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                    size="lg"
                  >
                    Submit Proposal
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

