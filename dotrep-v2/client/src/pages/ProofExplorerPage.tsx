import { ProofExplorer } from "@/components/ProofExplorer";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";

export default function ProofExplorerPage() {
  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-extrabold text-[#131313] mb-2">Proof Explorer</h1>
          <p className="text-[#4F4F4F] mb-8">
            Explore and verify cryptographic proofs of your contributions
          </p>
          <ProofExplorer />
        </div>
      </div>
    </UnifiedSidebar>
  );
}


