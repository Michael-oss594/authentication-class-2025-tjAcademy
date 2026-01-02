const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * sendEmail(to, subject, templateName, data)
 * - templateName: name of EJS file in src/views/emails (without .ejs)
 * - data: object passed to the template
 */
const sendEmail = async (to, subject, templateName, data = {}) => {
  let html = null;

  if (templateName) {
    try {
      const templatePath = path.join(__dirname, '..', 'views', 'emails', `${templateName}.ejs`);
      html = await ejs.renderFile(templatePath, data);
    } catch (err) {
      console.error('Error rendering email template', err);
      html = null;
    }
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text: data && data.text ? data.text : undefined,
    html: html || undefined,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;