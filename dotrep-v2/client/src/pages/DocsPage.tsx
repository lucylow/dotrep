import { Card } from "@/components/ui/card";
import { Shield, Book, Code2, Database, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7FF] to-white">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-extrabold text-[#131313] mb-4">Documentation</h1>
          <p className="text-xl text-[#4F4F4F] mb-12">
            Complete technical reference for DotRep's decentralized reputation system
          </p>

          {/* Getting Started */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Book className="w-8 h-8 text-[#6C3CF0]" />
              <h2 className="text-3xl font-extrabold text-[#131313]">Getting Started</h2>
            </div>
            <Card className="p-8 rounded-2xl border-2 border-gray-100">
              <h3 className="text-xl font-bold text-[#131313] mb-4">Quick Start</h3>
              <ol className="space-y-3 text-[#4F4F4F]">
                <li><strong>1. Connect GitHub:</strong> Navigate to /connect and authorize via OAuth</li>
                <li><strong>2. Sync Contributions:</strong> We'll crawl your repos using GraphQL API</li>
                <li><strong>3. Verify Proofs:</strong> Check /proof-explorer to see Merkle trees</li>
                <li><strong>4. Mint SBT:</strong> Claim your Soul-Bound Token at /sbt-mint</li>
              </ol>
            </Card>
          </section>

          {/* Canonical JSON Schema */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Code2 className="w-8 h-8 text-[#6C3CF0]" />
              <h2 className="text-3xl font-extrabold text-[#131313]">Canonical JSON Schema</h2>
            </div>
            <Card className="p-8 rounded-2xl border-2 border-gray-100">
              <p className="text-[#4F4F4F] mb-4">
                All GitHub contributions are normalized to this canonical format before hashing:
              </p>
              <pre className="bg-[#131313] text-[#3DD68C] p-6 rounded-xl overflow-x-auto font-mono text-sm">
{`{
  "contributor_id": "github:123456",
  "contribution_type": "commit",
  "repo": "polkadot/polkadot-sdk",
  "timestamp": "2025-11-16T12:00:00Z",
  "sha": "abc123def456",
  "metadata": {
    "title": "Add runtime feature",
    "additions": 150,
    "deletions": 20
  }
}`}
              </pre>
            </Card>
          </section>

          {/* Merkle Proof Format */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-8 h-8 text-[#6C3CF0]" />
              <h2 className="text-3xl font-extrabold text-[#131313]">Merkle Proof Format</h2>
            </div>
            <Card className="p-8 rounded-2xl border-2 border-gray-100">
              <p className="text-[#4F4F4F] mb-4">
                Contributions are batched into Merkle trees. Each proof contains:
              </p>
              <ul className="space-y-2 text-[#4F4F4F] mb-4">
                <li>• <strong>Leaf Hash:</strong> SHA-256 of canonical JSON</li>
                <li>• <strong>Proof Path:</strong> Array of sibling hashes</li>
                <li>• <strong>Merkle Root:</strong> Final root hash</li>
                <li>• <strong>Index:</strong> Position in tree</li>
              </ul>
              <pre className="bg-[#131313] text-[#3DD68C] p-6 rounded-xl overflow-x-auto font-mono text-sm">
{`{
  "leaf": "0x1234...abcd",
  "proof": [
    "0xabcd...1234",
    "0x5678...efgh"
  ],
  "root": "0x9876...5432",
  "index": 42
}`}
              </pre>
            </Card>
          </section>

          {/* API Reference */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-8 h-8 text-[#6C3CF0]" />
              <h2 className="text-3xl font-extrabold text-[#131313]">API Reference</h2>
            </div>
            <Card className="p-8 rounded-2xl border-2 border-gray-100">
              <h3 className="text-xl font-bold text-[#131313] mb-4">tRPC Endpoints</h3>
              <div className="space-y-4">
                <div>
                  <code className="bg-[#FBF9FF] px-3 py-1 rounded text-[#6C3CF0] font-mono">
                    contributor.getByGithubUsername
                  </code>
                  <p className="text-sm text-[#4F4F4F] mt-2">Get contributor by GitHub username</p>
                </div>
                <div>
                  <code className="bg-[#FBF9FF] px-3 py-1 rounded text-[#6C3CF0] font-mono">
                    contribution.getByContributor
                  </code>
                  <p className="text-sm text-[#4F4F4F] mt-2">List all contributions for a contributor</p>
                </div>
                <div>
                  <code className="bg-[#FBF9FF] px-3 py-1 rounded text-[#6C3CF0] font-mono">
                    anchor.getRecent
                  </code>
                  <p className="text-sm text-[#4F4F4F] mt-2">Get recent on-chain anchors</p>
                </div>
              </div>
            </Card>
          </section>

          {/* Substrate Pallet */}
          <section className="mb-12">
            <h2 className="text-3xl font-extrabold text-[#131313] mb-6">Substrate Pallet Extrinsics</h2>
            <Card className="p-8 rounded-2xl border-2 border-gray-100">
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-[#131313] mb-2">submit_proof</h4>
                  <p className="text-[#4F4F4F] mb-3">Submit a Merkle root to the chain</p>
                  <pre className="bg-[#131313] text-[#3DD68C] p-4 rounded-xl font-mono text-sm">
{`api.tx.dotRep.submitProof(merkleRoot, daCid)`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-bold text-[#131313] mb-2">update_reputation</h4>
                  <p className="text-[#4F4F4F] mb-3">Update contributor reputation score</p>
                  <pre className="bg-[#131313] text-[#3DD68C] p-4 rounded-xl font-mono text-sm">
{`api.tx.dotRep.updateReputation(contributor, score)`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-bold text-[#131313] mb-2">finalize_anchor</h4>
                  <p className="text-[#4F4F4F] mb-3">Finalize an anchor after verification</p>
                  <pre className="bg-[#131313] text-[#3DD68C] p-4 rounded-xl font-mono text-sm">
{`api.tx.dotRep.finalizeAnchor(anchorId)`}
                  </pre>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

