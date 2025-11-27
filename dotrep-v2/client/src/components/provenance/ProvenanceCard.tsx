/**
 * Provenance Card Component
 * 
 * Displays verifiable provenance information for a Knowledge Asset
 * including content hash, signature, creator DID, and audit trail.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Copy, ExternalLink, Shield, Hash, Signature, Clock, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProvenanceData {
  ual: string;
  creatorDID: string;
  published: string;
  contentHash: {
    provided: string;
    computed: string;
    match: boolean;
  };
  signature: {
    present: boolean;
    valid: boolean;
  };
  provenance?: {
    computedBy?: string;
    method?: string;
    sourceAssets?: string[];
    previousVersion?: string;
  };
  onChainAnchor?: {
    present: boolean;
    blockNumber?: number;
    transactionHash?: string;
  };
  overall: {
    valid: boolean;
    score: number;
    issues?: string[];
  };
}

interface ProvenanceCardProps {
  data: ProvenanceData;
  onCopy?: (text: string) => void;
  showDetails?: boolean;
}

export function ProvenanceCard({ data, onCopy, showDetails = true }: ProvenanceCardProps) {
  const copyToClipboard = (text: string) => {
    if (onCopy) {
      onCopy(text);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const formatHash = (hash: string) => {
    if (hash.length > 16) {
      return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    }
    return hash;
  };

  const formatDID = (did: string) => {
    if (did.length > 30) {
      return `${did.substring(0, 15)}...${did.substring(did.length - 10)}`;
    }
    return did;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#6C3CF0]" />
              Provenance Verification
            </CardTitle>
            <CardDescription className="mt-1">
              Verifiable data, clear authorship, and auditability
            </CardDescription>
          </div>
          <Badge 
            variant={data.overall.valid ? "default" : "destructive"}
            className={data.overall.valid ? "bg-green-500" : ""}
          >
            {data.overall.valid ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verified
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Invalid
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Verification Score</div>
            <div className="text-3xl font-bold text-[#6C3CF0]">
              {data.overall.score}/100
            </div>
          </div>
          {data.overall.issues && data.overall.issues.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Issues</div>
              <div className="text-lg font-semibold text-red-600">
                {data.overall.issues.length}
              </div>
            </div>
          )}
        </div>

        {/* UAL */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LinkIcon className="w-4 h-4 text-muted-foreground" />
            UAL (Uniform Asset Locator)
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <code className="text-xs flex-1 font-mono">{data.ual}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(data.ual)}
              className="h-6 w-6 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Creator DID */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Creator DID
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <code className="text-xs flex-1 font-mono">{formatDID(data.creatorDID)}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(data.creatorDID)}
              className="h-6 w-6 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Timestamp */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Published
          </div>
          <div className="p-2 bg-muted rounded-md text-sm">
            {new Date(data.published).toLocaleString()}
          </div>
        </div>

        {/* Content Hash */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Hash className="w-4 h-4 text-muted-foreground" />
            Content Hash
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <code className="text-xs flex-1 font-mono">{formatHash(data.contentHash.provided)}</code>
              {data.contentHash.match ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            {!data.contentHash.match && (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />
                Hash mismatch - content may have been tampered with
              </div>
            )}
          </div>
        </div>

        {/* Signature */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Signature className="w-4 h-4 text-muted-foreground" />
            Signature
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            {data.signature.present ? (
              <>
                {data.signature.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Valid signature</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">Invalid signature</span>
                  </>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-600">No signature found</span>
              </>
            )}
          </div>
        </div>

        {/* Provenance Information */}
        {data.provenance && showDetails && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-medium mb-2">Provenance</div>
            {data.provenance.computedBy && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Computed by:</span> {data.provenance.computedBy}
              </div>
            )}
            {data.provenance.method && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Method:</span> {data.provenance.method}
              </div>
            )}
            {data.provenance.sourceAssets && data.provenance.sourceAssets.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Source assets:</span> {data.provenance.sourceAssets.length}
              </div>
            )}
            {data.provenance.previousVersion && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Previous version:</span>{' '}
                <code className="font-mono">{formatHash(data.provenance.previousVersion)}</code>
              </div>
            )}
          </div>
        )}

        {/* On-Chain Anchor */}
        {data.onChainAnchor && data.onChainAnchor.present && showDetails && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              On-Chain Anchor
            </div>
            <div className="space-y-1 text-xs">
              {data.onChainAnchor.blockNumber && (
                <div className="text-muted-foreground">
                  Block: {data.onChainAnchor.blockNumber.toLocaleString()}
                </div>
              )}
              {data.onChainAnchor.transactionHash && (
                <div className="flex items-center gap-2">
                  <code className="font-mono flex-1">{formatHash(data.onChainAnchor.transactionHash)}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(data.onChainAnchor!.transactionHash!)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Issues List */}
        {data.overall.issues && data.overall.issues.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-sm font-medium mb-2 text-red-600">Issues Found</div>
            <ul className="space-y-1">
              {data.overall.issues.map((issue, index) => (
                <li key={index} className="text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

