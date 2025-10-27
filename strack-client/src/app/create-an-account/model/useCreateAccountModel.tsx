'use client';
import { AccountType } from '@/lib/states/accounts/accounts';
import { useState } from 'react';

export const accountTypeOptions: {
  title: string;
  accountType: AccountType;
  description: string;
}[] = [
  {
    title: 'Individual Account',
    accountType: 'individual',
    description: 'This is a personal account that requires only BVN to activate.',
  },
  {
    title: 'Business Account',
    accountType: 'business',
    description: 'This is a business account that requires company KYC documents for activation.',
  },
];

const useCreateAccountModel = () => {
  const [activeCard, setActiveCard] = useState<AccountType | null>(null);

  return {
    activeCard,
    setActiveCard,
  };
};
export type UseCreateAccountModel = ReturnType<typeof useCreateAccountModel>;
export default useCreateAccountModel;
