// ============================================================
// Auth System for ESINSA WMS - Client-side authentication
// ============================================================
// Uses localStorage for persistence (user database) and
// sessionStorage for the active session.
// In a production environment, replace with JWT + backend API.
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In production, hash with bcrypt
  role: 'admin' | 'operator';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  avatar: string;
}

const USERS_KEY = 'esinsa_wms_users';
const SESSION_KEY = 'esinsa_wms_session';
const RESET_TOKENS_KEY = 'esinsa_wms_reset_tokens';

// ============================================================
// Initialize default admin user if none exist
// ============================================================
function ensureDefaultAdmin(): void {
  const users = getUsers();
  if (users.length === 0) {
    const defaultAdmin: User = {
      id: crypto.randomUUID?.() || 'admin-001',
      name: 'Administrador',
      email: 'admin@esinsa.es',
      password: 'admin123',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?auto=format&fit=crop&q=80&w=1160',
      createdAt: new Date().toISOString(),
    };
    users.push(defaultAdmin);
    saveUsers(users);
  }
}

function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ============================================================
// REGISTER a new user
// ============================================================
export function registerUser(name: string, email: string, password: string): { success: boolean; error?: string } {
  ensureDefaultAdmin();

  if (!name || !email || !password) {
    return { success: false, error: 'Todos los campos son obligatorios' };
  }

  if (password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  const users = getUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return { success: false, error: 'Ya existe un usuario con este email' };
  }

  const newUser: User = {
    id: crypto.randomUUID?.(),
    name,
    email: email.toLowerCase(),
    password, // In production, hash this!
    role: 'operator',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=128`,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Auto-login after register
  createSession(newUser);
  return { success: true };
}

// ============================================================
// LOGIN
// ============================================================
export function loginUser(email: string, password: string): { success: boolean; error?: string } {
  ensureDefaultAdmin();

  if (!email || !password) {
    return { success: false, error: 'Email y contraseña son obligatorios' };
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  if (user.password !== password) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  // Update lastLogin
  user.lastLogin = new Date().toISOString();
  saveUsers(users);

  createSession(user);
  return { success: true };
}

// ============================================================
// LOGOUT
// ============================================================
export function logoutUser(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ============================================================
// Session management
// ============================================================
function createSession(user: User): void {
  const session: AuthSession = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=128`,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getCurrentSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

// ============================================================
// Auth guard - redirect to login if not authenticated
// ============================================================
export function requireAuth(): AuthSession | null {
  const session = getCurrentSession();
  if (!session) {
    window.location.href = '/signin';
    return null;
  }
  return session;
}

// ============================================================
// Get all users (admin only)
// ============================================================
export function getAllUsers(): Omit<User, 'password'>[] {
  const users = getUsers();
  return users.map(({ password, ...rest }) => rest);
}

// ============================================================
// Delete user (admin only)
// ============================================================
export function deleteUser(userId: string): boolean {
  const session = getCurrentSession();
  if (!session || session.role !== 'admin') return false;

  let users = getUsers();
  users = users.filter(u => u.id !== userId);
  saveUsers(users);
  return true;
}

// ============================================================
// Update user password
// ============================================================
export function updatePassword(userId: string, newPassword: string): boolean {
  if (newPassword.length < 6) return false;

  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;

  users[idx].password = newPassword;
  saveUsers(users);
  return true;
}

export function requestPasswordReset(email: string): { success: boolean; token?: string; error?: string } {
  ensureDefaultAdmin();

  if (!email) {
    return { success: false, error: 'El email es obligatorio' };
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { success: false, error: 'No se encontró una cuenta con ese email' };
  }

  const token = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
  const expires = Date.now() + 15 * 60 * 1000;

  let tokens: Record<string, { email: string; expires: number }> = {};
  try {
    const raw = localStorage.getItem(RESET_TOKENS_KEY);
    if (raw) tokens = JSON.parse(raw);
  } catch {}

  tokens[token] = { email: user.email.toLowerCase(), expires };
  localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));

  return { success: true, token };
}

export function resetPassword(token: string, newPassword: string): { success: boolean; error?: string } {
  if (!token || !newPassword) {
    return { success: false, error: 'Token y contraseña son obligatorios' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  let tokens: Record<string, { email: string; expires: number }> = {};
  try {
    const raw = localStorage.getItem(RESET_TOKENS_KEY);
    if (raw) tokens = JSON.parse(raw);
  } catch {}

  const entry = tokens[token];
  if (!entry) {
    return { success: false, error: 'Token inválido o ya utilizado' };
  }

  if (Date.now() > entry.expires) {
    delete tokens[token];
    localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));
    return { success: false, error: 'El token ha expirado. Solicita uno nuevo.' };
  }

  const users = getUsers();
  const idx = users.findIndex(u => u.email === entry.email);
  if (idx === -1) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  users[idx].password = newPassword;
  saveUsers(users);

  delete tokens[token];
  localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));

  return { success: true };
}

// Initialize default admin on module load (runs when this file is imported in a browser context)
if (typeof window !== 'undefined') {
  ensureDefaultAdmin();
}
