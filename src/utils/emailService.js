const sendEmail = require('../config/email');

// Verify account email
const sendVerifyEmail = (to, name, otp) => {
  return sendEmail(to, 'Verify your account', 'verify_account', { name, otp });
};

// Forget password OTP email
const sendForgetPasswordOTP = (to, name, otp, resetLink) => {
  return sendEmail(
    to,
    'Password Reset OTP',
    'forget_password',
    { name, otp, resetLink }
  );
};

// Password reset success email
const sendPasswordResetSuccess = (to, name) => {
  return sendEmail(
    to,
    'Password Reset Successful',
    'reset_password',
    { name }
  );
};

// Login notification email
const sendLoginNotification = (to, name, time) => {
  return sendEmail(
    to,
    'New login to your account',
    'login_notification',
    { name, time }
  );
};

module.exports = {
  sendVerifyEmail,
  sendForgetPasswordOTP,
  sendPasswordResetSuccess,
  sendLoginNotification,
};
