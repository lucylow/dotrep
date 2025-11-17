import { GitHubConnect } from "@/components/GitHubConnect";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";

export default function ConnectPage() {
  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold text-[#131313] mb-2">Connect GitHub</h1>
          <p className="text-[#4F4F4F] mb-8">
            Connect your GitHub account to start ingesting your contributions
          </p>
          <GitHubConnect />
        </div>
      </div>
    </UnifiedSidebar>
  );
}


