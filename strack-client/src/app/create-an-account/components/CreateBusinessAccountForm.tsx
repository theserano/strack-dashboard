'use client';
import CustomHeading from '@/lib/components/CustomHeading';
import React, { useState } from 'react';
import { Button } from '../../../../@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import CustomText from '@/lib/components/CustomText';
import CustomButton from '@/lib/components/CustomButton';
import PasswordInput from '@/lib/components/PasswordInput';
import CustomInput from '@/lib/components/CustomInput';
import { Checkbox } from '../../../../@/components/ui/checkbox';
import { Label } from '../../../../@/components/ui/label';
import { showToast } from '@/lib/utils/plainFunctions';
import { useRouter } from 'next/navigation';
import { signUpUser } from '@/lib/features/auth/thunkActions';
import { useAppDispatch } from '@/lib/hook';

type Props = {
  setStep: (value: number) => void;
};

const CreateBusinessAccountForm = ({ setStep }: Props) => {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [checked, setChecked] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [businessName, setBusinessName] = useState<string>('');
  const [businessEmail, setBusinessEmail] = useState<string>('');
  const router = useRouter();

  const dispatch = useAppDispatch();

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
    if (!businessName) {
      newErrors.businessName = true;
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

  const handleFormSubmission = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = isValidInput();
    if (!isValid) return;
    localStorage.setItem('accountType', 'business');

    dispatch(signUpUser({
      values: {
        firstName,
        lastName,
        email,
        phone,
        password,
        accountType: 'business',
        businessName,
        businessEmail,
      },
      onSuccess: () => {
        showToast({
          message: 'Successful',
          description: 'Business account created',
          onAutoClose: () => {
            router.push('/dashboard/compliance');
          },
        });
      },
      onFailure: () => {
        showToast({
          message: 'Error',
          description: 'Unable to create account',
        });
      },
    }));
  };

  return (
    <div className="max-w-[600px] w-full">
      <Button onClick={() => setStep(0)} variant={`outline`} size={`sm`} className="mb-6">
        <ChevronLeft />
      </Button>
      <CustomHeading
        type="h1"
        value="Create a business account"
        styleProps={{ fontWeight: 'normal' }}
      />
      <CustomText
        type="lg"
        value="Kindly provide your business information to proceed."
        styleProps={{ color: '#667185' }}
      />

      <form
        className="mt-8 w-full flex flex-col gap-5"
        onSubmit={(event) => handleFormSubmission(event)}
      >
        <section className="flex gap-3 items-center">
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
        <section className="flex gap-3 items-center">
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
        </section>
        <CustomInput
          id="businessName"
          value={businessName}
          label="Business name"
          required
          placeholder="LeanTeams Inc."
          type="text"
          onChange={(value) => {
            setBusinessName(value);
            setErrors((prev) => ({
              ...prev,
              businessName: false,
            }));
          }}
          error={errors?.businessName}
        />
        <CustomInput
          id="businessEmail"
          value={businessEmail}
          label="Business email"
          optional
          placeholder="rockstar@gmail.com"
          type="email"
          onChange={(value) => {
            setBusinessEmail(value);
          }}
        />
        <PasswordInput
          value={password}
          label="Password"
          onChange={(value) => {
            setPassword(value);
            setErrors((prev) => ({
              ...prev,
              password: false,
            }));
          }}
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

export default CreateBusinessAccountForm;
