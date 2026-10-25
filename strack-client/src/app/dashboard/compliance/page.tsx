'use client';
import BreadCrumbSelector from '@/lib/components/BreadCrumbSelector';
import HeaderSearch from '@/lib/components/HeaderSearch';
import React, { useEffect, useState } from 'react';
import ErrorState from '@/lib/components/ErrorState';
import { BadgeCheck } from 'lucide-react';
import { breadCrumbsData } from './data';
import { useAppDispatch, useAppSelector } from '@/lib/hook';
import { getUser } from '@/lib/features/user/thunkActions';

const Compliance = () => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.user.user?._id);
  const user = useAppSelector((state) => state.user.user);
  const verified = !!user?.verified;
  const progress = user?.complianceProgress;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Tick each step that's done; once verified, every step is ticked.
  const doneByLabel: Record<string, boolean | undefined> = {
    'Personal Information': progress?.personalInformation,
    'Business Details': progress?.businessDetails,
    'Business Documents': progress?.businessDocuments,
    Summary: verified,
  };
  const steps = breadCrumbsData.map((step) => ({
    ...step,
    completed: verified || !!doneByLabel[step.label],
  }));

  useEffect(() => {
    // The saved user is restored right after mount, so wait for the ID instead of sending an empty one.
    if (!userId) return;
    setLoadError(null);
    dispatch(
      getUser({
        userId,
        onFailure: (error) => {
          setLoadError(typeof error === 'string' && error ? error : 'Could not load your compliance status.');
        },
        onSuccess: () => {},
      })
    );
  }, [dispatch, userId, tick]);

  return (
    <main>
      <HeaderSearch
        headerText="Compliance"
        headerDescription={
          verified
            ? 'Your account has been verified'
            : 'Complete your account verification to get activated'
        }
        badge={
          verified && (
            <span className="flex items-center gap-1 text-sm font-medium text-[#036B26]">
              <BadgeCheck className="w-5 h-5" />
              Verified
            </span>
          )
        }
      />
      {loadError && <ErrorState message={loadError} onRetry={() => setTick((t) => t + 1)} />}
      <div className="mt-12 mx-auto w-full flex justify-center">
        <BreadCrumbSelector breadcrumbs={steps} />
      </div>
    </main>
  );
};

export default Compliance;
