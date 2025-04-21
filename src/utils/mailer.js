const nodemailer = require('nodemailer');

console.log('Setting up email transporter with:', {
  user: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '...' : 'undefined',
  pass: process.env.EMAIL_PASS ? '[REDACTED]' : 'undefined'
});

// Create reusable transporter
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing! Check your .env file');
    return null;
  }
  
  // Create new transporter
  transporter = nodemailer.createTransport({
    service: 'gmail',  // Use Gmail service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS  // This should be an app password
    },
    logger: true 
  });
  
  return transporter;
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    console.log(`Attempting to send password reset email to: ${email}`);
    
    const transport = getTransporter();
    if (!transport) {
      throw new Error('Email transporter not configured');
    }
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: `"TaskTrek Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="background: #f9fafc; margin: 0; padding: 20px 0; font-family: 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif; color: #1c2540;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08);">
            <!-- Header -->
            <div style="background: linear-gradient(to right, #2e5bff, #4466f2); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-weight: 600; font-size: 24px;">
                <span style="font-weight: 800;">Task</span>Trek
              </h1>
              <p style="color: rgba(255, 255, 255, 0.85); margin: 5px 0 0 0; font-size: 15px;">Enterprise Task Management</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <div style="margin-bottom: 25px;">
                <div style="display: inline-block; width: 60px; height: 60px; background-color: rgba(46, 91, 255, 0.1); border-radius: 50%; text-align: center; line-height: 60px;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="#2e5bff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              
              <h2 style="color: #1c2540; font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 15px;">Reset Your Password</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #4e5d78; margin-bottom: 25px;">A request has been received to change the password for your TaskTrek account. This link will be valid for the next 15 minutes.</p>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${resetUrl}" style="display: inline-block; padding: 14px 36px; background: #2e5bff; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500; transition: all 0.2s ease;">Reset Password</a>
              </div>
              
              <div style="background-color: #f7faff; border-left: 4px solid #2e5bff; padding: 18px; margin-top: 30px; border-radius: 4px;">
                <p style="font-size: 15px; color: #4e5d78; margin: 0;">If you did not request a password change, please ignore this email or contact support if you have questions.</p>
              </div>
              
              <div style="margin-top: 30px; color: #8492a6; font-size: 14px;">
                <p>If the button doesn't work, copy and paste this URL into your browser:</p>
                <p style="background-color: #f5f7fa; padding: 12px; border-radius: 6px; font-family: monospace; word-break: break-all; margin: 10px 0 0 0; font-size: 13px;">${resetUrl}</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f7fa; padding: 25px 30px; text-align: center;">
              <p style="color: #8492a6; font-size: 14px; margin: 0 0 10px 0;">© ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
              <p style="color: #8492a6; font-size: 13px; margin: 0;">
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Terms</a>
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Privacy</a>
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Support</a>
              </p>
            </div>
          </div>
        </div>
      `
    };
    
    const info = await transport.sendMail(mailOptions);
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
    
    const transport = getTransporter();
    if (!transport) {
      throw new Error('Email transporter not configured');
    }
    
    const mailOptions = {
      from: `"TaskTrek Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Successful',
      html: `
        <div style="background: #f9fafc; margin: 0; padding: 20px 0; font-family: 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif; color: #1c2540;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08);">
            <!-- Header -->
            <div style="background: linear-gradient(to right, #2e5bff, #4466f2); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-weight: 600; font-size: 24px;">
                <span style="font-weight: 800;">Task</span>Trek
              </h1>
              <p style="color: rgba(255, 255, 255, 0.85); margin: 5px 0 0 0; font-size: 15px;">Enterprise Task Management</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px; text-align: center;">
              <div style="margin-bottom: 30px;">
                <div style="display: inline-block; width: 70px; height: 70px; background-color: rgba(45, 206, 137, 0.1); border-radius: 50%; text-align: center; line-height: 70px;">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#2dce89" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              
              <h2 style="color: #1c2540; font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 15px;">Password Updated Successfully</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #4e5d78; margin-bottom: 25px;">Your TaskTrek account password has been changed successfully. You can now log in with your new credentials.</p>
              
              <div style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; padding: 14px 36px; background: #2e5bff; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500; transition: all 0.2s ease;">Log In</a>
              </div>
              
              <div style="background-color: #fff7ed; border-left: 4px solid #ff7849; padding: 18px; margin-top: 30px; border-radius: 4px; text-align: left;">
                <h4 style="color: #ff7849; font-size: 15px; margin-top: 0; margin-bottom: 10px; font-weight: 600;">Security Notice</h4>
                <p style="font-size: 14px; color: #4e5d78; margin: 0;">If you did not initiate this password change, please contact our security team immediately at <a href="mailto:security@tasktrek.com" style="color: #2e5bff; font-weight: 500;">security@tasktrek.com</a></p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f7fa; padding: 25px 30px; text-align: center;">
              <p style="color: #8492a6; font-size: 14px; margin: 0 0 10px 0;">© ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
              <p style="color: #8492a6; font-size: 13px; margin: 0;">
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Terms</a>
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Privacy</a>
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Support</a>
              </p>
            </div>
          </div>
        </div>
      `
    };
    
    const info = await transport.sendMail(mailOptions);
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
    
    const transport = getTransporter();
    if (!transport) {
      console.error('Email transporter not configured');
      return false;
    }
    
    const mailOptions = {
      from: `"TaskTrek Team" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Welcome to TaskTrek - Your Productivity Journey Begins',
      html: `
        <div style="background: #f9fafc; margin: 0; padding: 20px 0; font-family: 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif; color: #1c2540;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08);">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #2e5bff, #4466f2); height: 160px; position: relative;">
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%;">
                <h1 style="margin: 0; color: #ffffff; font-weight: 700; font-size: 32px; letter-spacing: -0.5px;">
                  Welcome to <span style="font-weight: 800;">TaskTrek</span>
                </h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px; letter-spacing: 0.2px;">Elevate your productivity</p>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1c2540; font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 15px;">Hello ${user.name || user.username},</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #4e5d78; margin-bottom: 25px;">Thank you for joining TaskTrek! Your account has been successfully created and is ready to use. We're excited to help you organize your tasks and boost your productivity.</p>
              
              <!-- Features Section -->
              <div style="margin: 35px 0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                <div style="background: #fbfdff; padding: 25px; border-bottom: 1px solid #f0f4f8;">
                  <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="min-width: 24px; margin-right: 15px;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="#2e5bff" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </div>
                    <h3 style="margin: 0; font-size: 17px; color: #1c2540; font-weight: 600;">Intelligent Task Management</h3>
                  </div>
                  <p style="margin: 0 0 0 39px; color: #4e5d78; font-size: 15px; line-height: 1.5;">Create and organize tasks with smart prioritization and AI suggestions.</p>
                </div>
                
                <div style="background: #ffffff; padding: 25px; border-bottom: 1px solid #f0f4f8;">
                  <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="min-width: 24px; margin-right: 15px;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 20H7C5.89543 20 5 19.1046 5 18V8M19 14C19 14.7956 18.6839 15.5587 18.1213 16.1213C17.5587 16.6839 16.7956 17 16 17C15.2044 17 14.4413 16.6839 13.8787 16.1213C13.3161 15.5587 13 14.7956 13 14C13 13.2044 13.3161 12.4413 13.8787 11.8787C14.4413 11.3161 15.2044 11 16 11C16.7956 11 17.5587 11.3161 18.1213 11.8787C18.6839 12.4413 19 13.2044 19 14Z" stroke="#5d45e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M13 14H5M9 6V4M15 6V4M16 14L17 15" stroke="#5d45e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5 11H13M5 15H9M19 8V6C19 5.46957 18.7893 4.96086 18.4142 4.58579C18.0391 4.21071 17.5304 4 17 4H7C6.46957 4 5.96086 4.21071 5.58579 4.58579C5.21071 4.96086 5 5.46957 5 6V8" stroke="#5d45e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <h3 style="margin: 0; font-size: 17px; color: #1c2540; font-weight: 600;">Time Management</h3>
                  </div>
                  <p style="margin: 0 0 0 39px; color: #4e5d78; font-size: 15px; line-height: 1.5;">Track time, set deadlines, and receive timely reminders to stay on schedule.</p>
                </div>
                
                <div style="background: #fbfdff; padding: 25px;">
                  <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="min-width: 24px; margin-right: 15px;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="#2dce89" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <h3 style="margin: 0; font-size: 17px; color: #1c2540; font-weight: 600;">Team Collaboration</h3>
                  </div>
                  <p style="margin: 0 0 0 39px; color: #4e5d78; font-size: 15px; line-height: 1.5;">Work together seamlessly with shared workspaces and real-time updates.</p>
                </div>
              </div>
              
              <div style="margin: 35px 0; text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 14px 36px; background: #2e5bff; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500; transition: all 0.2s ease;">Get Started Now</a>
              </div>
              
              <div style="background-color: #f0f7ff; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <h4 style="color: #1c2540; font-size: 16px; margin-top: 0; margin-bottom: 10px;">Need Help?</h4>
                <p style="color: #4e5d78; font-size: 14px; margin: 0;">Check out our <a href="#" style="color: #2e5bff; text-decoration: none; font-weight: 500;">Getting Started Guide</a> or contact our support team at <a href="mailto:support@tasktrek.com" style="color: #2e5bff; text-decoration: none; font-weight: 500;">support@tasktrek.com</a></p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f7fa; padding: 25px 30px; text-align: center;">
              <div style="margin-bottom: 20px;">
                <a href="#" style="display: inline-block; margin: 0 8px;">
                  <img src="https://cdn-icons-png.flaticon.com/128/733/733579.png" width="24" height="24" alt="Twitter" style="opacity: 0.7;">
                </a>
                <a href="#" style="display: inline-block; margin: 0 8px;">
                  <img src="https://cdn-icons-png.flaticon.com/128/733/733547.png" width="24" height="24" alt="Facebook" style="opacity: 0.7;">
                </a>
                <a href="#" style="display: inline-block; margin: 0 8px;">
                  <img src="https://cdn-icons-png.flaticon.com/128/3670/3670147.png" width="24" height="24" alt="LinkedIn" style="opacity: 0.7;">
                </a>
              </div>
              <p style="color: #8492a6; font-size: 14px; margin: 0 0 10px 0;">© ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
              <p style="color: #8492a6; font-size: 13px; margin: 0;">
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Terms</a>
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Privacy</a>
                <a href="#" style="color: #2e5bff; text-decoration: none; margin: 0 8px;">Preferences</a>
              </p>
            </div>
          </div>
        </div>
      `
    };
    
    const info = await transport.sendMail(mailOptions);
    console.log(`Welcome email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // We don't want to throw here as welcome email is not critical
    return false;
  }
};

// Export all email-related functions
const availableMailerFunctions = {
  sendPasswordResetEmail: typeof sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail: typeof sendPasswordResetConfirmationEmail,
  sendWelcomeEmail: typeof sendWelcomeEmail
};

console.log('Available mailer functions:', availableMailerFunctions);

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
  sendWelcomeEmail,
  getTransporter
};