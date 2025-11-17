const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

/**
 * Initialize email transporter
 */
const initEmail = () => {
  try {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email configuration not provided, email service disabled');
    }
  } catch (error) {
    logger.error('Failed to initialize email transporter:', error);
  }
};

/**
 * Send email
 */
const sendEmail = async (options) => {
  if (!transporter) {
    logger.warn('Email transporter not initialized, skipping email send');
    return false;
  }

  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Backend API'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`, { to: options.to });
    return true;
  } catch (error) {
    logger.error('Error sending email:', error);
    return false;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const message = `
    <h2>Password Reset Request</h2>
    <p>Hello ${user.firstName},</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>Or copy and paste this URL into your browser:</p>
    <p>${resetURL}</p>
    <p>This link will expire in 10 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html: message
  });
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (user) => {
  const message = `
    <h2>Welcome to Our Platform!</h2>
    <p>Hello ${user.firstName},</p>
    <p>Thank you for registering with us. We're excited to have you on board!</p>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <p>Best regards,<br>The Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome!',
    html: message
  });
};

module.exports = {
  initEmail,
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};


