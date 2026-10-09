/**
 * Admin users, roles and permissions.
 *
 * The site previously had exactly one admin account. That account is
 * migrated automatically and becomes the Master Admin, who always has
 * every permission and can never be locked out or deleted.
 *
 * Everything here is enforced on the SERVER. Hiding a button in the
 * dashboard is not security: a staff member without `blog.delete` gets a
 * 403 even if they call the API directly.
 */
import * as crypto from 'crypto';
import * as store from './store.ts';

export const PERMISSIONS = [
  'blog.view', 'blog.create', 'blog.edit', 'blog.delete',
  'comments.view', 'comments.approve', 'comments.delete',
  'messages.view', 'messages.manage',
  'subscribers.view', 'subscribers.manage',
  'media.manage',
  'settings.view', 'settings.edit',
  'seo.edit',
  'backup.create', 'backup.restore',
  'analytics.view',
  'users.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Ready-made sets so the Master Admin doesn't have to tick 19 boxes. */
export const ROLE_PRESETS: Record<string, Permission[]> = {
  master: [...PERMISSIONS],
  editor: ['blog.view', 'blog.create', 'blog.edit', 'comments.view', 'comments.approve', 'media.manage', 'analytics.view'],
  moderator: ['comments.view', 'comments.approve', 'comments.delete', 'messages.view', 'messages.manage'],
  analyst: ['analytics.view', 'subscribers.view', 'blog.view'],
  custom: [],
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  salt: string;
  hash: string;
  role: string;
  permissions: Permission[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const USERS = 'adminUsers';

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

export function verifyPassword(password: string, user: { salt: string; hash: string }): boolean {
  try {
    const candidate = crypto.scryptSync(password, user.salt, 64);
    const stored = Buffer.from(user.hash, 'hex');
    return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
  } catch {
    return false;
  }
}

/** Reads the users, migrating the old single-account format on first run. */
export function allUsers(): AdminUser[] {
  const users = store.read<AdminUser[]>(USERS, []);
  if (users.length) return users;

  // Migration: the previous single account, or the environment variables.
  const legacy = store.read<any>('adminAccount', null);
  const envEmail = process.env.ADMIN_EMAIL;
  const envPass = process.env.ADMIN_PASSWORD;

  let seed: AdminUser | null = null;
  const now = new Date().toISOString();
  if (legacy?.email && legacy?.hash) {
    seed = {
      id: 'user_master', email: legacy.email, name: 'Master Admin',
      salt: legacy.salt, hash: legacy.hash,
      role: 'master', permissions: [...PERMISSIONS], active: true, createdAt: now, updatedAt: now,
    };
  } else if (envEmail && envPass) {
    const { salt, hash } = hashPassword(envPass);
    seed = {
      id: 'user_master', email: envEmail.trim().toLowerCase(), name: 'Master Admin',
      salt, hash, role: 'master', permissions: [...PERMISSIONS], active: true, createdAt: now, updatedAt: now,
    };
  }

  if (seed) {
    store.write(USERS, [seed]);
    console.log(`[users] migrated the existing admin account to Master Admin (${seed.email})`);
    return [seed];
  }
  return [];
}

export const saveUsers = (users: AdminUser[]) => store.write(USERS, users);

export const findByEmail = (email: string) =>
  allUsers().find((u) => u.email.toLowerCase() === String(email || '').trim().toLowerCase());

export const findById = (id: string) => allUsers().find((u) => u.id === id);

export const isMaster = (user?: AdminUser | null) => user?.role === 'master';

/** The Master Admin always has everything, whatever is stored. */
export function hasPermission(user: AdminUser | null | undefined, permission: Permission): boolean {
  if (!user || !user.active) return false;
  if (isMaster(user)) return true;
  return user.permissions.includes(permission);
}

/** What the dashboard needs — never the password hash. */
export const publicUser = (u: AdminUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  permissions: isMaster(u) ? [...PERMISSIONS] : u.permissions,
  active: u.active,
  createdAt: u.createdAt,
});
