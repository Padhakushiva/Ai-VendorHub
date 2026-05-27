const userModel = require("../Models/user.model");
const sellerModel = require("../Models/seller.model");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const redis = require("../DB/redis");
const { publishToQueue } = require("../Broker/broker");
const { sendEmail } = require("../services/email.service");

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const ACCESS_TOKEN_MAX_AGE_MS = Number(process.env.ACCESS_TOKEN_MAX_AGE_MS) || 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = Number(process.env.REFRESH_TOKEN_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_SECONDS = Math.floor(REFRESH_TOKEN_MAX_AGE_MS / 1000);
const MAX_ACTIVE_SESSIONS_PER_USER = Number(process.env.MAX_ACTIVE_SESSIONS_PER_USER) || 5;
const EMAIL_TOKEN_EXPIRES_MS = Number(process.env.EMAIL_TOKEN_EXPIRES_MS) || 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRES_MS = Number(process.env.PASSWORD_RESET_EXPIRES_MS) || 15 * 60 * 1000;
const USER_CREATED_EVENT = "user.created";
const USER_UPDATED_EVENT = "user.updated";

function createPublicToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function shouldExposeDevTokens() {
  return process.env.NODE_ENV !== "production";
}

function getClientBaseUrl(req) {
  return process.env.CLIENT_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function getGoogleSuccessRedirect() {
  return process.env.GOOGLE_AUTH_SUCCESS_REDIRECT
    || `${process.env.CLIENT_BASE_URL || "http://localhost:5173"}/auth/success`;
}

async function findAccountByEmail(email) {
  const normalizedEmail = email.toLowerCase();
  const user = await userModel
    .findOne({ email: normalizedEmail })
    .select("+emailVerificationToken +emailVerificationExpires +passwordResetToken +passwordResetExpires +password");

  if (user) {
    return { account: user, isSeller: false };
  }

  const seller = await sellerModel
    .findOne({ email: normalizedEmail })
    .select("+emailVerificationToken +emailVerificationExpires +passwordResetToken +passwordResetExpires +password");

  if (seller) {
    return { account: seller, isSeller: true };
  }

  return { account: null, isSeller: false };
}

async function sendVerificationEmail(req, account) {
  const verificationToken = createPublicToken();
  account.emailVerificationToken = hashToken(verificationToken);
  account.emailVerificationExpires = new Date(Date.now() + EMAIL_TOKEN_EXPIRES_MS);
  await account.save();

  const verifyUrl = `${getClientBaseUrl(req)}/api/auth/verify-email/${verificationToken}`;
  await sendEmail({
    to: account.email,
    subject: "Verify your Ai-VendorHub email",
    text: `Verify your email by opening this link: ${verifyUrl}`,
    html: `<p>Verify your email by opening this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  return verificationToken;
}

async function sendPasswordResetEmail(req, account) {
  const resetToken = createPublicToken();
  account.passwordResetToken = hashToken(resetToken);
  account.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);
  await account.save();

  const resetUrl = `${getClientBaseUrl(req)}/api/auth/password/reset/${resetToken}`;
  await sendEmail({
    to: account.email,
    subject: "Reset your Ai-VendorHub password",
    text: `Reset your password by opening this link: ${resetUrl}`,
    html: `<p>Reset your password by opening this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  return resetToken;
}

function createAccessToken(account) {
  return jwt.sign(
    {
      id: account._id,
      username: account.username,
      email: account.email,
      role: account.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );
}

function createRefreshToken(account, tokenId) {
  return jwt.sign(
    {
      id: account._id,
      username: account.username,
      email: account.email,
      role: account.role,
      tokenId,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
  );
}

async function createAuthTokens(account) {
  const tokenId = crypto.randomUUID();
  const accessToken = createAccessToken(account);
  const refreshToken = createRefreshToken(account, tokenId);

  await redis.set(
    `refresh_${tokenId}`,
    JSON.stringify({
      accountId: account._id.toString(),
      role: account.role,
      email: account.email,
      username: account.username,
    }),
    "EX",
    REFRESH_TOKEN_TTL_SECONDS,
  );

  await addRefreshSession(account, tokenId);

  return { accessToken, refreshToken };
}

function getRefreshSessionListKey(accountId, role) {
  return `refresh_sessions_${role}_${accountId}`;
}

async function readRefreshSessions(accountId, role) {
  const rawSessions = await redis.get(getRefreshSessionListKey(accountId, role));

  if (!rawSessions) {
    return [];
  }

  try {
    const sessions = JSON.parse(rawSessions);
    return Array.isArray(sessions) ? sessions : [];
  } catch (error) {
    return [];
  }
}

async function writeRefreshSessions(accountId, role, sessions) {
  await redis.set(
    getRefreshSessionListKey(accountId, role),
    JSON.stringify(sessions),
    "EX",
    REFRESH_TOKEN_TTL_SECONDS,
  );
}

async function addRefreshSession(account, tokenId) {
  const accountId = account._id.toString();
  const role = account.role;
  const sessions = await readRefreshSessions(accountId, role);

  sessions.push({
    tokenId,
    createdAt: Date.now(),
  });

  sessions.sort((a, b) => a.createdAt - b.createdAt);

  while (sessions.length > MAX_ACTIVE_SESSIONS_PER_USER) {
    const removedSession = sessions.shift();
    if (removedSession?.tokenId) {
      await redis.del(`refresh_${removedSession.tokenId}`);
    }
  }

  await writeRefreshSessions(accountId, role, sessions);
}

async function removeRefreshSession(accountId, role, tokenId) {
  if (!accountId || !role || !tokenId) {
    return;
  }

  const sessions = await readRefreshSessions(accountId, role);
  const remainingSessions = sessions.filter((session) => session.tokenId !== tokenId);
  await writeRefreshSessions(accountId, role, remainingSessions);
}

async function revokeAllRefreshSessions(accountId, role) {
  const sessions = await readRefreshSessions(accountId, role);

  await Promise.all(sessions.map((session) => (
    session.tokenId ? redis.del(`refresh_${session.tokenId}`) : Promise.resolve()
  )));

  await redis.del(getRefreshSessionListKey(accountId, role));
}

function setAuthCookies(res, accessToken, refreshToken) {
  const commonCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  // Keep the legacy token cookie so existing services continue to work.
  res.cookie("token", accessToken, {
    ...commonCookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });

  res.cookie("accessToken", accessToken, {
    ...commonCookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });

  res.cookie("refreshToken", refreshToken, {
    ...commonCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

function clearAuthCookies(res) {
  const commonCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  res.clearCookie("token", commonCookieOptions);
  res.clearCookie("accessToken", commonCookieOptions);
  res.clearCookie("refreshToken", commonCookieOptions);
}

function extractRefreshToken(req) {
  return req.cookies?.refreshToken || req.body?.refreshToken;
}

function buildAccountPayload(account, isSeller = false) {
  const payload = {
    id: account._id,
    username: account.username,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    authProvider: account.authProvider || "local",
    emailVerified: account.emailVerified || false,
  };

  if (!isSeller) {
    payload.addresses = account.addresses || [];
  }

  return payload;
}

function buildUserEventPayload(eventName, account, isSeller = false, changes = []) {
  const payload = {
    event: eventName,
    id: account._id,
    accountId: account._id,
    username: account.username,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    accountType: isSeller ? "seller" : "user",
    authProvider: account.authProvider || "local",
    emailVerified: account.emailVerified || false,
  };

  if (changes.length > 0) {
    payload.changes = changes;
  }

  if (!isSeller) {
    payload.addresses = account.addresses || [];
  }

  return payload;
}

async function publishUserEvent(eventName, account, isSeller = false, changes = []) {
  const payload = buildUserEventPayload(eventName, account, isSeller, changes);

  await Promise.all([
    publishToQueue(`AUTH_NOTIFICATION.${eventName}`, payload),
    publishToQueue(`AUTH_SELLER_DASHBOARD.${eventName}`, payload),
  ]);
}

//REGISTER USER
async function registeruser(req, res) {
  try {
    const { username, email, password, fullName, role, address } = req.body;

    const isUserAlreadyExist = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (isUserAlreadyExist) {
      return res.status(409).json({
        message: "User already exists with this email or username",
      });
    }

    const HashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      username,
      email,
      password: HashedPassword,
      fullName: {
        firstName: fullName.firstName,
        lastName: fullName.lastName,
      },
      addresses: [
        {
          addressLine: address.addressLine,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          phone: address.phone,
          default: true,
        },
      ],
    };

    if (role) {
      userData.role = role;
    }

    const user = await userModel.create(userData);



    await publishUserEvent(USER_CREATED_EVENT, user, false);

    const emailVerificationToken = await sendVerificationEmail(req, user);

    

    const { accessToken, refreshToken } = await createAuthTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        addresses: user.addresses || [],
        role: user.role,
      },
      token: accessToken,
      accessToken,
      ...(shouldExposeDevTokens() ? { emailVerificationToken } : {}),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
}

//REGISTER SELLER

async function registerSeller(req, res) {
  try {
    const { username, email, password, fullName, role } = req.body;

    const isSellerAlreadyExist = await sellerModel.findOne({
      $or: [{ username }, { email }],
    });

    if (isSellerAlreadyExist) {
      return res.status(409).json({
        message: "Seller   already exists with this email or username",
      });
    }

    const HashedPassword = await bcrypt.hash(password, 10);
    const sellerData = {
      username,
      email,
      password: HashedPassword,
      fullName: {
        firstName: fullName.firstName,
        lastName: fullName.lastName,
      },
      role: "seller",
    };

    const seller = await sellerModel.create(sellerData);



    await publishUserEvent(USER_CREATED_EVENT, seller, true);

    const emailVerificationToken = await sendVerificationEmail(req, seller);

    

    const { accessToken, refreshToken } = await createAuthTokens(seller);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: "Seller registered successfully",
      seller: {
        username: seller.username,
        email: seller.email,
        fullName: seller.fullName,
        role: seller.role,
      },
      token: accessToken,
      accessToken,
      ...(shouldExposeDevTokens() ? { emailVerificationToken } : {}),
    });
  } catch (error) {
    console.error('Seller registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Seller registration failed',
    });
  }
}



//LOGIN USER
async function loginuser(req, res) {
  try {
    let { username, email, password } = req.body;

    // Validate required fields

    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,

        message: "Email or username and password are required",
      });
    }

    // Normalize email

    if (email) {
      email = email.toLowerCase();
    }

    // Build query dynamically

    let orConditions = [];

    if (email) {
      orConditions.push({ email });
    }

    if (username) {
      orConditions.push({ username });
    }

    // Find user

    const user = await userModel
      .findOne({
        $or: orConditions,
      })
      .select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,

        message: "Invalid username, email or password",
      });
    }

    // Compare password

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,

        message: "Invalid username, email or password",
      });
    }

    const { accessToken, refreshToken } = await createAuthTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,

      message: "Login successful",

      user: {
        id: user._id,

        username: user.username,

        email: user.email,

        fullName: user.fullName,

        addresses: user.addresses || [],

        role: user.role,
      },
      token: accessToken,
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: "Internal server error",
    });
  }
}

