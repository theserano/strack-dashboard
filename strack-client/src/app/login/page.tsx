'use client';
import { Logo } from '@/lib/components/Logo';
import Image from 'next/image';
import WhiteSpiral from '@/assets/white-spiral.svg';
import SignupAutoSlider from '../create-an-account/signup-auto-slider';
import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import CustomInput from '@/lib/components/CustomInput';
import { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { showToast } from '@/lib/utils/plainFunctions';
import PasswordInput from '@/lib/components/PasswordInput';
import { Checkbox } from '../../../@/components/ui/checkbox';
import { Label } from '../../../@/components/ui/label';
import CustomButton from '@/lib/components/CustomButton';

const Login = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [checked, setChecked] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const isValidInput = () => {
    const newErrors: Record<string, boolean> = {};
    if (!email) {
      newErrors.email = true;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = true;
    }
    if (!password) {
      newErrors.password = true;
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmission = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = isValidInput();
    if (!isValid) return;

    const individualData = localStorage.getItem('individualCreationObject');
    const businessData = localStorage.getItem('businessCreationObject');

    const individual = individualData ? JSON.parse(individualData) : null;
    const business = businessData ? JSON.parse(businessData) : null;

    let matchedAccount = null;

    if (individual && individual.email === email && individual.password === password) {
      matchedAccount = individual;
    } else if (business && business.email === email && business.password === password) {
      matchedAccount = business;
    }

    if (matchedAccount) {
      showToast({
        message: 'Login Successful',
        description: `Welcome back, ${matchedAccount.firstName}!`,
        icon: <CheckCheck />,
        onAutoClose: () => {
          // Example redirect depending on account type
          if (matchedAccount.businessName) {
            // Business account
            // router.push('/dashboard/business');
          } else {
            // Individual account
            // router.push('/dashboard/individual');
          }
        },
      });
    } else {
      showToast({
        message: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
        icon: <CheckCheck color="red" />,
      });
      setErrors({
        email: true,
        password: true,
      });
    }
  };

  return (
    <main className="flex flex-col lg:grid lg:grid-cols-[4fr_7fr] h-screen">
      <section className="bg-[#F7F9FC] w-full h-fit md:h-[300px] lg:h-full p-6 relative flex flex-col justify-between">
        <Logo />
        <Image
          src={WhiteSpiral}
          alt="White Spiral"
          className="hidden md:block md:absolute bottom-0 right-0 top-0"
        />
        <SignupAutoSlider />
      </section>

      <div className="max-w-[500px] w-full mx-auto flex flex-col items-center justify-center mt-8 lg:mt-0 px-4">
        <form
          onSubmit={handleFormSubmission}
          className="w-full h-full flex flex-col justify-center"
        >
          <CustomHeading type="h2" value="Login to your account" />
          <CustomText type="sm" value="Enter your details to login" className="text-[#667185]" />

          <section className="flex flex-col gap-4 mt-10">
            <CustomInput
              id="email"
              value={email}
              label="Email"
              type="email"
              required
              error={errors?.email}
              placeholder="name@gmail.com"
              onChange={(value) => {
                setEmail(value);
                setErrors((prev) => ({
                  ...prev,
                  email: false,
                }));
              }}
            />
            <PasswordInput
              value={password}
              label="Password"
              onChange={(value) => setPassword(value)}
              placeholder="Password"
              required
              error={errors?.password}
              noCheck
            />
          </section>
          <div className="flex items-center gap-3 mt-6 mb-2">
            <Checkbox id="terms" checked={checked} onClick={() => setChecked(!checked)} />
            <Label htmlFor="terms">
              <p className="text-[#4D525F]">Keep me logged in</p>
            </Label>
          </div>
          <CustomButton text="Login" className="mb-2" type="submit" />
        </form>
      </div>
    </main>
  );
};

export default Login;
