'use client';
import BreadCrumbSelector from '@/lib/components/BreadCrumbSelector';
import HeaderSearch from '@/lib/components/HeaderSearch';
import React, { useEffect } from 'react';
import { breadCrumbsData } from './data';
import { useAppDispatch, useAppSelector } from '@/lib/hook';
import { getUser } from '@/lib/features/user/thunkActions';

const Compliance = () => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.user.user?._id);

  useEffect(() => {
    // The saved user is restored right after mount, so wait for the ID instead of sending an empty one.
    if (!userId) return;
    dispatch(
      getUser({
        userId,
        onFailure: (error) => {
          console.error('Failed to fetch user data:', error);
        },
        onSuccess: (data) => {
          console.log('User data fetched successfully:', data);
        },
      })
    );
  }, [dispatch, userId]);

  return (
    <main>
      <HeaderSearch
        headerText="Compliance"
        headerDescription="Complete your account verification to get activated"
      />
      <div className="mt-12 mx-auto w-full flex justify-center">
        <BreadCrumbSelector breadcrumbs={breadCrumbsData} />
      </div>
    </main>
  );
};

export default Compliance;
