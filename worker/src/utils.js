export function jsonResponse(data, status = 200, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Be more restrictive in production
  };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...defaultHeaders, ...headers },
  });
}

export function generatePairingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