//LOGIN SELLER

async function loginSeller(req, res) {
  try {
    let { username, email, password } = req.body;

    // Validate required fields

    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,

        message: "Email or username and password are required",
      });
    }

    // Normalize email

    if (email) {
      email = email.toLowerCase();
    }

    // Build query dynamically

    let orConditions = [];

    if (email) {
      orConditions.push({ email });
    }

    if (username) {
      orConditions.push({ username });
    }

    // Find seller

    const seller = await sellerModel
      .findOne({
        $or: orConditions,
      })
      .select("+password");

    if (!seller) {
      return res.status(401).json({
        success: false,

        message: "Invalid username, email or password",
      });
    }

    // Compare password

    const isPasswordMatch = await bcrypt.compare(password, seller.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,

        message: "Invalid username, email or password",
      });
    }

    const { accessToken, refreshToken } = await createAuthTokens(seller);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,

      message: "Login successful",

      seller: {
        id: seller._id,

        username: seller.username,

        email: seller.email,

        fullName: seller.fullName,

       

        role: seller.role,
      },
      token: accessToken,
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: "Internal server error",
    });
  }
}

// GET CURRENT USER
async function getCurrentUser(req, res) {
  try {
    const accountId = req.user.id;
    const isSeller = req.user.role === "seller";

    // Fetch full account from database
    const account = isSeller
      ? await sellerModel.findById(accountId)
      : await userModel.findById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const accountPayload = buildAccountPayload(account, isSeller);

    return res.status(200).json({
      success: true,
      message: "Current account fetched successfully",
      [isSeller ? "seller" : "user"]: accountPayload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching account",
    });
  }
}

