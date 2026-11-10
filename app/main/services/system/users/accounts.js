const { dbGet, dbAll, dbRun } = require('../../database');
const { hashPassword } = require('./password');
const { getActiveUserRole } = require('./session');

async function checkUsersCount() {
  const row = await dbGet('SELECT COUNT(*) as count FROM users');
  return { count: row.count };
}

async function createUser(username, password, role, permissions) {
  const pHash = hashPassword(password);
  const perms = permissions ? JSON.stringify(permissions) : '{}';
  await dbRun('INSERT INTO users (username, password_hash, role, permissions) VALUES (?, ?, ?, ?)', [username, pHash, role, perms]);
  return { success: true };
}

async function updateUser(id, username, password, permissions) {
  const perms = permissions ? JSON.stringify(permissions) : '{}';
  if (password) {
    const pHash = hashPassword(password);
    await dbRun('UPDATE users SET username = ?, password_hash = ?, permissions = ? WHERE id = ?', [username, pHash, perms, id]);
  } else {
    await dbRun('UPDATE users SET username = ?, permissions = ? WHERE id = ?', [username, perms, id]);
  }
  return { success: true };
}

async function getUsers() {
  const users = await dbAll('SELECT id, username, role, permissions FROM users');
  return { 
    success: true, 
    users: users.map(u => {
      let perms = {};
      try {
        const rawPerms = u.permissions || u.Permissions;
        if (rawPerms) {
          if (typeof rawPerms === 'string' && rawPerms.startsWith('{')) {
            perms = JSON.parse(rawPerms);
          } else {
            perms = { legacy: rawPerms };
          }
        }
      } catch (e) {}
      
      return {
        id: u.id || u.Id,
        username: u.username || u.Username,
        role: u.role || u.Role,
        permissions: perms 
      };
    }) 
  };
}

async function deleteUser(id) {
  if (getActiveUserRole() !== 'manager') throw new Error('Unauthorized');
  await dbRun('DELETE FROM users WHERE id = ?', [id]);
  return { success: true };
}

module.exports = { checkUsersCount, createUser, updateUser, getUsers, deleteUser };
