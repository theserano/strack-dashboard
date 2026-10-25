'use client';

import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import CustomInput from '@/lib/components/CustomInput';
import CustomButton from '@/lib/components/CustomButton';
import {
  CustomDateInput,
  fromISODate,
  parseDate,
  toISODate,
  yearsAgo,
} from '@/lib/components/CustomDate';
import { showToast } from '@/lib/utils/plainFunctions';
import { useEffect, useState } from 'react';
import { useSaveStep } from '../useSaveStep';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PersonalInformation = () => {
  const { user, save, saving, locked } = useSaveStep();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bvn, setBvn] = useState(user?.bvn || '');
  const [dob, setDob] = useState(fromISODate(user?.dob));
  const [submitted, setSubmitted] = useState(false);

  // After a page reload the user arrives from getUser after first render, so fill the fields then.
  useEffect(() => {
    if (!user) return;
    setFirstName((v) => v || user.firstName || '');
    setLastName((v) => v || user.lastName || '');
    setEmail((v) => v || user.email || '');
    setPhone((v) => v || user.phone || '');
    setBvn((v) => v || user.bvn || '');
    setDob((v) => v || fromISODate(user.dob));
  }, [user]);

  const errors = {
    firstName: !firstName.trim(),
    lastName: !lastName.trim(),
    email: !EMAIL_REGEX.test(email.trim()),
    phone: !phone.trim(),
    dob: !parseDate(dob) || parseDate(dob)! > new Date(),
    bvn: !/^\d{11}$/.test(bvn),
  };

  const handleSave = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) {
      showToast({ message: 'Error', description: 'Please fill in all fields correctly.' });
      return;
    }
    save({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      dob: toISODate(dob)!,
      bvn,
    });
  };

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
            error={submitted && errors.firstName}
          />
          <CustomInput
            id="pi-lastName"
            label="Last name"
            value={lastName}
            onChange={setLastName}
            placeholder="Last name"
            required
            error={submitted && errors.lastName}
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
          error={submitted && errors.email}
        />
        <CustomInput
          id="pi-phone"
          label="Phone number"
          value={phone}
          onChange={setPhone}
          placeholder="080 0000 0000"
          required
          maxLength={11}
          error={submitted && errors.phone}
        />
        <CustomDateInput
          id="pi-dob"
          label="Date of birth"
          value={dob}
          onChange={setDob}
          required
          minDate={yearsAgo(120)}
          maxDate={new Date()}
          defaultMonth={yearsAgo(25)}
          rangeMessage="Date of birth can't be in the future"
          error={submitted && errors.dob}
        />
        <CustomInput
          id="pi-bvn"
          label="BVN"
          value={bvn}
          onChange={(v) => setBvn(v.replace(/\D/g, ''))}
          placeholder="Enter your 11-digit BVN"
          required
          maxLength={11}
          error={submitted && errors.bvn}
        />
      </div>

      <CustomButton fullWidth
        text={locked ? 'Submitted for review' : 'Save & Continue'}
        onClick={handleSave}
        isLoading={saving}
        disabled={saving || locked}
      />
    </section>
  );
};

export default PersonalInformation;
