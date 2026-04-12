'use client';

import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import CustomButton from '@/lib/components/CustomButton';
import { useAppSelector } from '@/lib/hook';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface VerificationStep {
  label: string;
  status: 'complete' | 'incomplete' | 'pending';
}

const Summary = () => {
  const { user } = useAppSelector((state) => state.user);

  const steps: VerificationStep[] = [
    {
      label: 'Personal Information',
      status: user ? 'complete' : 'incomplete',
    },
    {
      label: 'Business Details',
      status: 'incomplete',
    },
    {
      label: 'Business Documents',
      status: 'incomplete',
    },
  ];

  const completedCount = steps.filter((s) => s.status === 'complete').length;
  const allComplete = completedCount === steps.length;

  const statusIcons = {
    complete: <CheckCircle2 className="w-5 h-5 text-[#036B26]" />,
    incomplete: <Circle className="w-5 h-5 text-[#E1E4EA]" />,
    pending: <AlertCircle className="w-5 h-5 text-[#AD6F10]" />,
  };

  const statusText = {
    complete: 'Completed',
    incomplete: 'Not started',
    pending: 'Under review',
  };

  const statusColor = {
    complete: 'text-[#036B26]',
    incomplete: 'text-[#99A0AE]',
    pending: 'text-[#AD6F10]',
  };

  return (
    <section className="max-w-[600px] flex flex-col mt-8 gap-8">
      <header>
        <CustomHeading type="h1" value="Summary" className="text-center" />
        <CustomText
          type="sm"
          value="Review your verification progress and submit for approval."
          className="text-center"
        />
      </header>

      <div className="border border-[#E1E4EA] rounded-xl bg-white overflow-hidden">
        <div className="p-5 border-b border-[#E1E4EA] bg-[#F7F9FC]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#0E121B]">Verification Progress</p>
            <span className="text-sm font-medium text-[#0E121B]">
              {completedCount}/{steps.length}
            </span>
          </div>
          <div className="mt-3 w-full h-2 bg-[#E1E4EA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#020C14] rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="divide-y divide-[#E1E4EA]">
          {steps.map((step) => (
            <div key={step.label} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcons[step.status]}
                <span className="text-sm text-[#0E121B]">{step.label}</span>
              </div>
              <span className={`text-xs font-medium ${statusColor[step.status]}`}>
                {statusText[step.status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {user && (
        <div className="border border-[#E1E4EA] rounded-xl bg-white p-5">
          <p className="text-sm font-medium text-[#0E121B] mb-3">Account Details</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Name', value: `${user.firstName} ${user.lastName}` },
              { label: 'Email', value: user.email },
              { label: 'Phone', value: user.phone },
              { label: 'Account Type', value: user.accountType },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-[#99A0AE]">{item.label}</p>
                <p className="text-sm text-[#0E121B] capitalize">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <CustomButton
        text={allComplete ? 'Submit for Verification' : 'Complete All Steps to Submit'}
        disabled={!allComplete}
      />
    </section>
  );
};

export default Summary;