// UPDATE CURRENT USER/SELLER PROFILE
async function updateCurrentUser(req, res) {
  try {
    const accountId = req.user.id;
    const isSeller = req.user.role === "seller";
    const accountModel = isSeller ? sellerModel : userModel;
    const account = await accountModel.findById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const { username, email, fullName } = req.body;
    const changes = [];

    if (username && username !== account.username) {
      const [existingUser, existingSeller] = await Promise.all([
        userModel.findOne({ username, _id: { $ne: account._id } }),
        sellerModel.findOne({ username, _id: { $ne: account._id } }),
      ]);

      if (existingUser || existingSeller) {
        return res.status(409).json({
          success: false,
          message: "Username is already in use",
        });
      }

      account.username = username;
      changes.push("username");
    }

    if (email && email.toLowerCase() !== account.email) {
      const normalizedEmail = email.toLowerCase();
      const [existingUser, existingSeller] = await Promise.all([
        userModel.findOne({ email: normalizedEmail, _id: { $ne: account._id } }),
        sellerModel.findOne({ email: normalizedEmail, _id: { $ne: account._id } }),
      ]);

      if (existingUser || existingSeller) {
        return res.status(409).json({
          success: false,
          message: "Email is already in use",
        });
      }

      account.email = normalizedEmail;
      account.emailVerified = false;
      changes.push("email", "emailVerified");
    }

    if (fullName) {
      account.fullName = {
        firstName: fullName.firstName ?? account.fullName.firstName,
        lastName: fullName.lastName ?? account.fullName.lastName,
      };
      changes.push("fullName");
    }

    await account.save();

    await publishUserEvent(USER_UPDATED_EVENT, account, isSeller, changes);

    const { accessToken, refreshToken } = await createAuthTokens(account);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      [isSeller ? "seller" : "user"]: buildAccountPayload(account, isSeller),
      token: accessToken,
      accessToken,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
}

// GOOGLE AUTH CALLBACK
async function googleAuthCallback(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Google authentication failed",
      });
    }

    const { accessToken, refreshToken } = await createAuthTokens(req.user);
    setAuthCookies(res, accessToken, refreshToken);

    return res.redirect(getGoogleSuccessRedirect());

  } catch (error) {
    console.error("Google auth callback error:", error);
    return res.status(500).json({
      success: false,
      message: "Error completing Google authentication",
    });
  }
}

