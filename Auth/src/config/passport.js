const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../Models/user.model');
const sellerModel = require('../Models/seller.model');
const { publishToQueue } = require('../Broker/broker');

const USER_CREATED_EVENT = 'user.created';
const USER_UPDATED_EVENT = 'user.updated';

const isGoogleAuthConfigured = () => (
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET)
);

const buildUsernameBase = (email, displayName, googleId) => {
  const source = email || displayName || `google_${googleId}`;
  return source
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24) || `google_${googleId.slice(-8)}`;
};

const createUniqueUsername = async (model, email, displayName, googleId) => {
  const base = buildUsernameBase(email, displayName, googleId);
  let username = base;
  let suffix = 1;

  while (await model.exists({ username })) {
    username = `${base}_${suffix}`;
    suffix += 1;
  }

  return username;
};

const splitDisplayName = (displayName) => {
  const nameParts = (displayName || 'Google User').trim().split(/\s+/);
  const firstName = nameParts.shift() || 'Google';
  const lastName = nameParts.join(' ') || 'User';

  return { firstName, lastName };
};

const getRequestedGoogleRole = (state) => {
  const value = String(state || '').toLowerCase();
  if (value === 'admin') return 'admin';
  if (value === 'seller' || value === 'merchant') return 'seller';
  return 'user';
};

const isAdminEmailAllowed = (email) => {
  const allowedEmails = (process.env.ADMIN_GOOGLE_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.includes(email)) return true;

  return process.env.NODE_ENV !== 'production' && process.env.ADMIN_GOOGLE_EMAILS === undefined;
};

const buildUserEventPayload = (eventName, account, accountType = 'user', changes = []) => {
  const payload = {
    event: eventName,
    id: account._id,
    accountId: account._id,
    username: account.username,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    accountType,
    authProvider: account.authProvider || 'local',
    emailVerified: account.emailVerified || false,
  };

  if (accountType === 'user') {
    payload.addresses = account.addresses || [];
  }

  if (changes.length > 0) {
    payload.changes = changes;
  }

  return payload;
};

const publishUserEvent = async (eventName, account, accountType = 'user', changes = []) => {
  const payload = buildUserEventPayload(eventName, account, accountType, changes);

  try {
    await Promise.all([
      publishToQueue(`AUTH_NOTIFICATION.${eventName}`, payload),
      publishToQueue(`AUTH_SELLER_DASHBOARD.${eventName}`, payload),
    ]);
  } catch (error) {
    console.warn(`Auth event ${eventName} could not be published:`, error.message);
  }
};

if (isGoogleAuthConfigured()) {
  const googleStrategy = new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      const requestedRole = getRequestedGoogleRole(req.query.state);
      const accountModel = requestedRole === 'seller' ? sellerModel : userModel;
      const accountType = requestedRole;

      if (!email) {
        return done(null, false, { message: 'Google account email is required' });
      }

      const accountQuery = requestedRole === 'admin'
        ? {
          role: 'admin',
          $or: [
            { googleId: profile.id },
            { email },
          ],
        }
        : {
          $or: [
            { googleId: profile.id },
            { email },
          ],
        };

      let account = await accountModel.findOne(accountQuery);

      if (account) {
        const changes = [];
        if (!account.googleId) {
          account.googleId = profile.id;
          changes.push('googleId');
        }
        if (account.authProvider !== 'google') {
          account.authProvider = 'google';
          changes.push('authProvider');
        }
        if (!account.emailVerified) {
          account.emailVerified = true;
          changes.push('emailVerified');
        }
        await account.save();
        if (changes.length > 0) {
          await publishUserEvent(USER_UPDATED_EVENT, account, accountType, changes);
        }
        return done(null, account);
      }

      if (requestedRole === 'admin' && !isAdminEmailAllowed(email)) {
        return done(null, false, { message: 'Google admin access is not enabled for this email' });
      }

      const fullName = splitDisplayName(profile.displayName);
      const username = await createUniqueUsername(accountModel, email, profile.displayName, profile.id);

      const accountData = {
        username,
        email,
        googleId: profile.id,
        authProvider: 'google',
        emailVerified: true,
        fullName,
        role: requestedRole,
      };

      if (requestedRole === 'user') {
        accountData.addresses = [];
      }

      account = await accountModel.create(accountData);

      await publishUserEvent(USER_CREATED_EVENT, account, accountType);

      return done(null, account);
    } catch (error) {
      return done(error);
    }
  });

  const originalGetOAuthAccessToken = googleStrategy._oauth2.getOAuthAccessToken;
  googleStrategy._oauth2.getOAuthAccessToken = function (code, params, callback) {
    originalGetOAuthAccessToken.call(this, code, params, (err, accessToken, refreshToken, results) => {
      if (err) {
        console.error('[Google OAuth Token Error Details]:', err.statusCode, err.data || err.message);
      }
      callback(err, accessToken, refreshToken, results);
    });
  };

  passport.use(googleStrategy);
}

module.exports = {
  passport,
  isGoogleAuthConfigured,
};
