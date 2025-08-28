const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const emailService = require('./email-service');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Database setup
let db;

async function initializeDatabase() {
  const dbPath = path.join(__dirname, 'users.db');
  
  // Debug logging
  console.log('🔍 [AUTH DEBUG] __dirname:', __dirname);
  console.log('🔍 [AUTH DEBUG] Current working directory:', process.cwd());
  console.log('🔍 [AUTH DEBUG] Database path:', dbPath);
  console.log('🔍 [AUTH DEBUG] Database path exists:', require('fs').existsSync(dbPath));
  console.log('🔍 [AUTH DEBUG] Directory exists:', require('fs').existsSync(path.dirname(dbPath)));
  
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('✅ [AUTH DEBUG] Database opened successfully');
  } catch (error) {
    console.error('❌ [AUTH DEBUG] Failed to open database:', error);
    throw error;
  }

  // Create users table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT 0,
      email_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      data_directory TEXT NOT NULL
    )
  `);

  // Create default admin user if no users exist
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    // Use environment variable for admin password, fallback to generated one
    const adminPassword = process.env.ADMIN_PASSWORD || 
      Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const adminDataDir = path.join(__dirname, 'user_data', 'admin');
    
    await db.run(`
      INSERT INTO users (username, email, password_hash, is_admin, email_verified, data_directory)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['admin', 'admin@nodebook.local', adminPasswordHash, 1, 1, adminDataDir]);

    // Create admin data directory
    await fs.mkdir(adminDataDir, { recursive: true });
    
    if (process.env.ADMIN_PASSWORD) {
      console.log('✅ Admin user created with environment password');
    } else {
      console.log('⚠️  Admin user created with generated password:', adminPassword);
      console.log('⚠️  Set ADMIN_PASSWORD environment variable for production!');
    }
  }
}

// User management functions
async function createUser(username, email, password, isAdmin = false) {
  const passwordHash = await bcrypt.hash(password, 10);
  const dataDirectory = path.join(__dirname, 'user_data', username);
  
  try {
    await db.run(`
      INSERT INTO users (username, email, password_hash, is_admin, email_verified, data_directory)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, email, passwordHash, isAdmin ? 1 : 0, isAdmin ? 1 : 0, dataDirectory]);

    // Create user data directory
    await fs.mkdir(dataDirectory, { recursive: true });
    
    // If email features are enabled and user is not admin, send verification email
    if (process.env.EMAIL_FEATURES_ENABLED === 'true' && !isAdmin && email) {
      try {
        const user = await findUser(username);
        const verificationToken = await emailService.createEmailVerificationToken(user.id);
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email`;
        await emailService.sendEmailVerificationEmail(email, verificationToken, verificationUrl);
      } catch (emailError) {
        console.warn('⚠️ Failed to send verification email:', emailError);
        // Don't fail user creation if email fails
      }
    }
    
    return { username, email, isAdmin, dataDirectory, emailVerified: isAdmin };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
}

async function findUser(username) {
  return await db.get('SELECT * FROM users WHERE username = ?', [username]);
}

async function validateUser(username, password) {
  const user = await findUser(username);
  if (!user) return null;
  
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (isValid) {
    // Update last login
    await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    return user;
  }
  return null;
}

async function getUserDataDirectory(username) {
  const user = await findUser(username);
  return user ? user.data_directory : null;
}

// JWT token functions
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      isAdmin: user.is_admin,
      dataDirectory: user.data_directory
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Passport strategies
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await validateUser(username, password);
    if (user) {
      return done(null, user);
    } else {
      return done(null, false, { message: 'Invalid username or password' });
    }
  } catch (error) {
    return done(error);
  }
}));

passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET
}, async (payload, done) => {
  try {
    console.log('[JWT Strategy] Payload received:', payload);
    // Use username from payload for user lookup
    const user = await findUser(payload.username);
    if (user) {
      console.log('[JWT Strategy] User found:', user.username);
      return done(null, user);
    } else {
      console.log('[JWT Strategy] User not found for username:', payload.username);
      return done(null, false);
    }
  } catch (error) {
    console.error('[JWT Strategy] Error:', error);
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Middleware functions
function authenticateJWT(req, res, next) {
  console.log('[authenticateJWT] Headers:', req.headers);
  console.log('[authenticateJWT] Authorization header:', req.headers.authorization);
  
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('[authenticateJWT] Passport error:', err);
      return next(err);
    }
    if (!user) {
      console.log('[authenticateJWT] No user found, authentication failed');
      return res.status(401).json({ error: 'Authentication required' });
    }
    console.log('[authenticateJWT] User authenticated:', user.username);
    req.user = user;
    next();
  })(req, res, next);
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Auto-login for desktop environment
function autoLoginForDesktop(req, res, next) {
  if (process.env.NODE_ENV === 'desktop') {
    // In desktop mode, automatically authenticate as local user
    req.user = {
      id: 1,
      username: 'local',
      is_admin: true,
      data_directory: path.join(__dirname, 'user_data', 'local')
    };
    return next();
  }
  next();
}

// Password reset functions
async function requestPasswordReset(email) {
  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (process.env.EMAIL_FEATURES_ENABLED !== 'true') {
      throw new Error('Email features are disabled');
    }
    
    const resetToken = await emailService.createPasswordResetToken(user.id);
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`;
    
    await emailService.sendPasswordResetEmail(email, resetToken, resetUrl);
    return { message: 'Password reset email sent' };
  } catch (error) {
    console.error('❌ Password reset request failed:', error);
    throw error;
  }
}

async function resetPassword(token, newPassword) {
  try {
    const tokenInfo = await emailService.verifyPasswordResetToken(token);
    if (!tokenInfo) {
      throw new Error('Invalid or expired token');
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, tokenInfo.user_id]);
    
    // Mark token as used
    await emailService.markPasswordResetTokenUsed(token);
    
    return { message: 'Password reset successfully' };
  } catch (error) {
    console.error('❌ Password reset failed:', error);
    throw error;
  }
}

// Email verification functions
async function verifyEmail(token) {
  try {
    const result = await emailService.markEmailVerified(token);
    if (!result) {
      throw new Error('Invalid or expired verification token');
    }
    return { message: 'Email verified successfully' };
  } catch (error) {
    console.error('❌ Email verification failed:', error);
    throw error;
  }
}

async function resendVerificationEmail(username) {
  try {
    const user = await findUser(username);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.email_verified) {
      throw new Error('Email already verified');
    }
    
    if (process.env.EMAIL_FEATURES_ENABLED !== 'true') {
      throw new Error('Email features are disabled');
    }
    
    const verificationToken = await emailService.createEmailVerificationToken(user.id);
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email`;
    
    await emailService.sendEmailVerificationEmail(user.email, verificationToken, verificationUrl);
    return { message: 'Verification email sent' };
  } catch (error) {
    console.error('❌ Failed to resend verification email:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  createUser,
  findUser,
  validateUser,
  getUserDataDirectory,
  generateToken,
  verifyToken,
  authenticateJWT,
  requireAdmin,
  autoLoginForDesktop,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  passport
};