// REFRESH ACCESS TOKEN
async function refreshAccessToken(req, res) {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    );

    if (decoded.type !== "refresh" || !decoded.tokenId) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const session = await redis.get(`refresh_${decoded.tokenId}`);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Refresh session expired or revoked",
      });
    }

    const isSeller = decoded.role === "seller";
    const account = isSeller
      ? await sellerModel.findById(decoded.id)
      : await userModel.findById(decoded.id);

    if (!account) {
      await redis.del(`refresh_${decoded.tokenId}`);
      await removeRefreshSession(decoded.id, decoded.role, decoded.tokenId);
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    await redis.del(`refresh_${decoded.tokenId}`);
    await removeRefreshSession(decoded.id, decoded.role, decoded.tokenId);
    const tokens = await createAuthTokens(account);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      [isSeller ? "seller" : "user"]: buildAccountPayload(account, isSeller),
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
}

// LOGOUT USER
async function   logoutUser(req, res) {
  try {
    const token = req.cookies?.token || req.cookies?.accessToken;
    const refreshToken = extractRefreshToken(req);

    if (token) {
      try {
        // Add token to Redis blacklist
        await redis.set(`blacklist_${token}`, "true", "EX", Math.ceil(ACCESS_TOKEN_MAX_AGE_MS / 1000));
      } catch (redisError) {
        // Log redis error but don't fail the logout
        console.warn("Redis error during logout:", redisError.message);
      }
    }

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        );

        if (decoded.tokenId) {
          await redis.del(`refresh_${decoded.tokenId}`);
          await removeRefreshSession(decoded.id, decoded.role, decoded.tokenId);
        }
      } catch (refreshError) {
        console.warn("Refresh token revoke skipped:", refreshError.message);
      }
    }

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error logging out",
    });
  }
}

