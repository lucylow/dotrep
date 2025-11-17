import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  GitBranch, 
  Shield, 
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  Globe
} from 'lucide-react';

type DemoState = 'idle' | 'adding' | 'verifying' | 'complete' | 'crosschain';

interface JudgeDemoProps {
  className?: string;
}

/**
 * Interactive demo component for hackathon judges
 * Showcases key features: contribution adding, verification, cross-chain queries
 */
export const JudgeDemo: React.FC<JudgeDemoProps> = ({ className }) => {
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const [reputation, setReputation] = useState(750);
  const [currentChain, setCurrentChain] = useState('polkadot');

  const runDemo = async () => {
    setDemoState('adding');
    await new Promise(resolve => setTimeout(resolve, 1000));

    setDemoState('verifying');
    await new Promise(resolve => setTimeout(resolve, 1500));

    setDemoState('complete');
    setReputation(prev => prev + 25);
    
    setTimeout(() => setDemoState('idle'), 3000);
  };

  const switchChain = (chain: string) => {
    setCurrentChain(chain);
    // Reputation remains the same across chains
  };

  return (
    <div className={className}>
      <Card className="border-2 border-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Live Reputation Demo
          </CardTitle>
          <CardDescription>
            Interactive demonstration of DotRep's core features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Visualization */}
          <div className={`demo-visualization p-6 rounded-lg border-2 transition-all ${
            demoState === 'idle' ? 'bg-gray-50 border-gray-200' :
            demoState === 'adding' ? 'bg-blue-50 border-blue-300' :
            demoState === 'verifying' ? 'bg-yellow-50 border-yellow-300' :
            'bg-green-50 border-green-300'
          }`}>
            <AnimatePresence mode="wait">
              {demoState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-semibold text-gray-600">
                    Click to start demo
                  </p>
                </motion.div>
              )}
              {demoState === 'adding' && (
                <motion.div
                  key="adding"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <GitBranch className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
                  <p className="text-lg font-semibold text-blue-700">
                    Adding contribution...
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    Verifying GitHub commit...
                  </p>
                </motion.div>
              )}
              {demoState === 'verifying' && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <Shield className="w-12 h-12 mx-auto mb-4 text-yellow-500 animate-pulse" />
                  <p className="text-lg font-semibold text-yellow-700">
                    Verifying contribution...
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Off-chain worker processing...
                  </p>
                </motion.div>
              )}
              {demoState === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-center"
                >
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-2xl font-bold text-green-700">
                    Reputation +25! 🎉
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    Contribution verified and reputation updated
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reputation Display */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Current Reputation</p>
              <p className="text-3xl font-bold text-purple-700">{reputation}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>

          {/* Cross-Chain Demo */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Cross-Chain Reputation Portability</p>
            <div className="flex gap-2 flex-wrap">
              {['polkadot', 'kusama', 'moonbeam', 'acala'].map((chain) => (
                <Button
                  key={chain}
                  variant={currentChain === chain ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchChain(chain)}
                  className="capitalize"
                >
                  <Globe className="w-4 h-4 mr-1" />
                  {chain}
                </Button>
              ))}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Your Reputation on {currentChain}</p>
              <p className="text-xl font-bold">{reputation}</p>
              <p className="text-xs text-gray-500 mt-1">
                Same reputation score across all parachains!
              </p>
            </div>
          </div>

          {/* Demo Controls */}
          <Button
            onClick={runDemo}
            disabled={demoState !== 'idle'}
            className="w-full"
            size="lg"
          >
            {demoState === 'idle' ? (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Start Demo
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            )}
          </Button>

          {/* Technology Showcase */}
          <div className="pt-4 border-t">
            <p className="text-xs font-semibold text-gray-600 mb-2">Polkadot Technology Stack</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Substrate Pallet</Badge>
              <Badge variant="secondary">XCM Integration</Badge>
              <Badge variant="secondary">Off-Chain Workers</Badge>
              <Badge variant="secondary">Polkadot Cloud</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Component showcasing unique features for judges
 */
export const UniqueFeaturesShowcase: React.FC = () => {
  const features = [
    {
      title: "Cross-Chain Reputation Portability",
      description: "Your reputation travels with you across the entire Polkadot ecosystem",
      icon: Globe,
      color: "text-blue-500"
    },
    {
      title: "Soulbound Achievement NFTs",
      description: "Non-transferable NFTs that prove your expertise and contributions",
      icon: Award,
      color: "text-purple-500"
    },
    {
      title: "Cloud-Native Verification",
      description: "Auto-scaling infrastructure handles millions of verifications",
      icon: Zap,
      color: "text-yellow-500"
    },
    {
      title: "Sybil-Resistant Design",
      description: "Advanced algorithms prevent reputation farming and fake accounts",
      icon: Shield,
      color: "text-green-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {features.map((feature, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};


