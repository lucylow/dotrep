/**
 * Human Approval Dialog Component
 * 
 * Provides a comprehensive interface for reviewing and approving/rejecting
 * AI agent actions that require human oversight.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Shield,
  Zap,
  Network,
  Handshake,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentActionType =
  | "autonomous_transaction"
  | "contract_negotiation"
  | "campaign_optimization"
  | "cross_chain_operation"
  | "payment_execution"
  | "reputation_adjustment"
  | "sybil_action"
  | "other";

export interface PendingAction {
  id: string;
  type: AgentActionType;
  agentName: string;
  title: string;
  description: string;
  details: Record<string, any>;
  reasoning: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  timestamp: number;
  estimatedImpact?: number;
  affectedAccounts?: string[];
  amount?: number;
  chain?: string;
}

interface HumanApprovalDialogProps {
  action: PendingAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (actionId: string, notes?: string) => void;
  onReject: (actionId: string, reason?: string) => void;
  isLoading?: boolean;
}

const actionIcons: Record<AgentActionType, React.ElementType> = {
  autonomous_transaction: Zap,
  contract_negotiation: Handshake,
  campaign_optimization: TrendingUp,
  cross_chain_operation: Network,
  payment_execution: Zap,
  reputation_adjustment: Shield,
  sybil_action: Shield,
  other: Info,
};

const riskColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function HumanApprovalDialog({
  action,
  open,
  onOpenChange,
  onApprove,
  onReject,
  isLoading = false,
}: HumanApprovalDialogProps) {
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  if (!action) return null;

  const Icon = actionIcons[action.type] || Info;
  const riskColor = riskColors[action.riskLevel];

  const handleApprove = () => {
    onApprove(action.id, approvalNotes);
    setApprovalNotes("");
  };

  const handleReject = () => {
    onReject(action.id, rejectionReason);
    setRejectionReason("");
  };

  const formatDetails = (details: Record<string, any>): string[] => {
    return Object.entries(details)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (typeof value === "object") {
          return `${key}: ${JSON.stringify(value, null, 2)}`;
        }
        return `${key}: ${value}`;
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{action.title}</DialogTitle>
              <DialogDescription className="mt-1">
                Action requires your approval before execution
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Agent Info */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Agent</p>
                <p className="text-sm text-muted-foreground">{action.agentName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Confidence</p>
                <p className="text-sm text-muted-foreground">
                  {(action.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Risk Assessment</span>
                <Badge className={cn(riskColor)}>{action.riskLevel.toUpperCase()}</Badge>
              </div>
              {action.estimatedImpact !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  Estimated Impact: {(action.estimatedImpact * 100).toFixed(1)}%
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </div>

            {/* Reasoning */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Agent Reasoning
              </h4>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{action.reasoning}</p>
              </div>
            </div>

            {/* Action Details */}
            {Object.keys(action.details).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Action Details</h4>
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  {formatDetails(action.details).map((detail, idx) => (
                    <p key={idx} className="text-sm font-mono text-xs">
                      {detail}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="space-y-2">
              {action.amount !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{action.amount} DOT</span>
                </div>
              )}
              {action.chain && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Chain:</span>
                  <span className="font-medium">{action.chain}</span>
                </div>
              )}
              {action.affectedAccounts && action.affectedAccounts.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Affected Accounts:</span>
                  <div className="mt-1 space-y-1">
                    {action.affectedAccounts.map((account, idx) => (
                      <Badge key={idx} variant="outline" className="mr-1 text-xs">
                        {account.slice(0, 8)}...{account.slice(-6)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Requested:</span>
                <span className="font-medium">
                  {new Date(action.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>This action will be executed upon approval</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isLoading}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex-1"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isLoading ? "Processing..." : "Approve"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

