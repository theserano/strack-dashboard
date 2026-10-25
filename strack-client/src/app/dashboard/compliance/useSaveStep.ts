'use client';

import { useBreadcrumbStep } from '@/lib/components/BreadCrumbSelector';
import { updateUser, UpdateUserData } from '@/lib/features/user/thunkActions';
import { useAppDispatch, useAppSelector } from '@/lib/hook';
import { showToast } from '@/lib/utils/plainFunctions';

/** Shared save logic for the compliance steps: PATCH the user, toast, go to the next step. */
export const useSaveStep = () => {
  const dispatch = useAppDispatch();
  const { next } = useBreadcrumbStep();
  const user = useAppSelector((state) => state.user.user);
  const saving = useAppSelector((state) => state.user.saving);
  const locked = user?.complianceStatus === 'pending_review' || user?.complianceStatus === 'approved';

  const save = async (data: UpdateUserData) => {
    if (!user?._id) {
      showToast({ message: 'Error', description: 'Your session has expired. Please log in again.' });
      return;
    }
    const result = await dispatch(updateUser({ userId: user._id, data }));
    if (updateUser.fulfilled.match(result)) {
      showToast({ message: 'Saved', description: 'Your details have been saved.' });
      next();
    } else {
      showToast({ message: 'Error', description: String(result.payload ?? 'Could not save your details.') });
    }
  };

  return { user, save, saving, locked };
};
