import {
  IndividualUserModel,
  BusinessUserModel,
  BaseUser,
  UserModel,
} from '../user/user.schema';
import { loginRequest, signUpRequest } from './auth.types';
import { hashPassword } from '../../utils';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { HttpError } from '../../utils/httpError';
import { logActivity } from '../activity/activity.service';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../../src/utils/jwt';

export const signupService = async (data: signUpRequest) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      accountType,
      businessName,
      businessEmail,
    } = data;

    const existingUser = await UserModel.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await hashPassword(password);

    const user =
      accountType === 'business'
        ? await BusinessUserModel.create({
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
            accountType: 'business',
            businessName,
            businessEmail,
          })
        : await IndividualUserModel.create({
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
            accountType: 'individual',
          });

    const payload = {
      userId: user._id,
      accountType: user.accountType,
      tokenVersion: user.tokenVersion ?? 0,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      user,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw error;
  }
};

export const loginService = async (data: loginRequest) => {
  try {
    const { email, password } = data;
    let user: BaseUser | null;

    user = await UserModel.findOne({ email });

    const userPassword = user?.password || '';
    const isPasswordValid = await bcrypt.compare(password, userPassword);

    if (!user || !isPasswordValid) {
      throw new Error('Invalid email or password');
    }
    const payload = { userId: user._id, accountType: user.accountType, tokenVersion: user.tokenVersion ?? 0 };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return { user, accessToken, refreshToken };
  } catch (error) {
    throw error;
  }
};

export const refreshTokenService = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new Error('No refresh token provided');
  }

  const decoded = verifyRefreshToken(refreshToken) as {
    userId: string;
    accountType: 'individual' | 'business';
    tokenVersion?: number;
  };

  // A password change bumps tokenVersion, which ends every session that still carries the old one.
  const user = await UserModel.findById(decoded.userId).select('tokenVersion').lean();
  if (!user || (user.tokenVersion ?? 0) !== (decoded.tokenVersion ?? 0)) {
    throw new HttpError(401, 'Session expired. Please log in again.');
  }

  const payload = {
    userId: decoded.userId,
    accountType: decoded.accountType,
    tokenVersion: user.tokenVersion ?? 0,
  };

  const newAccessToken = signAccessToken(payload);

  return { accessToken: newAccessToken };
};

export const logoutService = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new Error('No refresh token provided');
  }

  return;
};

export const changePasswordService = async (
  userId: string,
  { currentPassword, newPassword }: { currentPassword: string; newPassword: string }
) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  const owner = new Types.ObjectId(userId);
  const user = await UserModel.findById(owner).select('password');
  if (!user) throw new HttpError(404, 'User not found');

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new HttpError(400, 'Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw new HttpError(400, 'New password must be different from the current password');
  }

  // Bumping tokenVersion invalidates every access and refresh token issued before now (other devices
  // are signed out). The caller gets fresh tokens so this session stays logged in.
  const updated = await UserModel.findOneAndUpdate(
    { _id: owner },
    { $set: { password: await hashPassword(newPassword) }, $inc: { tokenVersion: 1 } },
    { new: true }
  ).select('tokenVersion accountType');
  if (!updated) throw new HttpError(404, 'User not found');
  await logActivity(owner, { action: 'update', entity: 'user', entityId: owner, description: 'Changed password' });
  const payload = { userId: updated._id, accountType: updated.accountType, tokenVersion: updated.tokenVersion ?? 0 };
  return { accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) };
};
