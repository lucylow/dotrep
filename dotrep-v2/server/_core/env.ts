export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  onfinalityApiKey: process.env.ONFINALITY_API_KEY ?? "",
};

/**
 * Build OnFinality WebSocket endpoint from API key
 */
export function getOnFinalityWsEndpoint(): string {
  const apiKey = ENV.onfinalityApiKey;
  if (!apiKey) {
    // Fallback to direct endpoint if API key not set
    return process.env.POLKADOT_WS_ENDPOINT || "ws://127.0.0.1:9944";
  }
  return `wss://polkadot.api.onfinality.io/ws?apikey=${apiKey}`;
}

/**
 * Build OnFinality HTTP RPC endpoint from API key
 */
export function getOnFinalityHttpEndpoint(): string {
  const apiKey = ENV.onfinalityApiKey;
  if (!apiKey) {
    // Fallback to direct endpoint if API key not set
    return process.env.POLKADOT_HTTP_ENDPOINT || "http://127.0.0.1:9933";
  }
  return `https://polkadot.api.onfinality.io/rpc?apikey=${apiKey}`;
}
