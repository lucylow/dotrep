import { useState, useCallback } from "react";
import { web3FromAddress } from "@polkadot/extension-dapp";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { toast } from "sonner";

export interface TransactionResult {
  hash: string;
  status: "pending" | "included" | "finalized" | "failed";
  blockNumber?: number;
  error?: string;
}

export interface UsePolkadotTransactionsOptions {
  wsEndpoint?: string;
  onTransactionStatus?: (result: TransactionResult) => void;
}

/**
 * Hook for handling Polkadot transactions with signing
 */
export function usePolkadotTransactions(options: UsePolkadotTransactionsOptions = {}) {
  const { wsEndpoint = import.meta.env.VITE_POLKADOT_WS_ENDPOINT || "ws://127.0.0.1:9944" } = options;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [api, setApi] = useState<ApiPromise | null>(null);

  // Initialize API connection
  const initializeApi = useCallback(async (): Promise<ApiPromise> => {
    if (api) return api;

    try {
      const provider = new WsProvider(wsEndpoint);
      const polkadotApi = await ApiPromise.create({ provider });
      await polkadotApi.isReady;
      setApi(polkadotApi);
      return polkadotApi;
    } catch (error) {
      console.error("[usePolkadotTransactions] Failed to connect:", error);
      throw error;
    }
  }, [wsEndpoint, api]);

  /**
   * Sign and submit a transaction
   */
  const signAndSend = useCallback(async (
    accountId: string,
    tx: any,
    onStatusUpdate?: (status: TransactionResult) => void
  ): Promise<TransactionResult> => {
    setIsSubmitting(true);
    let unsubscribe: (() => void) | null = null;

    try {
      const polkadotApi = await initializeApi();

      // Get signer from extension
      const injector = await web3FromAddress(accountId);
      
      // Subscribe to transaction status
      unsubscribe = await tx.signAndSend(
        accountId,
        { signer: injector.signer },
        ({ status, txHash, dispatchError }: any) => {
          const result: TransactionResult = {
            hash: txHash.toString(),
            status: status.type as TransactionResult["status"],
            blockNumber: status.isInBlock ? status.asInBlock.toNumber() : undefined,
            error: dispatchError ? dispatchError.toString() : undefined
          };

          if (status.isInBlock) {
            result.status = "included";
            toast.success(`Transaction included in block ${result.blockNumber}`);
          }

          if (status.isFinalized) {
            result.status = "finalized";
            toast.success("Transaction finalized!");
            if (unsubscribe) unsubscribe();
          }

          if (dispatchError) {
            result.status = "failed";
            toast.error(`Transaction failed: ${result.error}`);
            if (unsubscribe) unsubscribe();
          }

          onStatusUpdate?.(result);
          options.onTransactionStatus?.(result);
        }
      );

      // Return initial result
      return {
        hash: tx.hash.toString(),
        status: "pending"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Transaction failed: ${errorMessage}`);
      
      return {
        hash: "",
        status: "failed",
        error: errorMessage
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [initializeApi, options]);

  /**
   * Submit a contribution
   */
  const submitContribution = useCallback(async (
    accountId: string,
    proof: string,
    contributionType: string,
    weight: number,
    source: string
  ): Promise<TransactionResult> => {
    try {
      const polkadotApi = await initializeApi();
      const tx = polkadotApi.tx.reputation.addContribution(
        proof,
        contributionType,
        weight,
        source
      );

      return await signAndSend(accountId, tx);
    } catch (error) {
      throw error;
    }
  }, [initializeApi, signAndSend]);

  /**
   * Verify a contribution
   */
  const verifyContribution = useCallback(async (
    accountId: string,
    contributor: string,
    contributionId: number,
    score: number,
    comment: string
  ): Promise<TransactionResult> => {
    try {
      const polkadotApi = await initializeApi();
      const tx = polkadotApi.tx.reputation.verifyContribution(
        contributor,
        contributionId,
        score,
        comment
      );

      return await signAndSend(accountId, tx);
    } catch (error) {
      throw error;
    }
  }, [initializeApi, signAndSend]);

  /**
   * Vote on a governance proposal
   */
  const voteOnProposal = useCallback(async (
    accountId: string,
    proposalId: number,
    vote: boolean,
    conviction: number = 0
  ): Promise<TransactionResult> => {
    try {
      const polkadotApi = await initializeApi();
      const tx = polkadotApi.tx.governance.vote(
        proposalId,
        vote,
        conviction
      );

      return await signAndSend(accountId, tx);
    } catch (error) {
      throw error;
    }
  }, [initializeApi, signAndSend]);

  /**
   * Create a governance proposal
   */
  const createProposal = useCallback(async (
    accountId: string,
    title: string,
    description: string,
    proposalType: "parameter" | "upgrade" | "general",
    parameters: Record<string, any>
  ): Promise<TransactionResult> => {
    try {
      const polkadotApi = await initializeApi();
      
      let tx;
      if (proposalType === "parameter") {
        tx = polkadotApi.tx.reputation.updateAlgorithmParams(parameters);
      } else if (proposalType === "upgrade") {
        tx = polkadotApi.tx.governance.createUpgradeProposal(description, parameters);
      } else {
        tx = polkadotApi.tx.governance.createProposal(title, description, parameters);
      }

      return await signAndSend(accountId, tx);
    } catch (error) {
      throw error;
    }
  }, [initializeApi, signAndSend]);

  /**
   * Initiate XCM query
   */
  const initiateXcmQuery = useCallback(async (
    accountId: string,
    targetChain: string,
    targetAccount: string
  ): Promise<TransactionResult> => {
    try {
      const polkadotApi = await initializeApi();
      const tx = polkadotApi.tx.reputation.initiateReputationQuery(
        targetChain,
        targetAccount
      );

      return await signAndSend(accountId, tx);
    } catch (error) {
      throw error;
    }
  }, [initializeApi, signAndSend]);

  return {
    isSubmitting,
    signAndSend,
    submitContribution,
    verifyContribution,
    voteOnProposal,
    createProposal,
    initiateXcmQuery,
    api
  };
}


