/**
 * Mock Mode Indicator
 * 
 * Displays a banner when the application is running in mock mode
 */

import { isMockMode, getMockModeIndicator } from "@/_core/mockMode";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export function MockModeIndicator() {
  if (!isMockMode()) {
    return null;
  }

  return (
    <Alert className="border-yellow-500/50 bg-yellow-500/10 mb-4">
      <InfoIcon className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="text-yellow-200">
        <strong>{getMockModeIndicator()}</strong> - All data is simulated. 
        No database or blockchain connections required.
      </AlertDescription>
    </Alert>
  );
}

