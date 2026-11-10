const { dbGet, setActiveUser } = require('../../database');
const { verifyPassword } = require('./password');
const { setActiveSession } = require('./session');

async function loginUser(username, password) {
  try {
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (user) {
      const pwdHash = user.password_hash || user.PasswordHash || user.password || user.Password;
      if (verifyPassword(password, pwdHash)) {
        let perms = {};
        try {
          const rawPerms = user.permissions || user.Permissions;
          if (rawPerms) {
            if (typeof rawPerms === 'string' && rawPerms.startsWith('{')) {
              perms = JSON.parse(rawPerms);
            } else {
              // Legacy comma-separated or plain text fallback
              perms = { legacy: rawPerms };
            }
          }
        } catch (e) {
          console.error("Failed to parse permissions:", e);
        }

        const finalRole = user.role || user.Role;
        setActiveSession(finalRole, perms);
        
        setActiveUser(user.username || user.Username);
        return { 
          success: true, 
          user: { 
            id: user.id || user.Id, 
            username: user.username || user.Username, 
            role: finalRole, 
            permissions: perms 
          } 
        };
      }
    }
  } catch (dbErr) {
    console.error('Login DB Error:', dbErr);
    return { success: false, error: 'خطأ في قاعدة البيانات' };
  }
  return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
}

module.exports = { loginUser };
