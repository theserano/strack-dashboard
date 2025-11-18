'use client';
import CustomHeading from '@/lib/components/CustomHeading';
import React, { useState } from 'react';
import { Button } from '../../../../@/components/ui/button';
import { CheckCheck, ChevronLeft } from 'lucide-react';
import CustomText from '@/lib/components/CustomText';
import CustomInput from '@/lib/components/CustomInput';
import PasswordInput from '@/lib/components/PasswordInput';
import { Checkbox } from '../../../../@/components/ui/checkbox';
import { Label } from '../../../../@/components/ui/label';
import CustomButton from '@/lib/components/CustomButton';
import { showToast } from '@/lib/utils/plainFunctions';
import { useRouter } from 'next/navigation';

type Props = {
  setStep: (value: number) => void;
};

const CreateIndividualAccountForm = ({ setStep }: Props) => {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [checked, setChecked] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const handlePhoneInput = (value: string) => {
    const onlyNum = value.replace(/[^0-9]/g, '');
    setPhone(onlyNum);
    setErrors((prev) => ({
      ...prev,
      phone: false,
    }));
  };

  const isValidInput = () => {
    const newErrors: Record<string, boolean> = {};
    if (!firstName) {
      newErrors.firstName = true;
    }
    if (!lastName) {
      newErrors.lastName = true;
    }
    if (!email) {
      newErrors.email = true;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = true;
    }
    if (!phone) {
      newErrors.phone = true;
    }
    if (!password) {
      newErrors.password = true;
    }
    if (!checked) {
      newErrors.checked = true;
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmission = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = isValidInput();
    if (!isValid) return;

    localStorage.setItem(
      'individualCreationObject',
      JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        password,
        checked,
      })
    );
    showToast({
      message: 'Successful',
      description: 'Individual account created',
      icon: <CheckCheck />,
      onAutoClose: () => {
        router.push('/login');
      },
    });
  };

  return (
    <div className="max-w-[600px] w-full">
      <Button onClick={() => setStep(0)} variant={`outline`} size={`sm`} className="mb-6">
        <ChevronLeft />
      </Button>
      <CustomHeading
        type="h2"
        value="Create an individual account"
        styleProps={{ fontWeight: 'normal' }}
      />
      <CustomText
        type="lg"
        value="Kindly provide your information to proceed."
        styleProps={{ color: '#667185' }}
      />
      <form
        className="mt-8 w-full flex flex-col gap-5"
        onSubmit={(event) => handleFormSubmission(event)}
      >
        <section className="flex flex-col md:flex-row gap-3 items-center">
          <CustomInput
            id="firstName"
            value={firstName}
            label="First name"
            required
            placeholder="Serano"
            type="text"
            onChange={(value) => {
              setFirstName(value);
              setErrors((prev) => ({
                ...prev,
                firstName: false,
              }));
            }}
            error={errors?.firstName}
          />
          <CustomInput
            id="lastName"
            value={lastName}
            label="Last name"
            required
            placeholder="Edward"
            type="text"
            onChange={(value) => {
              setLastName(value);
              setErrors((prev) => ({
                ...prev,
                lastName: false,
              }));
            }}
            error={errors?.lastName}
          />
        </section>
        <CustomInput
          id="email"
          value={email}
          label="Email"
          required
          placeholder="name@gmail.com"
          type="email"
          onChange={(value) => {
            setEmail(value);
            setErrors((prev) => ({
              ...prev,
              email: false,
            }));
          }}
          error={errors?.email}
        />
        <CustomInput
          id="phone"
          value={phone}
          label="Phone number"
          required
          placeholder="080 0000 0000"
          type="text"
          maxLength={11}
          error={errors?.phone}
          onChange={(value) => handlePhoneInput(value)}
        />
        <PasswordInput
          value={password}
          label="Password"
          onChange={(value) => setPassword(value)}
          placeholder="Password"
          required
          error={errors?.password}
        />
        <div className="flex items-center gap-3 mt-6 mb-2">
          <Checkbox
            id="terms"
            checked={checked}
            onClick={() => setChecked(!checked)}
            className={`transition-all duration-200 ${errors?.checked && 'border-[#FF3333]'}`}
          />
          <Label htmlFor="terms">
            <p className="text-[#4D525F]">I agree to the</p> Terms & Conditions and Privacy Policy
          </Label>
        </div>
        <CustomButton text="Create an account" className="mb-2" type="submit" />
      </form>
    </div>
  );
};

export default CreateIndividualAccountForm;
