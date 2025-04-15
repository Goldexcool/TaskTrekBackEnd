const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true // Enable debugging
});

// Test email connection
const testEmailConnection = async () => {
  try {
    console.log('Testing email connection...');
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email connection error:', error);
    return false;
  }
};

// Call this when your server starts
testEmailConnection();

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    console.log(`Attempting to send password reset email to: ${email}`);
    console.log(`Using email credentials: ${process.env.EMAIL_USER}`);
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: `"TaskTrek Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>TaskTrek Password Reset</h1>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send password reset confirmation
const sendPasswordResetConfirmationEmail = async (email) => {
  try {
    console.log(`Sending password reset confirmation to: ${email}`);
    
    const mailOptions = {
      from: `"TaskTrek Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Successful',
      html: `
        <h1>Password Reset Successful</h1>
        <p>Your password has been reset successfully.</p>
        <p>If you did not reset your password, please contact support immediately.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset confirmation email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    throw new Error('Failed to send password reset confirmation email');
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  try {
    console.log(`Sending welcome email to: ${user.email}`);
    
    const mailOptions = {
      from: `"TaskTrek" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Welcome to TaskTrek! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4CAF50;">Welcome to TaskTrek! 🚀</h1>
            <img src="https://via.placeholder.com/150?text=TaskTrek" alt="TaskTrek Logo" style="max-width: 150px; margin: 10px 0;">
          </div>
          
          <div style="margin-bottom: 25px; line-height: 1.5;">
            <p>Hello <strong>${user.username}</strong>,</p>
            <p>Thank you for joining TaskTrek! We're excited to have you onboard.</p>
            <p>TaskTrek is a powerful task management platform designed to help you and your team stay organized and boost productivity.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 25px;">
            <h3 style="color: #333; margin-top: 0;">Getting Started</h3>
            <ul style="padding-left: 20px; margin-bottom: 0;">
              <li>Create your first board</li>
              <li>Add columns to organize your workflow</li>
              <li>Create tasks and assign them to team members</li>
              <li>Track progress with our intuitive interface</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Dashboard</a>
          </div>
          
          <div style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p>If you have any questions, feel free to contact our support team at <a href="mailto:support@tasktrek.com" style="color: #4CAF50;">support@tasktrek.com</a></p>
            <p>© ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // We don't want to throw here as welcome email is not critical
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
  sendWelcomeEmail // Add this to exports
};