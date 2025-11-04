import CustomHeading from '@/lib/components/CustomHeading';
import React from 'react';

type Props = {
  setStep: (value: number) => void;
};

const CreateBusinessAccountForm = ({ setStep }: Props) => {
    return (
      <div>
        <CustomHeading
          type="h1"
          value="Create a business account"
          styleProps={{ fontWeight: 'normal' }}
        />
      </div>
    );
};

export default CreateBusinessAccountForm;
