import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Shield, GitBranch, Award, Zap, CheckCircle2, ArrowRight, Github, Database, Lock } from "lucide-react";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7FF] to-white">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-[#6C3CF0]" />
            <span className="text-2xl font-extrabold text-[#131313]">DotRep</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs">
              <a className="text-[#4F4F4F] hover:text-[#6C3CF0] font-medium transition-colors">Docs</a>
            </Link>
            <Link href="/reputation">
              <a className="text-[#4F4F4F] hover:text-[#6C3CF0] font-medium transition-colors">Reputation</a>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF] text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Launch App <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-6 px-6 py-2 bg-[#FBF9FF] border border-[#C8B5FF] rounded-full text-[#6C3CF0] font-semibold"
          >
            ⚡ Powered by Polkadot Cloud & Substrate
          </motion.div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold text-[#131313] mb-6 leading-tight">
            Decentralized Reputation<br />
            <span className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF] bg-clip-text text-transparent">
              for Open Source Contributors
            </span>
          </h1>
          
          <p className="text-xl text-[#4F4F4F] mb-8 max-w-2xl mx-auto">
            Verify, track, and showcase your open source contributions with cryptographic proofs, on-chain anchoring, and Soul-Bound Tokens.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF] text-white rounded-xl px-8 py-6 text-lg shadow-[0_4px_24px_rgba(108,60,240,0.3)] hover:shadow-[0_8px_32px_rgba(108,60,240,0.4)] transition-all hover:scale-105">
                <Github className="mr-2" /> Connect GitHub
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="rounded-xl px-8 py-6 text-lg border-2 border-[#6C3CF0] text-[#6C3CF0] hover:bg-[#FBF9FF]">
                View Documentation
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto"
        >
          {[
            { label: "Contributors", value: "1,247", icon: Shield },
            { label: "Contributions Verified", value: "89,432", icon: CheckCircle2 },
            { label: "SBTs Minted", value: "456", icon: Award },
            { label: "On-Chain Anchors", value: "2,891", icon: Database },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-100"
            >
              <stat.icon className="w-8 h-8 text-[#6C3CF0] mb-3" />
              <div className="text-3xl font-extrabold text-[#131313] font-mono">{stat.value}</div>
              <div className="text-sm text-[#4F4F4F] mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-extrabold text-center text-[#131313] mb-4">How DotRep Works</h2>
        <p className="text-center text-[#4F4F4F] mb-12 max-w-2xl mx-auto">
          From GitHub activity to on-chain proof in three simple steps
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              step: "01",
              title: "Ingest GitHub Data",
              description: "Connect your GitHub account via OAuth. We crawl your contributions using GraphQL API with anti-abuse detection.",
              icon: Github,
              color: "#6C3CF0"
            },
            {
              step: "02",
              title: "Canonicalize + Merkle Tree",
              description: "Contributions are canonicalized to JSON, batched into Merkle trees, and pinned to Polkadot Cloud DA.",
              icon: GitBranch,
              color: "#A074FF"
            },
            {
              step: "03",
              title: "Anchor On-Chain",
              description: "Merkle roots are anchored on-chain via our custom Substrate pallet. Mint your Soul-Bound Token!",
              icon: Lock,
              color: "#C8B5FF"
            },
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 rounded-2xl border-2 border-gray-100 hover:border-[#C8B5FF] transition-all hover:shadow-[0_8px_32px_rgba(108,60,240,0.15)]">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center mb-6 shadow-lg">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-sm font-mono text-[#6C3CF0] font-bold mb-2">STEP {step.step}</div>
                <h3 className="text-2xl font-extrabold text-[#131313] mb-3">{step.title}</h3>
                <p className="text-[#4F4F4F] leading-relaxed">{step.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-b from-white to-[#FBF9FF]">
        <h2 className="text-4xl font-extrabold text-center text-[#131313] mb-12">System Architecture</h2>
        
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { title: "GitHub API", subtitle: "OAuth + GraphQL", icon: Github },
              { title: "Polkadot Cloud DA", subtitle: "Data Availability", icon: Database },
              { title: "Substrate Pallet", subtitle: "On-Chain Anchoring", icon: Lock },
              { title: "Soul-Bound Token", subtitle: "NFT Reputation", icon: Award },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                className="bg-white rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)] border-2 border-gray-100 text-center"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center mb-4">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-extrabold text-[#131313] mb-1">{item.title}</h4>
                <p className="text-sm text-[#4F4F4F]">{item.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-extrabold text-center text-[#131313] mb-12">Powerful Features</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { title: "GitHub Signals", desc: "Real-time contribution tracking", icon: Github },
            { title: "AI Scoring", desc: "Multi-dimensional reputation", icon: Zap },
            { title: "Proof Explorer", desc: "Verify cryptographic proofs", icon: Shield },
            { title: "SBT Minting", desc: "Non-transferable NFTs", icon: Award },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-100"
            >
              <feature.icon className="w-10 h-10 text-[#6C3CF0] mb-4" />
              <h4 className="font-extrabold text-[#131313] mb-2">{feature.title}</h4>
              <p className="text-sm text-[#4F4F4F]">{feature.desc}</p>
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
          className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF] rounded-3xl p-12 text-center shadow-[0_8px_32px_rgba(108,60,240,0.3)]"
        >
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to Build Your Reputation?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of developers already verifying their contributions on-chain
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-white text-[#6C3CF0] rounded-xl px-8 py-6 text-lg font-bold hover:bg-gray-50 shadow-lg hover:scale-105 transition-all">
              Get Started Now <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-[#6C3CF0]" />
                <span className="text-xl font-extrabold text-[#131313]">DotRep</span>
              </div>
              <p className="text-sm text-[#4F4F4F]">
                Decentralized reputation for open source contributors
              </p>
            </div>
            <div>
              <h5 className="font-bold text-[#131313] mb-3">Product</h5>
              <div className="space-y-2">
                <Link href="/dashboard"><a className="block text-sm text-[#4F4F4F] hover:text-[#6C3CF0]">Dashboard</a></Link>
                <Link href="/reputation"><a className="block text-sm text-[#4F4F4F] hover:text-[#6C3CF0]">Reputation</a></Link>
                <Link href="/proof-explorer"><a className="block text-sm text-[#4F4F4F] hover:text-[#6C3CF0]">Proof Explorer</a></Link>
              </div>
            </div>
            <div>
              <h5 className="font-bold text-[#131313] mb-3">Resources</h5>
              <div className="space-y-2">
                <Link href="/docs"><a className="block text-sm text-[#4F4F4F] hover:text-[#6C3CF0]">Documentation</a></Link>
                <a href="https://github.com" className="block text-sm text-[#4F4F4F] hover:text-[#6C3CF0]">GitHub</a>
                <a href="https://discord.com" className="block text-sm text-[#4F4F4F] hover:text-[#6C3CF0]">Discord</a>
              </div>
            </div>
            <div>
              <h5 className="font-bold text-[#131313] mb-3">Legal</h5>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-[#4F4F4F] hover:text-[#6C3CF0]">Privacy Policy</a>
                <a href="#" className="block text-sm text-[#4F4F4F] hover:text-[#6C3CF0]">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-[#4F4F4F]">
            © 2025 DotRep. Built with ❤️ for Polkadot Cloud Hackathon | v2.0.0
          </div>
        </div>
      </footer>
    </div>
  );
}