// LOGOUT FROM ALL DEVICES
async function logoutAllDevices(req, res) {
  try {
    const accountId = req.user.id;
    const role = req.user.role;
    const token = req.cookies?.token || req.cookies?.accessToken || req.headers?.authorization?.split(" ")[1];

    await revokeAllRefreshSessions(accountId, role);

    if (token) {
      try {
        await redis.set(`blacklist_${token}`, "true", "EX", Math.ceil(ACCESS_TOKEN_MAX_AGE_MS / 1000));
      } catch (redisError) {
        console.warn("Redis error during logout all:", redisError.message);
      }
    }

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error logging out from all devices",
    });
  }
}

async function findAccountByEmailToken(token, tokenField, expiresField) {
  const hashedToken = hashToken(token);
  const query = {
    [tokenField]: hashedToken,
    [expiresField]: { $gt: new Date() },
  };
  const selectFields = `+${tokenField} +${expiresField} +password`;

  const user = await userModel.findOne(query).select(selectFields);
  if (user) {
    return { account: user, isSeller: false };
  }

  const seller = await sellerModel.findOne(query).select(selectFields);
  if (seller) {
    return { account: seller, isSeller: true };
  }

  return { account: null, isSeller: false };
}

async function requestEmailVerification(req, res) {
  try {
    const isSeller = req.user.role === "seller";
    const account = isSeller
      ? await sellerModel.findById(req.user.id).select("+emailVerificationToken +emailVerificationExpires")
      : await userModel.findById(req.user.id).select("+emailVerificationToken +emailVerificationExpires");

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    if (account.emailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
      });
    }

    const emailVerificationToken = await sendVerificationEmail(req, account);

    return res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
      ...(shouldExposeDevTokens() ? { emailVerificationToken } : {}),
    });
  } catch (error) {
    console.error("Error requesting email verification:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending verification email",
    });
  }
}

async function verifyEmail(req, res) {
  try {
    const token = req.params.token || req.body.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const { account, isSeller } = await findAccountByEmailToken(
      token,
      "emailVerificationToken",
      "emailVerificationExpires",
    );

    if (!account) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    account.emailVerified = true;
    account.emailVerificationToken = undefined;
    account.emailVerificationExpires = undefined;
    await account.save();

    await publishUserEvent(USER_UPDATED_EVENT, account, isSeller, ["emailVerified"]);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      [isSeller ? "seller" : "user"]: buildAccountPayload(account, isSeller),
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying email",
    });
  }
}

