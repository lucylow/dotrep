import { SBTMint } from "@/components/SBTMint";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";

export default function SbtMintPage() {
  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold text-[#131313] mb-2">SBT Mint</h1>
          <p className="text-[#4F4F4F] mb-8">
            Mint your Soul-Bound Token with your verified reputation score
          </p>
          <SBTMint />
        </div>
      </div>
    </UnifiedSidebar>
  );
}


