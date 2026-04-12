'use client';

import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import CustomInput from '@/lib/components/CustomInput';
import CustomButton from '@/lib/components/CustomButton';
import { useAppSelector } from '@/lib/hook';
import { useState } from 'react';

const PersonalInformation = () => {
  const { user } = useAppSelector((state) => state.user);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bvn, setBvn] = useState('');
  const [dob, setDob] = useState('');

  return (
    <section className="max-w-[600px] flex flex-col mt-8 gap-8">
      <header>
        <CustomHeading type="h1" value="Personal Information" className="text-center" />
        <CustomText
          type="sm"
          value="These are your personal information. They are linked to your account and make it easier to connect with you."
          className="text-center"
        />
      </header>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <CustomInput
            id="pi-firstName"
            label="First name"
            value={firstName}
            onChange={setFirstName}
            placeholder="First name"
            required
          />
          <CustomInput
            id="pi-lastName"
            label="Last name"
            value={lastName}
            onChange={setLastName}
            placeholder="Last name"
            required
          />
        </div>
        <CustomInput
          id="pi-email"
          label="Email address"
          value={email}
          onChange={setEmail}
          placeholder="name@email.com"
          type="email"
          required
        />
        <CustomInput
          id="pi-phone"
          label="Phone number"
          value={phone}
          onChange={setPhone}
          placeholder="080 0000 0000"
          required
          maxLength={11}
        />
        <CustomInput
          id="pi-dob"
          label="Date of birth"
          value={dob}
          onChange={setDob}
          placeholder="DD/MM/YYYY"
          required
        />
        <CustomInput
          id="pi-bvn"
          label="BVN"
          value={bvn}
          onChange={setBvn}
          placeholder="Enter your 11-digit BVN"
          required
          maxLength={11}
        />
      </div>

      <CustomButton text="Save & Continue" />
    </section>
  );
};

export default PersonalInformation;
