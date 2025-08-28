import { state } from './state.js';

// IMPORTANT: Replace with your deployed Worker URL in production
const API_HOST = 'http://127.0.0.1:8787';

async function request(endpoint, options = {}) {
  const url = `${API_HOST}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error);
  }
  
  return response.json();
}

export const api = {
  getPlayers: () => request('/api/players'),
  createPlayer: (name) => request('/api/players', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  deletePlayer: (id) => request(`/api/players/${id}`, { method: 'DELETE' }),
  
  getOverlays: (playerId) => request(`/api/players/${playerId}/overlays`),
  
  getUploadUrl: (fileName, contentType) => request('/api/overlays/upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType }),
  }),
  
  uploadFile: (url, file) => fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  }),

  createOverlay: (playerId, data) => request(`/api/players/${playerId}/overlays`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteOverlay: (playerId, overlayId) => request(`/api/players/${playerId}/overlays/${overlayId}`, {
    method: 'DELETE',
  }),
};
