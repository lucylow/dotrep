import { useState, useCallback, useRef, useEffect } from "react";
import { 
  DotRepWalletConnection, 
  ConnectionOptions, 
  WalletConnectionResult 
} from "../wallet/DotRepWalletConnection";
import { toast } from "sonner";

export interface UseDotRepWalletOptions {
  wsEndpoint?: string;
  onConnect?: (result: WalletConnectionResult) => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

export interface UseDotRepWalletReturn {
  connect: (options?: ConnectionOptions) => Promise<WalletConnectionResult | null>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
  isConnected: boolean;
  connectionResult: WalletConnectionResult | null;
  error: Error | null;
}

/**
 * React hook for DotRep wallet connection with reputation
 */
export function useDotRepWallet(options: UseDotRepWalletOptions = {}): UseDotRepWalletReturn {
  const {
    wsEndpoint = import.meta.env.VITE_POLKADOT_WS_ENDPOINT || "ws://127.0.0.1:9944",
    onConnect,
    onError,
    autoConnect = false
  } = options;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionResult, setConnectionResult] = useState<WalletConnectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const walletConnectionRef = useRef<DotRepWalletConnection | null>(null);
  
  useEffect(() => {
    if (!walletConnectionRef.current) {
      walletConnectionRef.current = new DotRepWalletConnection(wsEndpoint);
    }
    return () => {
      walletConnectionRef.current?.disconnect();
      walletConnectionRef.current = null;
    };
  }, [wsEndpoint]);

  const connect = useCallback(async (connectionOptions?: ConnectionOptions): Promise<WalletConnectionResult | null> => {
    if (!walletConnectionRef.current) {
      const error = new Error("Wallet connection not initialized");
      setError(error);
      onError?.(error);
      return null;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const result = await walletConnectionRef.current.connectWithReputation(connectionOptions);
      
      setConnectionResult(result);
      setIsConnected(true);
      onConnect?.(result);

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      toast.error(`Connection failed: ${error.message}`);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [onConnect, onError]);

  const disconnect = useCallback(async () => {
    if (!walletConnectionRef.current) {
      return;
    }

    try {
      await walletConnectionRef.current.disconnect();
      setConnectionResult(null);
      setIsConnected(false);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      toast.error(`Disconnect failed: ${error.message}`);
    }
  }, []);

  return {
    connect,
    disconnect,
    isConnecting,
    isConnected,
    connectionResult,
    error
  };
}


