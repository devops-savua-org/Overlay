import { el } from '../dom.js';
import { state, bus } from '../state.js';
import { api } from '../api.js';

let appRoot;

function PlayerList() {
  const handleSelectPlayer = (player) => {
    state.selectedPlayerId = player.id;
    bus.emit('player:selected', player);
  };

  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const name = input.value.trim();
    if (name) {
      await api.createPlayer(name);
      bus.emit('players:updated');
      input.value = '';
    }
  };

  const listItems = state.players.map(p =>
    el('li',
      {
        className: state.selectedPlayerId === p.id ? 'active' : '',
        onclick: () => handleSelectPlayer(p)
      },
      el('span', {},
        el('span', { className: `status-dot ${Date.now() - new Date(p.lastPing) < 60000 ? 'online' : ''}` }),
        p.name
      ),
      el('code', {}, p.pairingCode)
    )
  );

  return el('div', { className: 'card player-list' },
    el('h2', {}, 'Players'),
    el('ul', {}, ...listItems),
    el('form', { onsubmit: handleCreatePlayer },
      el('input', { type: 'text', placeholder: 'New Player Name', required: true }),
      el('button', { type: 'submit' }, 'Add Player')
    )
  );
}

function OverlayManager() {
  if (!state.selectedPlayerId) {
    return el('div', { className: 'card' },
      el('h2', {}, 'Overlays'),
      el('p', {}, 'Select a player to manage their overlays.')
    );
  }

  const handleDeleteOverlay = async (overlay) => {
    if (confirm(`Delete overlay ${overlay.fileName}?`)) {
      await api.deleteOverlay(state.selectedPlayerId, overlay.id);
      bus.emit('overlays:updated');
    }
  };

  const overlayItems = state.overlays.map(o =>
    el('li', { className: 'overlay-item' },
      el('img', { src: o.url, alt: o.fileName }),
      el('div', { className: 'overlay-info' },
        el('strong', {}, o.fileName),
        `Hotkey: ${o.hotkey}`
      ),
      el('button', { className: 'delete', onclick: () => handleDeleteOverlay(o) }, 'Delete')
    )
  );

  return el('div', { className: 'card overlay-manager' },
    el('h2', {}, `Overlays for ${state.players.find(p => p.id === state.selectedPlayerId)?.name || ''}`),
    el('ul', { className: 'overlay-list' }, ...overlayItems),
    UploadForm()
  );
}

function UploadForm() {
  const handleUpload = async (e) => {
    e.preventDefault();
    const form = e.target;
    const fileInput = form.querySelector('input[type="file"]');
    const hotkeyInput = form.querySelector('input[type="number"]');
    const file = fileInput.files[0];
    const hotkey = hotkeyInput.value;

    if (!file || !hotkey || !state.selectedPlayerId) return;
    if (file.type !== 'image/png') {
        alert('Only PNG files are allowed.');
        return;
    }

    try {
      // 1. Get a signed URL from our backend
      const { signedUrl, key } = await api.getUploadUrl(file.name, file.type);
      
      // 2. Upload the file directly to R2
      const uploadResponse = await api.uploadFile(signedUrl, file);
      if (!uploadResponse.ok) throw new Error('Failed to upload file to R2.');

      // 3. Create the overlay metadata in our backend
      await api.createOverlay(state.selectedPlayerId, {
        key,
        fileName: file.name,
        hotkey,
      });

      bus.emit('overlays:updated');
      form.reset();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Check the console for details.');
    }
  };

  return el('div', { className: 'upload-form' },
    el('h3', {}, 'Upload New Overlay'),
    el('form', { onsubmit: handleUpload },
      el('input', { type: 'file', accept: 'image/png', required: true }),
      el('input', { type: 'number', min: 0, max: 9, placeholder: 'Hotkey (0-9)', required: true }),
      el('button', { type: 'submit' }, 'Upload Overlay')
    )
  );
}

async function updateData() {
  state.players = await api.getPlayers();
  if (state.selectedPlayerId) {
    state.overlays = await api.getOverlays(state.selectedPlayerId);
  } else {
    state.overlays = [];
  }
  render();
}

function render() {
  const dashboard = el('div', { className: 'dashboard-grid' },
    PlayerList(),
    OverlayManager()
  );
  appRoot.innerHTML = '';
  appRoot.appendChild(dashboard);
}

export function renderDashboard(container) {
  appRoot = container;
  
  bus.on('player:selected', updateData);
  bus.on('players:updated', updateData);
  bus.on('overlays:updated', updateData);

  updateData();
}
