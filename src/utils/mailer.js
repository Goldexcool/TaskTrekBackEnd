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
      from: `"TaskTrek Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="background: linear-gradient(135deg, #1a2036 0%, #2d3a5d 100%); color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 1.2px; background: linear-gradient(90deg, #64B5F6, #7E57C2); -webkit-background-clip: text; color: transparent; display: inline-block; margin-bottom: 5px;">TaskTrek</div>
            <div style="width: 50px; height: 4px; background: linear-gradient(90deg, #64B5F6, #7E57C2); margin: 0 auto;"></div>
          </div>
          
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; margin-bottom: 25px; backdrop-filter: blur(10px);">
            <h1 style="margin-top: 0; color: #ffffff; font-size: 24px; font-weight: 500;">Password Reset Requested</h1>
            <p style="color: #e0e0e0; line-height: 1.6;">We received a request to reset your password. If this wasn't you, please ignore this email. Otherwise, click the secure link below to reset your password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(90deg, #64B5F6, #7E57C2); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; letter-spacing: 0.5px; transition: all 0.3s; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">Reset Password</a>
            </div>
            
            <p style="color: #e0e0e0; font-size: 14px; margin-bottom: 0;">This link will expire in 15 minutes for security reasons.</p>
          </div>
          
          <div style="text-align: center; color: #a0a0a0; font-size: 14px; margin-top: 30px;">
            <p>Secured with end-to-end encryption.</p>
            <p>&copy; ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
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
      subject: 'Password Reset Successful ✓',
      html: `
        <div style="background: linear-gradient(135deg, #1a2036 0%, #2d3a5d 100%); color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 1.2px; background: linear-gradient(90deg, #64B5F6, #7E57C2); -webkit-background-clip: text; color: transparent; display: inline-block; margin-bottom: 5px;">TaskTrek</div>
            <div style="width: 50px; height: 4px; background: linear-gradient(90deg, #64B5F6, #7E57C2); margin: 0 auto;"></div>
          </div>
          
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; margin-bottom: 25px; backdrop-filter: blur(10px);">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; width: 70px; height: 70px; background: rgba(41, 204, 151, 0.2); border-radius: 50%; line-height: 70px; text-align: center; margin-bottom: 15px;">
                <span style="color: #29CC97; font-size: 32px;">✓</span>
              </div>
            </div>
            
            <h1 style="margin-top: 0; color: #ffffff; font-size: 24px; font-weight: 500; text-align: center;">Password Reset Complete</h1>
            <p style="color: #e0e0e0; line-height: 1.6; text-align: center;">Your password has been updated successfully. You can now log in with your new credentials.</p>
            
            <div style="margin: 25px 0; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 4px solid #29CC97;">
              <p style="color: #e0e0e0; font-size: 14px; margin: 0;">If you did not request this change, please contact our support team immediately as your account may be compromised.</p>
            </div>
          </div>
          
          <div style="text-align: center; color: #a0a0a0; font-size: 14px; margin-top: 30px;">
            <p>Secured with end-to-end encryption.</p>
            <p>&copy; ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
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
      from: `"TaskTrek" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Welcome to TaskTrek! Your Productivity Journey Begins',
      html: `
        <div style="background: linear-gradient(135deg, #ffffff 0%; color: #000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 1.5px; background: linear-gradient(90deg, #64B5F6, #7E57C2); -webkit-background-clip: text; color: transparent; display: inline-block; margin-bottom: 5px;">TaskTrek</div>
            <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #64B5F6, #7E57C2); margin: 0 auto;"></div>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="font-size: 22px; color: #ffffff; margin-bottom: 15px; letter-spacing: 0.5px;">Welcome to the future of productivity</div>
            <div style="display: inline-block; padding: 10px 20px; background: rgba(126, 87, 194, 0.3); border-radius: 30px; font-size: 14px; color: #bb9df3;">
              <span style="font-weight: 600;">Account activated</span> • ${new Date().toLocaleDateString()}
            </div>
          </div>
          
          <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; margin-bottom: 25px; backdrop-filter: blur(10px);">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 500; margin-top: 0;">Hello <span style="color: #64B5F6;">${user.username}</span>,</h2>
            <p style="color: #e0e0e0; line-height: 1.7;">We're thrilled to have you join the TaskTrek community! You now have access to a powerful suite of tools designed to transform how you manage tasks and collaborate with your team.</p>
            
            <div style="margin: 30px 0;">
              <div style="display: flex; margin-bottom: 20px;">
                <div style="min-width: 40px; height: 40px; background: rgba(100, 181, 246, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                  <span style="color: #64B5F6; font-size: 18px;">⚡</span>
                </div>
                <div>
                  <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 5px 0;">Intelligent Workflows</h3>
                  <p style="color: #e0e0e0; font-size: 14px; margin: 0; line-height: 1.5;">Create custom boards with AI-powered task organization</p>
                </div>
              </div>
              
              <div style="display: flex; margin-bottom: 20px;">
                <div style="min-width: 40px; height: 40px; background: rgba(126, 87, 194, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                  <span style="color: #7E57C2; font-size: 18px;">🔄</span>
                </div>
                <div>
                  <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 5px 0;">Real-time Collaboration</h3>
                  <p style="color: #e0e0e0; font-size: 14px; margin: 0; line-height: 1.5;">Seamlessly work with team members across any device</p>
                </div>
              </div>
              
              <div style="display: flex;">
                <div style="min-width: 40px; height: 40px; background: rgba(83, 219, 179, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                  <span style="color: #53DBB3; font-size: 18px;">📊</span>
                </div>
                <div>
                  <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 5px 0;">Productivity Analytics</h3>
                  <p style="color: #e0e0e0; font-size: 14px; margin: 0; line-height: 1.5;">Gain insights into your workflow with advanced metrics</p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 35px 0 20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 16px 32px; background: linear-gradient(90deg, #64B5F6, #7E57C2); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; letter-spacing: 0.5px; transition: all 0.3s; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">Launch Dashboard</a>
            </div>
          </div>
          
          <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #ffffff; font-size: 16px; margin-top: 0;">Need Help Getting Started?</h3>
            <p style="color: #e0e0e0; font-size: 14px; line-height: 1.6; margin-bottom: 0;">Check out our <a href="#" style="color: #64B5F6; text-decoration: none;">Quick Start Guide</a> or reach out to our support team at <a href="mailto:support@tasktrek.com" style="color: #64B5F6; text-decoration: none;">support@tasktrek.com</a></p>
          </div>
          
          <div style="text-align: center; color: #a0a0a0; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="margin-bottom: 5px;">Secured with end-to-end encryption</p>
            <p style="margin-bottom: 5px;">
              <a href="#" style="color: #64B5F6; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
              <a href="#" style="color: #64B5F6; text-decoration: none; margin: 0 10px;">Terms of Service</a>
              <a href="#" style="color: #64B5F6; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
            </p>
            <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} TaskTrek. All rights reserved.</p>
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

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
  sendWelcomeEmail,
  getTransporter
};