const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const authTokenKey = 'eduportal-token';

function applyTheme(theme) {
  if (theme === 'dark') {
    body.classList.add('dark');
    if (themeToggle) themeToggle.textContent = 'Light Mode';
  } else {
    body.classList.remove('dark');
    if (themeToggle) themeToggle.textContent = 'Dark Mode';
  }
  localStorage.setItem('eduportal-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('eduportal-theme');
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

function showError(id, message) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = message;
  } else {
    alert(message);
  }
}

function clearError(id) {
  const element = document.getElementById(id);
  if (element) element.textContent = '';
}

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 8;
}

const apiBase = window.location.protocol.startsWith('http')
  ? window.location.origin
  : 'http://localhost:3000';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(authTokenKey);
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const fullPath = path.startsWith('/') ? `${apiBase}${path}` : `${apiBase}/${path}`;

  let response;
  try {
    response = await fetch(fullPath, {
      credentials: 'same-origin',
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new Error('Unable to complete request. Make sure the backend server is running at http://localhost:3000.');
  }

  if (response.status === 401) {
    localStorage.removeItem(authTokenKey);
    window.location.href = 'login.html';
    return null;
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message || 'Registered successfully';
    throw new Error(message);
  }

  return body;
}

async function registerUser(event) {
  event.preventDefault();
  clearError('registerError');

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim().toLowerCase();
  const password = document.getElementById('registerPassword').value;

  if (!name) return showError('registerError', 'Full name is required.');
  if (!validateEmail(email)) return showError('registerError', 'Enter a valid email address.');
  if (!validatePassword(password)) return showError('registerError', 'Password must be at least 8 characters.');

  try {
    await apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    alert('Registration complete! Please log in.');
    window.location.href = 'login.html';
  } catch (error) {
    showError('registerError', error.message);
  }
}

async function loginUser(event) {
  event.preventDefault();
  clearError('loginError');

  const loginButton = document.getElementById('loginSubmit');
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  if (!validateEmail(email)) return showError('loginError', 'Enter a valid email address.');
  if (!password) return showError('loginError', 'Password cannot be empty.');

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';
  }

  try {
    const result = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(authTokenKey, result.token);
    window.location.href = 'index.html';
  } catch (error) {
    showError('loginError', error.message);
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = 'Login';
    }
  }
}

function logoutUser() {
  localStorage.removeItem(authTokenKey);
  window.location.href = 'login.html';
}

async function loadProfile() {
  try {
    const profile = await apiRequest('/api/profile');
    if (!profile) return;

    const greeting = document.getElementById('dashboardGreeting');
    const initials = document.getElementById('profileInitials');
    if (greeting) greeting.innerHTML = `Good Morning, ${profile.name}! <span>👋</span>`;
    if (initials) initials.textContent = profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  } catch (err) {
    console.warn('Profile load failed', err);
  }
}

function attachFormHandlers() {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const logoutButton = document.getElementById('logoutButton');

  if (registerForm) registerForm.addEventListener('submit', registerUser);
  if (loginForm) loginForm.addEventListener('submit', loginUser);
  if (logoutButton) {
    logoutButton.addEventListener('click', (event) => {
      event.preventDefault();
      logoutUser();
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = body.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(next);
    });
  }
}

function getToken() {
  return localStorage.getItem(authTokenKey);
}

async function protectPage() {
  const isAuthPage = document.querySelector('.auth-page');
  const token = getToken();

  if (!isAuthPage && !token) {
    window.location.href = 'login.html';
    return;
  }

  if (isAuthPage && token) {
    window.location.href = 'index.html';
    return;
  }

  if (!isAuthPage && token) {
    await loadProfile();
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  attachFormHandlers();
  await protectPage();
});
