import { UserModel } from './user.schema';

export const getUserService = async (userId: string) => {
  const user = await UserModel.findById(userId).select('-password').lean();
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};
