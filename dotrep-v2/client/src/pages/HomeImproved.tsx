import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Github, Zap, Award, CheckCircle2, ArrowRight, Sparkles, Database, Lock } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function HomeImproved() {
  const features = [
    {
      icon: Github,
      title: "GitHub Integration",
      description: "Seamlessly connect your GitHub account with cryptographic verification",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Shield,
      title: "Cryptographic Proofs",
      description: "Every contribution is verified with Merkle proofs and anchored on-chain",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Database,
      title: "Polkadot Cloud DA",
      description: "Decentralized data availability powered by Polkadot Cloud infrastructure",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Award,
      title: "Soul-Bound Tokens",
      description: "Mint non-transferable SBTs representing your verified reputation",
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: Zap,
      title: "Real-Time Tracking",
      description: "Automatic contribution tracking via webhooks and GraphQL crawling",
      color: "from-yellow-500 to-orange-500",
    },
    {
      icon: Lock,
      title: "Anti-Abuse System",
      description: "Advanced detection of bots, spam, and gaming attempts",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const stats = [
    { label: "Contributors", value: "1,247", icon: Github },
    { label: "Contributions Verified", value: "89,432", icon: CheckCircle2 },
    { label: "SBTs Minted", value: "456", icon: Award },
    { label: "On-Chain Anchors", value: "2,891", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Navigation */}
      <nav className="border-b border-pink-900/20 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              DotRep
            </span>
            <Badge variant="outline" className="ml-2 border-pink-500/50 text-pink-400">
              v2.0
            </Badge>
          </motion.div>
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link href="/leaderboard">
              <Button variant="ghost" className="text-gray-300 hover:text-white">
                Leaderboard
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                Launch App
              </Button>
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Badge variant="outline" className="mb-6 border-pink-500/50 text-pink-400 px-4 py-1">
            <Sparkles className="mr-2 h-3 w-3" />
            Powered by Polkadot Cloud & Substrate
          </Badge>
          <h1 className="mb-6 text-6xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Decentralized Reputation
            </span>
            <br />
            <span className="text-white">for Open Source Contributors</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-400">
            Verify, track, and showcase your open source contributions with cryptographic proofs, 
            on-chain anchoring, and Soul-Bound Tokens.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                <Github className="mr-2 h-5 w-5" />
                Connect GitHub
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              View Demo
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20 grid gap-6 md:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur">
                <CardContent className="pt-6 text-center">
                  <stat.icon className="mx-auto mb-3 h-8 w-8 text-pink-400" />
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Why Choose DotRep?
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Built on cutting-edge Web3 technology with production-ready features
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <Card className="h-full border-pink-900/30 bg-gray-900/50 backdrop-blur hover:border-pink-500/50 transition-colors">
                <CardContent className="pt-6">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${feature.color} bg-opacity-20`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Four simple steps to verifiable reputation
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-4">
          {[
            { step: "1", title: "Connect GitHub", description: "Link your GitHub account with wallet verification", icon: Github },
            { step: "2", title: "Contribute", description: "Make contributions tracked automatically via webhooks", icon: Zap },
            { step: "3", title: "Verify", description: "Contributions are verified and batched into Merkle proofs", icon: Shield },
            { step: "4", title: "Mint SBT", description: "Claim your on-chain reputation as a Soul-Bound Token", icon: Award },
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="text-center"
            >
              <div className="relative mb-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600">
                  <item.icon className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-pink-500 text-sm font-bold">
                  {item.step}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Card className="border-pink-900/30 bg-gradient-to-br from-pink-900/20 via-purple-900/20 to-indigo-900/20 backdrop-blur">
            <CardContent className="py-16 text-center">
              <h2 className="text-4xl font-bold text-white mb-4">
                Ready to Build Your Reputation?
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Join thousands of developers building verifiable on-chain reputation
              </p>
              <Link href="/dashboard">
                <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                  <Github className="mr-2 h-5 w-5" />
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold">DotRep</span>
              </div>
              <p className="text-sm text-gray-400">
                Decentralized reputation for open source contributors
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/dashboard"><a className="hover:text-white">Dashboard</a></Link></li>
                <li><Link href="/leaderboard"><a className="hover:text-white">Leaderboard</a></Link></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">GitHub</a></li>
                <li><a href="#" className="hover:text-white">Discord</a></li>
                <li><a href="#" className="hover:text-white">Twitter</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>© 2025 DotRep. Built with ❤️ for Polkadot Cloud Hackathon.</p>
            <p className="mt-2">v2.0.0 • Build {new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
