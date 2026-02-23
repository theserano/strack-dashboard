import { UserModel } from './user.schema';

export const getUserService = (userId: string) => {
  try {
      const user = UserModel.findById(userId);
      if(!user){
        throw new Error('User not found');
      }
    return user;
  } catch (error) {
    throw new Error('Error fetching user');
  }
};
