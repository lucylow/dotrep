import { TelemetryDashboard } from "@/components/TelemetryDashboard";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";

export default function TelemetryPage() {
  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-extrabold text-[#131313] mb-2">Telemetry & Metrics</h1>
          <p className="text-[#4F4F4F] mb-8">
            Real-time system metrics and operational insights
          </p>
          <TelemetryDashboard />
        </div>
      </div>
    </UnifiedSidebar>
  );
}


