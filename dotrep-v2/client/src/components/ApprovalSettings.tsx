/**
 * Approval Settings Component
 * 
 * Allows users to configure which agent actions require human approval
 * and set approval thresholds.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, RotateCcw } from "lucide-react";
import type { AgentActionType } from "./HumanApprovalDialog";

export interface ApprovalSettings {
  // Require approval for specific action types
  requireApprovalFor: Record<AgentActionType, boolean>;
  
  // Confidence threshold - actions below this require approval
  confidenceThreshold: number;
  
  // Risk level threshold - actions at or above this require approval
  riskLevelThreshold: "low" | "medium" | "high";
  
  // Amount threshold - transactions above this require approval
  amountThreshold: number;
  
  // Auto-approve low-risk actions after timeout (in minutes)
  autoApproveTimeout: number | null;
  
  // Require approval for first-time interactions
  requireApprovalForFirstInteraction: boolean;
  
  // Require approval for cross-chain operations
  requireApprovalForCrossChain: boolean;
}

export const defaultSettings: ApprovalSettings = {
  requireApprovalFor: {
    autonomous_transaction: true,
    contract_negotiation: true,
    campaign_optimization: false,
    cross_chain_operation: true,
    payment_execution: true,
    reputation_adjustment: true,
    sybil_action: true,
    other: true,
  },
  confidenceThreshold: 0.7,
  riskLevelThreshold: "medium",
  amountThreshold: 1000,
  autoApproveTimeout: null,
  requireApprovalForFirstInteraction: true,
  requireApprovalForCrossChain: true,
};

const actionTypeLabels: Record<AgentActionType, string> = {
  autonomous_transaction: "Autonomous Transactions",
  contract_negotiation: "Contract Negotiations",
  campaign_optimization: "Campaign Optimizations",
  cross_chain_operation: "Cross-Chain Operations",
  payment_execution: "Payment Executions",
  reputation_adjustment: "Reputation Adjustments",
  sybil_action: "Sybil Actions",
  other: "Other Actions",
};

interface ApprovalSettingsProps {
  settings: ApprovalSettings;
  onSettingsChange: (settings: ApprovalSettings) => void;
  onSave?: () => void;
}

export function ApprovalSettings({
  settings,
  onSettingsChange,
  onSave,
}: ApprovalSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ApprovalSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof ApprovalSettings>(
    key: K,
    value: ApprovalSettings[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(settings));
    onSettingsChange(newSettings);
  };

  const handleSave = () => {
    onSave?.();
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
    setHasChanges(true);
    onSettingsChange(defaultSettings);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Approval Settings
            </CardTitle>
            <CardDescription>
              Configure which actions require human approval
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            {hasChanges && (
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Type Requirements */}
        <div>
          <h3 className="text-sm font-medium mb-3">Action Type Requirements</h3>
          <div className="space-y-3">
            {Object.entries(actionTypeLabels).map(([type, label]) => (
              <div key={type} className="flex items-center justify-between">
                <Label htmlFor={`approval-${type}`} className="text-sm">
                  {label}
                </Label>
                <Switch
                  id={`approval-${type}`}
                  checked={localSettings.requireApprovalFor[type as AgentActionType]}
                  onCheckedChange={(checked) => {
                    updateSetting("requireApprovalFor", {
                      ...localSettings.requireApprovalFor,
                      [type]: checked,
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Thresholds */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Approval Thresholds</h3>

          {/* Confidence Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Confidence Threshold</Label>
              <span className="text-sm text-muted-foreground">
                {(localSettings.confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[localSettings.confidenceThreshold]}
              onValueChange={([value]) => updateSetting("confidenceThreshold", value)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Actions below this confidence require approval
            </p>
          </div>

          {/* Risk Level Threshold */}
          <div>
            <Label className="text-sm mb-2 block">Risk Level Threshold</Label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((level) => (
                <Button
                  key={level}
                  variant={
                    localSettings.riskLevelThreshold === level ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateSetting("riskLevelThreshold", level)}
                  className="flex-1"
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actions at or above this risk level require approval
            </p>
          </div>

          {/* Amount Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Amount Threshold (DOT)</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.amountThreshold} DOT
              </span>
            </div>
            <Slider
              value={[localSettings.amountThreshold]}
              onValueChange={([value]) => updateSetting("amountThreshold", value)}
              min={0}
              max={10000}
              step={100}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Transactions above this amount require approval
            </p>
          </div>
        </div>

        <Separator />

        {/* Additional Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Additional Settings</h3>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="first-interaction" className="text-sm">
                Require Approval for First Interaction
              </Label>
              <p className="text-xs text-muted-foreground">
                Always require approval for first-time interactions
              </p>
            </div>
            <Switch
              id="first-interaction"
              checked={localSettings.requireApprovalForFirstInteraction}
              onCheckedChange={(checked) =>
                updateSetting("requireApprovalForFirstInteraction", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cross-chain" className="text-sm">
                Require Approval for Cross-Chain Operations
              </Label>
              <p className="text-xs text-muted-foreground">
                Always require approval for cross-chain transactions
              </p>
            </div>
            <Switch
              id="cross-chain"
              checked={localSettings.requireApprovalForCrossChain}
              onCheckedChange={(checked) =>
                updateSetting("requireApprovalForCrossChain", checked)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

