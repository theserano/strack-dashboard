'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const slides = [
  {
    title: (
      <>
        Receive <strong className="text-[#020C14]">Payment</strong> Globally
      </>
    ),
    text: 'Strack pay provides you with the right integrations to make and receive payment globally for all your businesses. Signup and enjoy seamless payment.',
  },
  {
    title: (
      <>
        Manage Your <strong className="text-[#020C14]">Transactions</strong>
      </>
    ),
    text: 'Track every transaction with detailed analytics and real-time reporting tools that help you stay in control of your finances.',
  },
  {
    title: (
      <>
        Grow Your Business <strong className="text-[#020C14]">Faster</strong>
      </>
    ),
    text: 'Integrate payment gateways, automate invoices, and scale without limits — all from a single dashboard.',
  },
];

export default function SignupAutoSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-40 bg-gray-50 text-center px-6">
      <div className="max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-light mb-4 text-[#525866] text-left">
              {slides[current].title}
            </h2>
            <p className="text-[#667185] text-base text-left">{slides[current].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex mt-12 space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === current ? 'bg-gray-800' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
