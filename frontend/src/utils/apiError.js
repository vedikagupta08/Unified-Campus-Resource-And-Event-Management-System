/**
 * User-friendly message when an API request fails.
 * Detects connection refused / network errors and suggests starting the backend.
 */
export function apiErrorMessage(err, fallback = 'Request failed') {
  if (!err.response && (err.code === 'ERR_NETWORK' || err.message?.includes('Network')))
    return 'Cannot reach server. Start the backend: cd backend && npm run dev';
  return err.response?.data?.error || fallback;
}
