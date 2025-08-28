import { renderDashboard } from './views/Dashboard.js';
import { state, bus } from './state.js';
import { $ } from './dom.js';

const authContainer = $('#auth-container');
const appContainer = $('#app');

function handleSignOut() {
  google.accounts.id.disableAutoSelect();
  state.user = null;
  state.token = null;
  localStorage.removeItem('jwt_token');
  renderAuth();
}

function renderAuth() {
  appContainer.innerHTML = `<p>Please sign in to manage players and overlays.</p>`;
  authContainer.innerHTML = ''; // Clear previous buttons
  const buttonDiv = document.createElement('div');
  buttonDiv.id = 'g_id_signin';
  authContainer.appendChild(buttonDiv);
  google.accounts.id.renderButton(
    $('#g_id_signin'),
    { theme: "outline", size: "large" }
  );
}

function renderApp() {
  authContainer.innerHTML = '';
  const signOutButton = document.createElement('button');
  signOutButton.textContent = `Sign Out (${state.user.email})`;
  signOutButton.onclick = handleSignOut;
  authContainer.appendChild(signOutButton);
  renderDashboard(appContainer);
}

// Make callback global
window.handleGoogleSignIn = (response) => {
  const token = response.credential;
  // In a real app, send this to your backend for verification
  const user = JSON.parse(atob(token.split('.')[1]));

  state.token = token;
  state.user = { name: user.name, email: user.email, picture: user.picture };
  localStorage.setItem('jwt_token', token);
  
  bus.emit('auth:success');
};

document.addEventListener('DOMContentLoaded', () => {
  bus.on('auth:success', renderApp);
  bus.on('auth:signout', renderAuth);

  const storedToken = localStorage.getItem('jwt_token');
  if (storedToken) {
    const user = JSON.parse(atob(storedToken.split('.')[1]));
    state.token = storedToken;
    state.user = { name: user.name, email: user.email, picture: user.picture };
    renderApp();
  } else {
    renderAuth();
  }
});
