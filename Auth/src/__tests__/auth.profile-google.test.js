const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const testSetup = require('./setup');
const app = require('../app');
const userModel = require('../Models/user.model');
const sellerModel = require('../Models/seller.model');
const { publishToQueue } = require('../Broker/broker');

beforeAll(async () => {
  await testSetup.connect();
});

afterEach(async () => {
  await testSetup.clearDatabase();
  publishToQueue.mockClear();
});

afterAll(async () => {
  await testSetup.closeDatabase();
});

const createToken = (account) => jwt.sign({
  id: account._id,
  username: account.username,
  email: account.email,
  role: account.role,
}, process.env.JWT_SECRET, { expiresIn: '1h' });

const getCookieValue = (response, cookieName) => {
  const cookies = response.headers['set-cookie'] || [];
  const cookie = cookies.find((entry) => entry.startsWith(`${cookieName}=`));
  return cookie?.split(';')[0].split('=').slice(1).join('=');
};

describe('PATCH /api/auth/users/me - Profile Update', () => {
  it('updates the current user profile and returns a fresh token', async () => {
    const user = await userModel.create({
      username: 'olduser',
      email: 'old@example.com',
      password: 'hashed-password',
      fullName: {
        firstName: 'Old',
        lastName: 'Name',
      },
      addresses: [{
        addressLine: '123 Old Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        phone: '9876543210',
        default: true,
      }],
    });

    const response = await request(app)
      .patch('/api/auth/users/me')
      .set('Authorization', `Bearer ${createToken(user)}`)
      .send({
        username: 'newuser',
        email: 'new@example.com',
        fullName: {
          firstName: 'New',
          lastName: 'Name',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.username).toBe('newuser');
    expect(response.body.user.email).toBe('new@example.com');
    expect(response.body.user.fullName.firstName).toBe('New');
    expect(response.body.token).toBeDefined();

    const updatedUser = await userModel.findById(user._id);
    expect(updatedUser.username).toBe('newuser');
    expect(updatedUser.email).toBe('new@example.com');

    expect(publishToQueue).toHaveBeenCalledWith(
      'AUTH_NOTIFICATION.user.updated',
      expect.objectContaining({
        event: 'user.updated',
        email: 'new@example.com',
        changes: expect.arrayContaining(['username', 'email', 'emailVerified', 'fullName']),
      }),
    );
    expect(publishToQueue).toHaveBeenCalledWith(
      'AUTH_SELLER_DASHBOARD.user.updated',
      expect.objectContaining({
        event: 'user.updated',
        accountType: 'user',
      }),
    );
  });

  it('rejects duplicate email across users and sellers', async () => {
    const user = await userModel.create({
      username: 'regularuser',
      email: 'regular@example.com',
      password: 'hashed-password',
      fullName: {
        firstName: 'Regular',
        lastName: 'User',
      },
      addresses: [],
    });

    await sellerModel.create({
      username: 'selleruser',
      email: 'seller@example.com',
      password: 'hashed-password',
      fullName: {
        firstName: 'Seller',
        lastName: 'User',
      },
    });

    const response = await request(app)
      .patch('/api/auth/users/me')
      .set('Authorization', `Bearer ${createToken(user)}`)
      .send({ email: 'seller@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Email is already in use');
  });

  it('rejects protected fields', async () => {
    const user = await userModel.create({
      username: 'protecteduser',
      email: 'protected@example.com',
      password: 'hashed-password',
      fullName: {
        firstName: 'Protected',
        lastName: 'User',
      },
      addresses: [],
    });

    const response = await request(app)
      .patch('/api/auth/users/me')
      .set('Authorization', `Bearer ${createToken(user)}`)
      .send({ role: 'seller' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Cannot update protected fields');
  });
});

describe('Google Auth routes', () => {
  it('returns 503 when Google auth is not configured', async () => {
    const response = await request(app).get('/api/auth/google');

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Google authentication is not configured');
  });
});

describe('POST /api/auth/refresh - Refresh Token Flow', () => {
  it('refreshes access token using the refresh token returned at login', async () => {
    await userModel.create({
      username: 'refreshuser',
      email: 'refresh@example.com',
      password: await bcrypt.hash('Password123', 10),
      fullName: {
        firstName: 'Refresh',
        lastName: 'User',
      },
      addresses: [],
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'refresh@example.com',
        password: 'Password123',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toBeDefined();
    const loginRefreshToken = getCookieValue(loginResponse, 'refreshToken');
    expect(loginRefreshToken).toBeDefined();

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${loginRefreshToken}`]);

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(getCookieValue(refreshResponse, 'refreshToken')).toBeDefined();
    expect(refreshResponse.body.user.email).toBe('refresh@example.com');
  });

  it('rejects missing refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Refresh token is required');
  });

  it('rotates refresh tokens and rejects reuse of the old refresh token', async () => {
    await userModel.create({
      username: 'rotateuser',
      email: 'rotate@example.com',
      password: await bcrypt.hash('Password123', 10),
      fullName: {
        firstName: 'Rotate',
        lastName: 'User',
      },
      addresses: [],
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'rotate@example.com',
        password: 'Password123',
      });

    const firstRefreshToken = getCookieValue(loginResponse, 'refreshToken');
    expect(firstRefreshToken).toBeDefined();

    const firstRefreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${firstRefreshToken}`]);

    expect(firstRefreshResponse.status).toBe(200);

    const reuseResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${firstRefreshToken}`]);

    expect(reuseResponse.status).toBe(401);
    expect(reuseResponse.body.message).toBe('Refresh session expired or revoked');
  });

  it('keeps only five active sessions per user', async () => {
    await userModel.create({
      username: 'limituser',
      email: 'limit@example.com',
      password: await bcrypt.hash('Password123', 10),
      fullName: {
        firstName: 'Limit',
        lastName: 'User',
      },
      addresses: [],
    });

    const refreshTokens = [];

    for (let index = 0; index < 6; index += 1) {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'limit@example.com',
          password: 'Password123',
        });

      expect(loginResponse.status).toBe(200);
      refreshTokens.push(getCookieValue(loginResponse, 'refreshToken'));
    }

    const oldestRefreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshTokens[0]}`]);

    expect(oldestRefreshResponse.status).toBe(401);
    expect(oldestRefreshResponse.body.message).toBe('Refresh session expired or revoked');

    const newestRefreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshTokens[5]}`]);

    expect(newestRefreshResponse.status).toBe(200);
  });

  it('logs out all active sessions for the current user', async () => {
    await userModel.create({
      username: 'alllogoutuser',
      email: 'alllogout@example.com',
      password: await bcrypt.hash('Password123', 10),
      fullName: {
        firstName: 'All',
        lastName: 'Logout',
      },
      addresses: [],
    });

    const firstLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alllogout@example.com',
        password: 'Password123',
      });

    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alllogout@example.com',
        password: 'Password123',
      });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);

    const logoutAllResponse = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`);

    expect(logoutAllResponse.status).toBe(200);
    expect(logoutAllResponse.body.message).toBe('Logged out from all devices successfully');

    const secondRefreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${getCookieValue(secondLogin, 'refreshToken')}`]);

    expect(secondRefreshResponse.status).toBe(401);
    expect(secondRefreshResponse.body.message).toBe('Refresh session expired or revoked');
  });
});

describe('Email verification and password reset', () => {
  it('verifies a registered user email using the generated token', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'verifyuser',
        email: 'verify@example.com',
        password: 'Password123',
        fullName: {
          firstName: 'Verify',
          lastName: 'User',
        },
        address: {
          addressLine: '123 Verify Lane',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          phone: '9876543210',
        },
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.emailVerificationToken).toBeDefined();
    expect(publishToQueue).toHaveBeenCalledWith(
      'AUTH_NOTIFICATION.user.created',
      expect.objectContaining({
        event: 'user.created',
        email: 'verify@example.com',
        accountType: 'user',
      }),
    );
    expect(publishToQueue).toHaveBeenCalledWith(
      'AUTH_SELLER_DASHBOARD.user.created',
      expect.objectContaining({
        event: 'user.created',
        email: 'verify@example.com',
      }),
    );

    const verifyResponse = await request(app)
      .get(`/api/auth/verify-email/${registerResponse.body.emailVerificationToken}`);

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.message).toBe('Email verified successfully');

    const user = await userModel.findOne({ email: 'verify@example.com' });
    expect(user.emailVerified).toBe(true);
    expect(publishToQueue).toHaveBeenCalledWith(
      'AUTH_NOTIFICATION.user.updated',
      expect.objectContaining({
        event: 'user.updated',
        emailVerified: true,
        changes: ['emailVerified'],
      }),
    );
  });

  it('resends verification token for authenticated unverified user', async () => {
    const user = await userModel.create({
      username: 'resenduser',
      email: 'resend@example.com',
      password: await bcrypt.hash('Password123', 10),
      emailVerified: false,
      fullName: {
        firstName: 'Resend',
        lastName: 'User',
      },
      addresses: [],
    });

    const response = await request(app)
      .post('/api/auth/verify-email/request')
      .set('Authorization', `Bearer ${createToken(user)}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Verification email sent successfully');
    expect(response.body.emailVerificationToken).toBeDefined();
  });

  it('generates a password reset token and resets password', async () => {
    await userModel.create({
      username: 'resetuser',
      email: 'reset@example.com',
      password: await bcrypt.hash('OldPassword123', 10),
      fullName: {
        firstName: 'Reset',
        lastName: 'User',
      },
      addresses: [],
    });

    const forgotResponse = await request(app)
      .post('/api/auth/password/forgot')
      .send({ email: 'reset@example.com' });

    expect(forgotResponse.status).toBe(200);
    expect(forgotResponse.body.passwordResetToken).toBeDefined();

    const resetResponse = await request(app)
      .post(`/api/auth/password/reset/${forgotResponse.body.passwordResetToken}`)
      .send({ password: 'NewPassword123' });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.message).toBe('Password reset successfully');

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'reset@example.com',
        password: 'NewPassword123',
      });

    expect(loginResponse.status).toBe(200);
  });

  it('returns a generic response for forgot password when email does not exist', async () => {
    const response = await request(app)
      .post('/api/auth/password/forgot')
      .send({ email: 'missing@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('If an account exists with this email, a password reset link has been sent');
    expect(response.body.passwordResetToken).toBeUndefined();
  });
});
