import Image from 'next/image';
import React from 'react';
import person from '@/assets/person.svg';
import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import { Circle, CircleCheckBig } from 'lucide-react';
import { AccountType } from '@/lib/states/accounts/accounts';

type Props = {
  accountType: AccountType;
  title: string;
  description: string;
  setActiveCard: (card: AccountType) => void;
  isActive: boolean;
};

const AccountSelectionCard = ({ accountType, description, setActiveCard, isActive, title }: Props) => {
  return (
    <div
      onClick={() => setActiveCard(accountType)}
      className={`w-full min-h-[88px] p-4 bg-white flex gap-3.5 items-start cursor-pointer hover:shadow-md rounded-2xl transition-all ${
        isActive ? 'border-2 border-[#020C14]' : 'border border-[#E1E4EA]'
      }`}
    >
      <Image src={person} alt="person" />
      <div className="flex flex-col gap-0.5 flex-1">
        <CustomHeading type="h4" value={title} styleProps={{ fontWeight: '500' }} />
        <CustomText type="md" value={description} />
      </div>
      {isActive ? <CircleCheckBig /> : <Circle color="#E1E4EA" />}
    </div>
  );
};

export default AccountSelectionCard;
