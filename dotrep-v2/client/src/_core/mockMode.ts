/**
 * Mock Mode Detection
 * 
 * Detects if the application is running in mock mode and provides utilities
 * for displaying mock mode indicators in the UI.
 */

/**
 * Check if mock mode is enabled
 */
export function isMockMode(): boolean {
  // Check environment variable (set by Vite)
  if (import.meta.env.VITE_MOCK_MODE === 'true') {
    return true;
  }
  
  // Check if we're in Lovable environment
  if (import.meta.env.MODE === 'lovable' || import.meta.env.VITE_LOVABLE === 'true') {
    return true;
  }
  
  // Check localStorage for manual override
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('mockMode');
    if (stored === 'true') {
      return true;
    }
  }
  
  return false;
}

/**
 * Get mock mode indicator text
 */
export function getMockModeIndicator(): string {
  return '🎭 Mock Mode';
}

/**
 * Set mock mode manually (for testing)
 */
export function setMockMode(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    if (enabled) {
      localStorage.setItem('mockMode', 'true');
    } else {
      localStorage.removeItem('mockMode');
    }
    // Reload page to apply changes
    window.location.reload();
  }
}

