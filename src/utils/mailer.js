const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  headers: {
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    Importance: 'high'
  }
});


const sendPasswordResetEmail = async (
  to,
  name,
  resetLink
) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #111827;
            background-color: #F9FAFB;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            margin-top: 40px;
            margin-bottom: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #6366F1, #7C3AED);
            padding: 40px;
            text-align: center;
            color: white;
          }
          
          .header h1 {
            font-size: 26px;
            font-weight: 700;
            margin: 0;
          }
          
          .content {
            padding: 40px;
            text-align: center;
          }
          
          .icon {
            width: 90px;
            height: 90px;
            background-color: #EEF2FF;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 28px;
          }
          
          .icon svg {
            width: 45px;
            height: 45px;
            color: #6366F1;
          }
          
          h2 {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
          }
          
          p {
            color: #4B5563;
            font-size: 16px;
            margin-bottom: 24px;
          }
          
          .expire-notice {
            font-size: 14px;
            color: #6B7280;
            margin-top: 32px;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366F1, #7C3AED);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 500;
            margin-top: 12px;
            margin-bottom: 28px;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);
            transition: all 0.2s ease;
          }
          
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 10px -1px rgba(99, 102, 241, 0.5);
          }
          
          .footer {
            background-color: #F9FAFB;
            padding: 24px;
            text-align: center;
            color: #6B7280;
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
          }
          
          .footer p {
            margin: 0;
            color: #6B7280;
          }
          
          .divider {
            height: 1px;
            background-color: #E5E7EB;
            margin: 28px 0;
          }
          
          .help-text {
            font-size: 14px;
            color: #4B5563;
            margin-top: 24px;
          }
          
          .manual-link {
            word-break: break-all;
            color: #6366F1;
            text-decoration: none;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TaskTrek</h1>
          </div>
          
          <div class="content">
            <div class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            
            <h2>Reset Your Password</h2>
            
            <p>Hi ${name},</p>
            
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <a href="${resetLink}" class="button">Reset Password</a>
            
            <p class="expire-notice">This link will expire in 1 hour for security reasons.</p>
            
            <div class="divider"></div>
            
            <p class="help-text">If the button above doesn't work, copy and paste this link into your browser:</p>
            
            <a href="${resetLink}" class="manual-link">${resetLink}</a>
            
            <p class="help-text">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"TaskTrek Security" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Reset Your TaskTrek Password',
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { 
      success: false, 
      error: `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

/**
 * Send password reset confirmation email
 */
const sendPasswordResetConfirmationEmail = async (
  to,
  name
) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #111827;
            background-color: #F9FAFB;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            margin-top: 40px;
            margin-bottom: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #6366F1, #7C3AED);
            padding: 40px;
            text-align: center;
            color: white;
          }
          
          .header h1 {
            font-size: 26px;
            font-weight: 700;
            margin: 0;
          }
          
          .content {
            padding: 40px;
            text-align: center;
          }
          
          .icon {
            width: 90px;
            height: 90px;
            background-color: #ECFDF5;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 28px;
          }
          
          .icon svg {
            width: 45px;
            height: 45px;
            color: #10B981;
          }
          
          h2 {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
          }
          
          p {
            color: #4B5563;
            font-size: 16px;
            margin-bottom: 24px;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366F1, #7C3AED);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 500;
            margin-top: 12px;
            margin-bottom: 28px;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);
            transition: all 0.2s ease;
          }
          
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 10px -1px rgba(99, 102, 241, 0.5);
          }
          
          .footer {
            background-color: #F9FAFB;
            padding: 24px;
            text-align: center;
            color: #6B7280;
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
          }
          
          .footer p {
            margin: 0;
            color: #6B7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TaskTrek</h1>
          </div>
          
          <div class="content">
            <div class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            
            <h2>Password Reset Successful</h2>
            
            <p>Hi ${name},</p>
            
            <p>Your password has been successfully reset. You can now log in to your account using your new password.</p>
            
            <p>If you did not request this change, please contact our support team immediately.</p>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Log In to Your Account</a>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"TaskTrek Security" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Your Password Has Been Reset',
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    return { 
      success: false, 
      error: `Failed to send password reset confirmation email: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail
};