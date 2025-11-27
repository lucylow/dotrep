/**
 * Mock Mode Configuration
 * 
 * This module provides configuration for running the application in mock mode,
 * which allows the frontend to run standalone on Lovable with mock data
 * without requiring a full backend or blockchain connections.
 */

export interface MockConfig {
  enabled: boolean;
  useMockDatabase: boolean;
  useMockPolkadot: boolean;
  useMockDKG: boolean;
  useMockBlockchain: boolean;
}

/**
 * Get mock configuration from environment variables
 */
export function getMockConfig(): MockConfig {
  // Check if MOCK_MODE is explicitly set
  const mockModeEnv = process.env.MOCK_MODE;
  const isMockMode = mockModeEnv === 'true' || mockModeEnv === '1' || 
                     process.env.NODE_ENV === 'lovable' ||
                     process.env.VITE_MOCK_MODE === 'true';

  return {
    enabled: isMockMode,
    useMockDatabase: isMockMode || process.env.MOCK_DATABASE === 'true',
    useMockPolkadot: isMockMode || process.env.MOCK_POLKADOT === 'true',
    useMockDKG: isMockMode || process.env.MOCK_DKG === 'true',
    useMockBlockchain: isMockMode || process.env.MOCK_BLOCKCHAIN === 'true',
  };
}

/**
 * Check if mock mode is enabled
 */
export function isMockMode(): boolean {
  return getMockConfig().enabled;
}

/**
 * Get API base URL - returns mock server URL in mock mode
 */
export function getApiBaseUrl(): string {
  if (isMockMode()) {
    return process.env.MOCK_API_URL || 'http://localhost:3001';
  }
  return process.env.API_URL || 'http://localhost:3000';
}