async function forgotPassword(req, res) {
  try {
    const { account } = await findAccountByEmail(req.body.email);

    let passwordResetToken;
    if (account) {
      passwordResetToken = await sendPasswordResetEmail(req, account);
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent",
      ...(account && shouldExposeDevTokens() ? { passwordResetToken } : {}),
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return res.status(500).json({
      success: false,
      message: "Error requesting password reset",
    });
  }
}

async function resetPassword(req, res) {
  try {
    const token = req.params.token || req.body.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is required",
      });
    }

    const { account, isSeller } = await findAccountByEmailToken(
      token,
      "passwordResetToken",
      "passwordResetExpires",
    );

    if (!account) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    account.password = await bcrypt.hash(req.body.password, 10);
    account.passwordResetToken = undefined;
    account.passwordResetExpires = undefined;
    await account.save();

    await revokeAllRefreshSessions(account._id.toString(), account.role);

    await publishToQueue(isSeller ? "AUTH_NOTIFICATION.SELLER_PASSWORD_RESET" : "AUTH_NOTIFICATION.USER_PASSWORD_RESET", {
      id: account._id,
      username: account.username,
      email: account.email,
      fullName: account.fullName,
      role: account.role,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      success: false,
      message: "Error resetting password",
    });
  }
}

// GET USER ADDRESSES
async function getUserAddresses(req, res) {
  try {
    // Check if user is a seller (sellers don't have addresses)
    if (req.user.role === "seller") {
      return res.status(403).json({
        success: false,
        message: "Sellers cannot access address endpoints",
      });
    }

    const userId = req.user.id;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      addresses: user.addresses || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching addresses",
    });
  }
}

// ADD ADDRESS
async function addAddress(req, res) {
  try {
    // Check if user is a seller (sellers don't have addresses)
    if (req.user.role === "seller") {
      return res.status(403).json({
        success: false,
        message: "Sellers cannot access address endpoints",
      });
    }

    const { addressLine, city, state, pincode, phone } = req.body;

    // Validate required fields
    if (!addressLine || !city || !state || !pincode || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate pincode format (6 digits)
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be 6 digits",
      });
    }

    // Validate phone format (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    const userId = req.user.id;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create new address
    const newAddress = {
      addressLine,
      city,
      state,
      pincode,
      phone,
      default: user.addresses.length === 0, // First address is default
    };

    user.addresses.push(newAddress);
    await user.save();
    await publishUserEvent(USER_UPDATED_EVENT, user, false, ["addresses"]);

    // Get the added address
    const addedAddress = user.addresses[user.addresses.length - 1];

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: addedAddress,
      addresses: user.addresses || [],
    });
  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding address",
    });
  }
}

// DELETE ADDRESS
async function deleteAddress(req, res) {
  try {
    // Check if user is a seller (sellers don't have addresses)
    if (req.user.role === "seller") {
      return res.status(403).json({
        success: false,
        message: "Sellers cannot access address endpoints",
      });
    }

    const { addressId } = req.params;
    const userId = req.user.id;

    // Validate address ID format
    if (!addressId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID format",
      });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find the address to delete
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Remove the address
    const wasDefault = user.addresses[addressIndex].default;
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default and there are remaining addresses, set first as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].default = true;
    }

    await user.save();
    await publishUserEvent(USER_UPDATED_EVENT, user, false, ["addresses"]);

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting address",
    });
  }
}

module.exports = {
  registeruser,
  loginuser,
  logoutUser,
  getCurrentUser,
  getUserAddresses,
  addAddress,
  deleteAddress,
  registerSeller,
  loginSeller,
  updateCurrentUser,
  googleAuthCallback,
  refreshAccessToken,
  logoutAllDevices,
  requestEmailVerification,
  verifyEmail,
  forgotPassword,
  resetPassword
};
