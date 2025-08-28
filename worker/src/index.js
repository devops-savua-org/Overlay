import {
  handlePlayerCreate,
  handlePlayerList,
  handlePlayerDelete,
  handlePlayerPing,
  handleOverlayUploadUrl,
  handleOverlayCreate,
  handleOverlayList,
  handleOverlayUpdate,
  handleOverlayDelete,
} from './handlers.js';
import { jsonResponse } from './utils.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight handling
    if (method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Simple router
    if (method === 'POST' && path === '/api/players') {
      return handlePlayerCreate(request, env);
    }
    if (method === 'GET' && path === '/api/players') {
      return handlePlayerList(request, env);
    }
    if (method === 'DELETE' && path.startsWith('/api/players/')) {
      return handlePlayerDelete(request, env);
    }
    if (method === 'POST' && path.includes('/ping')) {
      return handlePlayerPing(request, env);
    }
    if (method === 'POST' && path === '/api/overlays/upload-url') {
      return handleOverlayUploadUrl(request, env);
    }
    if (method === 'GET' && path.includes('/overlays')) {
      return handleOverlayList(request, env);
    }
    if (method === 'POST' && path.includes('/overlays')) {
      return handleOverlayCreate(request, env);
    }
    if (method === 'PUT' && path.includes('/overlays/')) {
      return handleOverlayUpdate(request, env);
    }
    if (method === 'DELETE' && path.includes('/overlays/')) {
      return handleOverlayDelete(request, env);
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  },
};

function handleOptions(request) {
  const headers = request.headers;
  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS preflight requests.
    const respHeaders = {
      'Access-Control-Allow-Origin': '*', // Be more restrictive in production
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
    return new Response(null, { headers: respHeaders });
  }

  // Handle standard OPTIONS request.
  return new Response(null, {
    headers: { Allow: 'GET, POST, PUT, DELETE, OPTIONS' },
  });
}
