const User = require("../models/user.models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const emailService = require("../utils/emailService.js");




const signup = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes (timestamp)

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpiry,
        });

        await newUser.save();

        await emailService.sendVerifyEmail(email, name, otp);

        return res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).json({ message: 'Internal Server error' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

if(!user.isVerified){
    return res.status(401).json({message: "User not verified, please verified your account"});
}

const comparePassword = await bcrypt.compare(password, user.password);
        if (!comparePassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment');
            return res.status(500).json({ message: 'Server misconfiguration: JWT secret not set' });
        }
        const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // send login notification (non-blocking won't be awaited to avoid delaying response)
        emailService.sendLoginNotification(user.email, user.name, new Date().toLocaleString()).catch(err => console.error('Login email error', err));

        return res.status(200).json({ message: 'Login successful', token });
} catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal Server error' });
    }

};

const forgetPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await User.findOne({ email });
        if(!user) {
            return res.status(400).json({ message: 'User not found' });
        }
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                user.otp = otp;
                user.otpExpiry = Date.now() + 40 * 60 * 1000;
                await user.save();

                // build reset link for frontend (optional)
                const frontendBase = process.env.FRONTEND_URL || '';
                const resetLink = frontendBase
                    ? `${frontendBase.replace(/\/$/, '')}/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`
                    : '';

                // send OTP email (await to ensure mail attempted)
                // await emailService.sendPasswordResetOtp(email, user.name, otp, resetLink);

                // notify user of forget password (send OTP)
emailService
  .sendForgetPasswordOTP(user.email, user.name, otp)
  .catch(err => console.error('Forget password email error', err));


                return res.status(200).json({ message: 'OTP sent successfully' });
} catch (error) {
        console.error('Error during forget password:', error);
        return res.status(500).json({ message: 'Internal Server error' });
    }
};

const resetPassword = async (req, res) => {
    const { otp, newPassword } = req.body; 
    try {
        if (!otp || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const user = await User.findOne({ otp });
        if (!user) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        if (user.otpExpiry && user.otpExpiry < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.otp = null;
        await user.save();

        // notify user of successful reset
        emailService.sendPasswordResetSuccess(user.email, user.name).catch(err => console.error('Reset email error', err));

        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error during reset password:', error);
        return res.status(500).json({ message: 'Internal Server error' });
    }
};

const verifyOtp = async (req, res) => {
    const { otp } = req.body;
    try {
        if (!otp) {
            return res.status(400).json({ message: 'OTP is required' });
        }
        const user = await User.findOne({ otp });
        if (!user) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        if(user.otpExpiry < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }
        user.isVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();
        return res.status(200).json({ message: 'User verified successfully' });
    } catch (error) {
        console.error('Error during OTP verification:', error);
        return res.status(500).json({ message: 'Internal Server error' });
    }

}

const resendOtp = async (req, res) => {
    const { email } = req.body; 
    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = Date.now() + 10 * 60 * 1000;
        await user.save();
        return res.status(200).json({ message: 'OTP resent successfully', otp });
    } catch (error) {
        console.error('Error during resend OTP:', error);
        return res.status(500).json({ message: 'Internal Server error' });
    }
};

const getAllUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find().select("-password -otp -otpExpiry");

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


module.exports = { signup, login, forgetPassword, resetPassword, verifyOtp, resendOtp, getAllUsers };