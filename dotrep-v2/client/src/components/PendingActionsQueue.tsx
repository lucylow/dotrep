/**
 * Pending Actions Queue Component
 * 
 * Displays all AI agent actions that are awaiting human approval.
 * Provides quick actions to approve/reject and shows status indicators.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Handshake,
  TrendingUp,
  Network,
  Shield,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingAction, AgentActionType } from "./HumanApprovalDialog";

interface PendingActionsQueueProps {
  actions: PendingAction[];
  onActionClick: (action: PendingAction) => void;
  onQuickApprove?: (actionId: string) => void;
  onQuickReject?: (actionId: string) => void;
  emptyMessage?: string;
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
  low: "border-green-500/50 bg-green-50 dark:bg-green-950/20",
  medium: "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20",
  high: "border-red-500/50 bg-red-50 dark:bg-red-950/20",
};

export function PendingActionsQueue({
  actions,
  onActionClick,
  onQuickApprove,
  onQuickReject,
  emptyMessage = "No pending actions",
}: PendingActionsQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Actions
          </CardTitle>
          <CardDescription>Actions awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Actions
            </CardTitle>
            <CardDescription>
              {actions.length} action{actions.length !== 1 ? "s" : ""} awaiting approval
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20">
            {actions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {actions.map((action) => {
              const Icon = actionIcons[action.type] || Info;
              const riskColor = riskColors[action.riskLevel];
              const isExpanded = expandedId === action.id;
              const timeAgo = getTimeAgo(action.timestamp);

              return (
                <Card
                  key={action.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    riskColor,
                    isExpanded && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : action.id);
                    onActionClick(action);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{action.title}</h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              action.riskLevel === "high" && "border-red-500 text-red-700",
                              action.riskLevel === "medium" && "border-yellow-500 text-yellow-700",
                              action.riskLevel === "low" && "border-green-500 text-green-700"
                            )}
                          >
                            {action.riskLevel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {action.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo}
                          </span>
                          <span>
                            Confidence: {(action.confidence * 100).toFixed(0)}%
                          </span>
                          {action.amount !== undefined && (
                            <span className="font-medium">
                              {action.amount} DOT
                            </span>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <div>
                              <p className="text-xs font-medium mb-1">Reasoning:</p>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {action.reasoning}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {onQuickReject && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickReject(action.id);
                                  }}
                                  className="flex-1"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              )}
                              {onQuickApprove && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickApprove(action.id);
                                  }}
                                  className="flex-1"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

