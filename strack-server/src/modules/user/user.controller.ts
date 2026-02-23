import { getUserService } from './user.service';
import { Request, Response } from 'express';

export const getUserController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'Invalid or missing userId' });
    }

    const user = await getUserService(userId);

    return res.status(200).json({
      message: 'User fetched successfully',
      data: {
        ...user,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};
