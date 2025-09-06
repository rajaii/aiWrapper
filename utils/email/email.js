const nodemailer = require('nodemailer');

// Initial config for Yahoo
const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: process.env.YAHOO_EMAIL, // your full Yahoo email
    pass: process.env.YAHOO_PASS, // your Yahoo app password
  },
});

// Send email function
async function sendEmail(to, subject, text, html = null) {
  try {
    const mailOptions = {
      from: process.env.YAHOO_EMAIL,
      to,
      subject,
      text,
      ...(html && { html }), // include html if provided
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Example usage
// sendEmail('recipient@example.com', 'Test Subject', 'Hello from Yahoo + Nodemailer!');

module.exports = sendEmail;
