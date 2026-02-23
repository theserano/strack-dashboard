import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import { tokenManager } from '@/lib/utils/auth';
import React from 'react';

// type Props = {};

const PersonalInformation = () => {
    console.log(tokenManager.get());
  return (
      <section className="max-w-[600px] flex flex-col mt-8 gap-8">
      <header>
        <CustomHeading type="h1" value="Personal Information" className="text-center" />
        <CustomText
          type="sm"
          value="These are your personal information they are linked to your account and  make it easier to connect with you."
          className="text-center"
        />
      </header>
    </section>
  );
};

export default PersonalInformation;
