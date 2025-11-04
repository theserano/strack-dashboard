'use client';

import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import AccountSelectionCard from './AccountSelectionCard';
import CustomButton from '@/lib/components/CustomButton';
import { accountTypeOptions } from '../model/useCreateAccountModel';
import { AccountType } from '@/lib/states/accounts/accounts';

interface AccountSelectionFormProps {
  activeCard: AccountType | null;
  setActiveCard: (card: AccountType) => void;
  setStep: (value: number) => void;
}

const AccountSelectionForm = ({
  activeCard,
  setActiveCard,
  setStep,
}: AccountSelectionFormProps) => {
  return (
    <div className="max-w-[557px] h-fit">
      <CustomHeading
        type="h1"
        value="What type of account do you want to create?"
        styleProps={{ fontWeight: 'normal' }}
      />
      <CustomText
        type="lg"
        value="Select an account type that best meets your needs."
        styleProps={{ color: '#667185' }}
      />

      <div className="mt-8 mb-16 flex flex-col gap-4">
        {accountTypeOptions.map(({ accountType, description, title }) => (
          <AccountSelectionCard
            key={accountType}
            title={title}
            accountType={accountType}
            description={description}
            setActiveCard={setActiveCard}
            isActive={activeCard === accountType}
          />
        ))}
      </div>
      <CustomButton
        text="Continue"
        disabled={!activeCard || activeCard === null}
        onClick={() => {
          if (activeCard === null) {
            return;
          }
          setStep(1);
        }}
      />
    </div>
  );
};

export default AccountSelectionForm;
