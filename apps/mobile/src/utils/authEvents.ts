/**
 * Auth Events Utility
 * 
 * Provides an event mechanism to bridge non-React files (apiClient.ts, apollo.ts)
 * to the React Navigation/Auth Context.
 */

type AuthCallback = () => void;
let onUnauthorizedCallback: AuthCallback | null = null;

/**
 * Register a listener to be called when an API returns 401 Unauthorized
 */
export const setOnUnauthorized = (cb: AuthCallback) => {
  onUnauthorizedCallback = cb;
};

/**
 * Trigger the registered callback to logout/redirect the user
 */
export const triggerUnauthorized = () => {
  if (onUnauthorizedCallback) {
    onUnauthorizedCallback();
  }
};
