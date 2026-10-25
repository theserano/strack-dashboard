import { Request, Response } from 'express';
import { changePasswordSchema } from './auth.schema';
import { HttpError, toErrorResponse } from '../../utils/httpError';
import {
  changePasswordService,
  loginService,
  logoutService,
  refreshTokenService,
  signupService,
} from './auth.service';

export const signupController = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const { user, refreshToken, accessToken } = await signupService(data);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const { user, refreshToken, accessToken } = await loginService(data);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({
      message: 'User logged in successfully',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};

export const refreshTokenController = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const { accessToken } = await refreshTokenService(refreshToken);
    res.status(200).json({
      message: 'Access token refreshed successfully',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    // A revoked session (password changed elsewhere) is a 401 so the client logs out cleanly.
    res.status(error instanceof HttpError ? error.status : 500).json({
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};

export const logoutController = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'No refresh token provided' });
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    await logoutService(refreshToken);
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};

export const changePasswordController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId; // owner comes from the access token, never from the body
    if (!userId) throw new HttpError(401, 'Unauthorized');
    const r = changePasswordSchema.safeParse(req.body);
    if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? 'Invalid request');
    const { accessToken, refreshToken } = await changePasswordService(userId, r.data);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({ message: 'Password changed successfully', data: { accessToken } });
  } catch (error) {
    const { status, message } = toErrorResponse(error);
    if (status >= 500) console.error(error);
    res.status(status).json({ message });
  }
};
