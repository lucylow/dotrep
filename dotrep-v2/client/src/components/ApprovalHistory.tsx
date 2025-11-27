/**
 * Approval History Component
 * 
 * Displays a history of all human approvals and rejections of AI agent actions.
 * Provides audit trail and learning insights.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentActionType } from "./HumanApprovalDialog";

export interface ApprovalHistoryEntry {
  id: string;
  actionId: string;
  type: AgentActionType;
  agentName: string;
  title: string;
  decision: "approved" | "rejected";
  timestamp: number;
  decisionTime: number; // Time taken to make decision (ms)
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  notes?: string;
  reason?: string;
}

interface ApprovalHistoryProps {
  history: ApprovalHistoryEntry[];
  onFilterChange?: (filter: "all" | "approved" | "rejected") => void;
}

export function ApprovalHistory({ history, onFilterChange }: ApprovalHistoryProps) {
  const approved = history.filter((h) => h.decision === "approved");
  const rejected = history.filter((h) => h.decision === "rejected");

  const avgDecisionTime =
    history.length > 0
      ? history.reduce((sum, h) => sum + h.decisionTime, 0) / history.length
      : 0;

  const approvalRate =
    history.length > 0 ? (approved.length / history.length) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Approval History
            </CardTitle>
            <CardDescription>Audit trail of human decisions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{history.length} total</Badge>
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20">
              {approved.length} approved
            </Badge>
            <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20">
              {rejected.length} rejected
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Approval Rate</p>
            <p className="text-2xl font-bold">{approvalRate.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Decision Time</p>
            <p className="text-2xl font-bold">
              {avgDecisionTime < 60000
                ? `${(avgDecisionTime / 1000).toFixed(0)}s`
                : `${(avgDecisionTime / 60000).toFixed(1)}m`}
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Actions</p>
            <p className="text-2xl font-bold">{history.length}</p>
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={(v) => onFilterChange?.(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({history.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <HistoryList entries={history} />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <HistoryList entries={approved} />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <HistoryList entries={rejected} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function HistoryList({ entries }: { entries: ApprovalHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-12 h-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No history entries</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "p-3 rounded-lg border transition-colors",
              entry.decision === "approved"
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {entry.decision === "approved" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <h4 className="font-medium text-sm">{entry.title}</h4>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  entry.riskLevel === "high" && "border-red-500",
                  entry.riskLevel === "medium" && "border-yellow-500",
                  entry.riskLevel === "low" && "border-green-500"
                )}
              >
                {entry.riskLevel}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <span>{entry.agentName}</span>
              <span>Confidence: {(entry.confidence * 100).toFixed(0)}%</span>
              <span>{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            {(entry.notes || entry.reason) && (
              <p className="text-xs text-muted-foreground mt-2">
                {entry.decision === "approved" ? "Notes: " : "Reason: "}
                {entry.notes || entry.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

