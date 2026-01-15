import {
  IndividualUserModel,
  BusinessUserModel,
  BaseUser,
  UserModel,
} from '../user/user.schema';
import { loginRequest, signUpRequest } from './auth.types';
import { hashPassword } from '../../utils';
import bcrypt from 'bcrypt';
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
    const payload = { userId: user._id, accountType: user.accountType };
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
    // jti?: string;
  };

  const payload = {
    userId: decoded.userId,
    accountType: decoded.accountType,
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
