import { Request, Response } from 'express';
import { loginService, refreshTokenService, signupService } from './auth.service';

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
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};