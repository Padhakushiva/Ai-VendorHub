
const nodemailer = require('nodemailer');

function hasEmailConfig() {
  return Boolean(
    process.env.EMAIL_USER
      && process.env.CLIENT_ID
      && process.env.CLIENT_SECRET
      && process.env.REFRESH_TOKEN,
  );
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!hasEmailConfig()) {
    console.warn('Email delivery disabled: OAuth2 email environment variables are not configured');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
    },
  });

  transporter.verify((error) => {
    if (error) {
      console.warn('Email server is not ready:', error.message);
    } else {
      console.log('Email server is ready to send messages');
    }
  });

  return transporter;
}

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    return {
      skipped: true,
      reason: 'Email transport is not configured',
    };
  }

  try {
    const info = await activeTransporter.sendMail({
      from: `"CEO of AI Vendors Hub" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};


module.exports = { sendEmail, hasEmailConfig };








