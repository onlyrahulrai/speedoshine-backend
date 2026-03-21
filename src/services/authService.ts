import bcrypt from "bcryptjs";
import { Queue } from "bullmq";
import jwt from "jsonwebtoken";
import { generateToken } from "../helper/utils/common";
import { EditProfileInput, RegisterInput } from "../types/schema/Auth";
import User from "../models/User";
import Role from "../models/Role";
import { TokenBlacklist } from "../models/TokenBlacklist";
import { v4 as uuidV4 } from "uuid";
import OTPGenerator from "otp-generator";
import OTP from "../models/OTP";

const myEmailQueue = new Queue("SS-EmailTask");
const myCommonQueue = new Queue("SS-CommonTask");

export const registerUser = async (data: RegisterInput) => {
  const { name, email, phone, password } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const role = await Role.findOne({
      name: "User",
    });

    if (!role) {
      throw new Error("Default role 'User' not found");
    }

    const user = await new User({
      name,
      email,
      phone,
      password: hashedPassword,
      roles: [role._id],
    }).save();

    const { password, __v, ...userData } = user.toObject();

    const verificationToken = generateToken(
      {
        userId: user._id,
        email: user.email,
      },
      "15m"
    );

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await myEmailQueue.add("send-email", {
      to: userData.email,
      subject: "Verify Your Email Address",
      html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
        <h2>Welcome to Our Platform!</h2>
        <p>Thank you for signing up. Please confirm your email address by clicking the button below:</p>
        <p style="margin: 20px 0;">
          <a href="${verifyLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
        </p>
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verifyLink}">${verifyLink}</a></p>
        <hr />
        <p style="font-size: 14px; color: #888;">If you didn't sign up for an account, please ignore this email.</p>
      </div>
    `,
    }, {
      jobId: `verify-email-${uuidV4().split("-")[0]}`,
    });

    let otp = "123456";

    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (process.env.DEBUG === "false") {
      otp = await OTPGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      })

      await myCommonQueue.add("send-verification-otp", { otp, contacts: `${phone}` });
    }

    // Hash OTP before saving
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save OTP to separate collection
    await OTP.findOneAndUpdate(
      { identifier: phone, type: "signup" },
      { otp: hashedOtp, expiresAt: otpExpiresAt },
      { upsert: true, new: true }
    );


    return userData;
  } catch (error: any) {
    throw new Error(error.message || "Failed to register user.");
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const user = await User.findOne({
      email,
    }).populate([
      {
        path: "roles",
        select: "name",
      },
    ]);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("Invalid credentials");
    }

    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
    };

    const access = generateToken(payload, "24h");
    const refresh = generateToken(payload, "7d");

    const { password: userPassword, __v, ...userData } = user.toObject();

    return { ...userData, access, refresh };
  } catch (error: any) {
    throw new Error(error.message || "Login failed");
  }
};

export const editUserProfile = async (_id: string, data: EditProfileInput) => {
  try {
    return await User.findByIdAndUpdate(_id, { $set: data }, { new: true }).select("-password -__v").populate([
      {
        path: "roles",
        select: "name",
      },
    ]);

  } catch (error: any) {
    throw new Error(error.message || "Failed to edit user profile");
  }
};

export const changePassword = async (
  _id: string,
  data: {
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }
) => {
  try {
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    return await User.findByIdAndUpdate(
      _id,
      { $set: { password: hashedPassword } },
      { new: true }
    ).select("-password -__v");
  } catch (error: any) {
    throw new Error(error.message || "Failed to change password");
  }
};

export const requestPasswordReset = async (email: string) => {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Avoid user enumeration by returning the same success message
      throw new Error("If the email address is registered, you will receive a password reset link shortly. Please check your inbox or spam folder. If you don’t receive the email, verify the address or sign up for a new account.");
    }

    // Generate JWT token with user id and expiration (15 minutes)
    const token = generateToken({ userId: String(user._id) }, "15m");

    const resetLink = `${process.env.FRONTEND_URL}/confirm-reset-password?token=${token}`;

    // Add email job to the queue
    await myEmailQueue.add("send-email", {
      to: email,
      subject: "Reset Your Password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    return { message: "Reset link sent to your email." };
  } catch (error: any) {
    throw new Error(error.message || "Failed to request password reset");
  }
};

export const confirmResetPassword = async (token: string, password: string) => {
  try {
    const blacklisted = await TokenBlacklist.findOne({ token });

    if (blacklisted) {
      throw new Error("Invalid or expired token");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await User.findByIdAndUpdate(
      payload.userId,
      { password: hashedPassword },
      { new: true, select: "id firstName lastName email" }
    );

    if (!updatedUser) {
      throw new Error("User not found");
    }

    // Blacklist the used token immediately
    await TokenBlacklist.create({
      token,
      user: payload.userId,
      reason: "PASSWORD_RESET",
      expiresAt: new Date(), // optional, just to have a timestamp
    });

    return updatedUser;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Invalid or expired token");
  }
};

export const getUserDetails = async (userId: string) => {
  try {
    // Find the user and populate role
    const user = await User.findById(userId).select("-password -__v").populate({
      path: "roles",
      select: "name",
    });

    if (!user) {
      throw new Error("We couldn’t find an account matching those details.");
    }

    return user.toObject();
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch user details");
  }
};

export const verifyEmail = async (token: string) => {
  try {
    const blacklisted = await TokenBlacklist.findOne({ token });

    if (blacklisted) {
      throw new Error("Invalid verification token") as any;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    // Update user verified to true
    const user = await User.findByIdAndUpdate(
      payload.userId,
      { isEmailVerified: true },
      { new: true }
    );

    if (!user) {
      throw new Error(
        "Your verification link has expired or is invalid. Please log in to request a new verification email."
      );
    }

    // Blacklist the used token immediately
    await TokenBlacklist.create({
      token,
      user: payload.userId,
      reason: "EMAIL_VERIFICATION",
      expiresAt: new Date(), // optional, just to have a timestamp
    });

    return { message: "Email verified successfully" };
  } catch (e: any) {
    throw new Error(
      "Your verification link has expired or is invalid. Please log in to request a new verification email."
    );
  }
};

export const resendVerificationEmail = async (user: any) => {
  try {
    console.log("User: ", user);

    const verificationToken = generateToken(
      {
        userId: user._id,
        email: user.email,
      },
      "15m"
    );

    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await myEmailQueue.add("send-email", {
      to: user.email,
      subject: "Verify Your Email Address",
      html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
        <h2>Welcome to Our Platform!</h2>
        <p>Thank you for signing up. Please confirm your email address by clicking the button below:</p>
        <p style="margin: 20px 0;">
          <a href="${verifyLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
        </p>
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verifyLink}">${verifyLink}</a></p>
        <hr />
        <p style="font-size: 14px; color: #888;">If you didn't sign up for an account, please ignore this email.</p>
      </div>
    `,
    });

    return { message: "Account verification link has been sent" };
  } catch (error: any) {
    throw new Error(
      error.message ||
      "❌ We couldn’t send the verification email. Please check your email address or try again shortly."
    );
  }
};

