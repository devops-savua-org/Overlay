import { jsonResponse, generatePairingCode } from './utils.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Be more restrictive in production
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Player Management
export async function handlePlayerCreate(request, env) {
  const { name } = await request.json();
  if (!name) return jsonResponse({ error: 'Player name is required' }, 400);

  const playerId = crypto.randomUUID();
  const pairingCode = generatePairingCode();
  const playerData = {
    id: playerId,
    name,
    pairingCode,
    createdAt: new Date().toISOString(),
    lastPing: null,
  };

  await env.PLAYERS_KV.put(`player:${playerId}`, JSON.stringify(playerData));
  await env.PLAYERS_KV.put(`pairing:${pairingCode}`, playerId);

  return jsonResponse(playerData, 201, corsHeaders);
}

export async function handlePlayerList(request, env) {
  const { keys } = await env.PLAYERS_KV.list({ prefix: 'player:' });
  const players = await Promise.all(
    keys.map(key => env.PLAYERS_KV.get(key.name).then(JSON.parse))
  );
  return jsonResponse(players, 200, corsHeaders);
}

export async function handlePlayerDelete(request, env) {
  const playerId = new URL(request.url).pathname.split('/')[3];
  // In a real app, also delete all associated overlays from KV and R2
  await env.PLAYERS_KV.delete(`player:${playerId}`);
  return jsonResponse({ success: true }, 200, corsHeaders);
}

export async function handlePlayerPing(request, env) {
  const playerId = new URL(request.url).pathname.split('/')[3];
  const playerDataStr = await env.PLAYERS_KV.get(`player:${playerId}`);
  if (!playerDataStr) return jsonResponse({ error: 'Player not found' }, 404);

  const playerData = JSON.parse(playerDataStr);
  playerData.lastPing = new Date().toISOString();
  await env.PLAYERS_KV.put(`player:${playerId}`, JSON.stringify(playerData));

  return jsonResponse({ success: true }, 200, corsHeaders);
}


// Overlay Management
export async function handleOverlayUploadUrl(request, env) {
  const { fileName, contentType } = await request.json();
  if (!fileName || !contentType) {
    return jsonResponse({ error: 'fileName and contentType are required' }, 400);
  }

  const key = `assets/${crypto.randomUUID()}/${fileName}`;
  const signedUrl = await env.OVERLAY_ASSETS.createPresignedUrl('PUT', key, {
    contentType,
    expires: 3600, // 1 hour
  });

  return jsonResponse({ signedUrl, key }, 200, corsHeaders);
}

export async function handleOverlayCreate(request, env) {
  const playerId = new URL(request.url).pathname.split('/')[3];
  const { key, fileName, hotkey } = await request.json();

  if (!key || !fileName || !hotkey) {
    return jsonResponse({ error: 'key, fileName, and hotkey are required' }, 400);
  }

  const overlayId = crypto.randomUUID();
  const overlayData = {
    id: overlayId,
    playerId,
    r2Key: key,
    fileName,
    hotkey: parseInt(hotkey, 10),
    createdAt: new Date().toISOString(),
  };

  await env.OVERLAYS_KV.put(`overlay:${playerId}:${overlayId}`, JSON.stringify(overlayData));
  return jsonResponse(overlayData, 201, corsHeaders);
}


export async function handleOverlayList(request, env) {
  const playerId = new URL(request.url).pathname.split('/')[3];
  const { keys } = await env.OVERLAYS_KV.list({ prefix: `overlay:${playerId}:` });

  const overlays = await Promise.all(
    keys.map(async (key) => {
      const data = await env.OVERLAYS_KV.get(key.name).then(JSON.parse);
      const signedUrl = await env.OVERLAY_ASSETS.createPresignedUrl('GET', data.r2Key, {
        expires: 3600, // 1 hour
      });
      return { ...data, url: signedUrl };
    })
  );

  return jsonResponse(overlays, 200, corsHeaders);
}


export async function handleOverlayUpdate(request, env) {
    const { playerId, overlayId } = request.params; // Assuming a framework that parses params
    const updates = await request.json();
    const key = `overlay:${playerId}:${overlayId}`;

    const existing = await env.OVERLAYS_KV.get(key);
    if (!existing) return jsonResponse({ error: 'Not found' }, 404);

    const data = { ...JSON.parse(existing), ...updates, updatedAt: new Date().toISOString() };
    await env.OVERLAYS_KV.put(key, JSON.stringify(data));
    return jsonResponse(data, 200, corsHeaders);
}

export async function handleOverlayDelete(request, env) {
  const urlParts = new URL(request.url).pathname.split('/');
  const playerId = urlParts[3];
  const overlayId = urlParts[5];
  const key = `overlay:${playerId}:${overlayId}`;

  const overlayDataStr = await env.OVERLAYS_KV.get(key);
  if (overlayDataStr) {
    const overlayData = JSON.parse(overlayDataStr);
    await env.OVERLAY_ASSETS.delete(overlayData.r2Key);
  }

  await env.OVERLAYS_KV.delete(key);
  return jsonResponse({ success: true }, 200, corsHeaders);
}
