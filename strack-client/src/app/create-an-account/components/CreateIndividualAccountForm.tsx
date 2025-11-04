import CustomHeading from '@/lib/components/CustomHeading';
import React from 'react';
import { Button } from '../../../../@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import CustomText from '@/lib/components/CustomText';

type Props = {
  setStep: (value: number) => void;
};

const CreateIndividualAccountForm = ({ setStep }: Props) => {
  return (
    <div>
      <Button variant={`outline`} size={`sm`} className='mb-6'>
        <ChevronLeft />
      </Button>
      <CustomHeading
        type="h2"
        value="Create an individual account"
        styleProps={{ fontWeight: 'normal' }}
      />
      <CustomText
        type="lg"
        value="Kindly provide your business information to proceed."
        styleProps={{ color: '#667185' }}
      />
    </div>
  );
};

export default CreateIndividualAccountForm;