export const logout = async (req: any) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) throw new Error("No token provided");

    const token = authHeader.split(" ")[1];
    if (!token) throw new Error("Invalid token format");

    const decoded: any = jwt.decode(token);
    if (!decoded || !decoded.exp) throw new Error("Invalid token");

    await TokenBlacklist.create({
      token,
      user: decoded._id || undefined,
      reason: "LOGOUT",
      expiresAt: new Date(decoded.exp * 1000),
    });
  } catch (error) {
    console.error("Logout service error:", error);
    throw error; // re-throw to let controller handle response
  }
};

export const verifyPhoneOtp = async (phone?: string, otp?: string, type: string = "signup") => {
  try {
    if (type === "signup") {
      const user = await User.findOne({ phone });

      if (!user) {
        throw new Error("No account associated with this phone number.");
      }

      if (user.isPhoneVerified) {
        throw new Error("Phone number is already verified.");
      }
    }

    // Find the current OTP record
    const otpRecord = await OTP.findOne({ identifier: phone, type });

    if (!otpRecord) {
      throw new Error("OTP has expired or doesn't exist. Please request a new one.");
    }

    // Check attempts (limiting to 5)
    if (otpRecord.attempts >= 5) {
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }

    // Compare hashed OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValid) {
      // Increment attempts on failure
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new Error("Invalid OTP");
    }

    if (type === "signup") {
      const user = await User.findOne({ phone });
      if (user) {
        user.isPhoneVerified = true;
        await user.save();
      }
    }

    // Delete the OTP record once verified
    await OTP.deleteOne({ _id: otpRecord._id });

    return { message: "Phone number verified successfully" };
  } catch (error: any) {
    throw new Error(error.message || "Phone verification failed");
  }
};

export const sendPhoneOtp = async (phone?: string, type: string = "signup") => {
  try {
    if (type === "signup") {
      const user = await User.findOne({ phone });

      if (!user) {
        throw new Error("No account associated with this phone number.");
      }

      if (user.isPhoneVerified) {
        throw new Error("Phone number is already verified.");
      }
    } else if (type === "login") {
      const user = await User.findOne({ phone });

      if (!user) {
        throw new Error("No account associated with this phone number. Please sign up first.");
      }
    }

    let otp = "123456";

    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes matching TTL

    if (process.env.DEBUG === "false") {
      otp = await OTPGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });

      await myCommonQueue.add("send-verification-otp", {
        otp,
        contacts: `${phone}`,
      });
    }

    // Hash OTP before saving
    const hashedOtp = await bcrypt.hash(otp, 10);

    await OTP.findOneAndUpdate(
      { identifier: phone, type },
      { otp: hashedOtp, expiresAt: otpExpiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    return { message: "Verification OTP has been resent" };
  } catch (error: any) {
    throw new Error(error.message || "Failed to resend Verification OTP");
  }
};

export const loginWithOtp = async (phone: string, otp: string) => {
  try {
    const user = await User.findOne({ phone }).populate([
      {
        path: "roles",
        select: "name",
      },
    ]);

    if (!user) {
      throw new Error("No account associated with this phone number.");
    }

    // Find the current OTP record
    const otpRecord = await OTP.findOne({ identifier: phone, type: "login" });

    if (!otpRecord) {
      throw new Error("OTP has expired or doesn't exist. Please request a new one.");
    }

    if (otpRecord.attempts >= 5) {
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new Error("Invalid OTP");
    }

    // Delete the OTP record once verified
    await OTP.deleteOne({ _id: otpRecord._id });

    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
    };

    const access = generateToken(payload, "24h");

    const refresh = generateToken(payload, "7d");

    const { password: userPassword, __v, ...userData } = user.toObject();

    return { ...userData, access, refresh };
  } catch (error: any) {
    throw new Error(error.message || "OTP Login failed");
  }
};