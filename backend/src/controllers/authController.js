const User = require('../models/User');
const AppError = require('../utils/AppError');
const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Register new user
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new AppError('User already exists with this email', StatusCodes.CONFLICT);
  }

  // Create new user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName
  });

  // Generate token
  const token = user.generateAuthToken();

  logger.info(`New user registered: ${email}`, { userId: user._id, requestId: res.locals.requestId });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    },
    requestId: res.locals.requestId
  });
});

/**
 * Login user
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findByEmail(email).select('+password');

  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED);
  }

  // Check if account is locked
  if (user.isLocked) {
    throw new AppError('Account is locked. Please try again later.', StatusCodes.UNAUTHORIZED);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    // Increment login attempts
    await user.incLoginAttempts();
    throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED);
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate token
  const token = user.generateAuthToken();

  logger.info(`User logged in: ${email}`, { userId: user._id, requestId: res.locals.requestId });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin
      },
      token
    },
    requestId: res.locals.requestId
  });
});

/**
 * Get current user profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.json({
    success: true,
    data: { user },
    requestId: res.locals.requestId
  });
});

/**
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, profile, preferences } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(profile && { profile }),
      ...(preferences && { preferences })
    },
    {
      new: true,
      runValidators: true
    }
  );

  logger.info(`Profile updated for user: ${user.email}`, {
    userId: user._id,
    requestId: res.locals.requestId
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
    requestId: res.locals.requestId
  });
});

/**
 * Change password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', StatusCodes.BAD_REQUEST);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`, {
    userId: user._id,
    requestId: res.locals.requestId
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
    requestId: res.locals.requestId
  });
});

/**
 * Forgot password - send reset token
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findByEmail(email);
  if (!user) {
    // Don't reveal if user exists for security
    return res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // In production, send email with reset token
  // For now, we'll just log it (remove in production!)
  logger.info(`Password reset token for ${email}: ${resetToken}`, {
    userId: user._id,
    requestId: res.locals.requestId
  });

  // TODO: Send email with reset token
  // await sendEmail({
  //   to: user.email,
  //   subject: 'Password Reset',
  //   html: `Your password reset token: ${resetToken}`
  // });

  res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been sent.',
    requestId: res.locals.requestId
  });
});

/**
 * Reset password with token
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Hash the token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new AppError('Token is invalid or has expired', StatusCodes.BAD_REQUEST);
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Generate new token for immediate login
  const authToken = user.generateAuthToken();

  logger.info(`Password reset for user: ${user.email}`, {
    userId: user._id,
    requestId: res.locals.requestId
  });

  res.json({
    success: true,
    message: 'Password reset successfully',
    data: {
      token: authToken
    },
    requestId: res.locals.requestId
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};


