'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import CustomButton from '@/lib/components/CustomButton';
import CustomInput from '@/lib/components/CustomInput';
import {
  FileQuestion,
  Mail,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { useState } from 'react';

const faqItems = [
  {
    question: 'How do I verify my account?',
    answer:
      'Go to the Compliance section in your dashboard and complete all verification steps including personal information, business details, and document upload.',
  },
  {
    question: 'How long does verification take?',
    answer:
      'Account verification typically takes 1-3 business days after submitting all required documents.',
  },
  {
    question: 'How do I create a payment link?',
    answer:
      'Navigate to the Payments page and click "Create Link". Fill in the payment details and share the generated link with your customers.',
  },
  {
    question: 'What are the transaction fees?',
    answer:
      'Transaction fees vary based on your account type and transaction volume. Contact support for detailed pricing information.',
  },
  {
    question: 'How do I withdraw funds?',
    answer:
      'Go to the Payouts section, add your bank account details, and initiate a withdrawal from your available balance.',
  },
];

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <main>
      <HeaderSearch
        headerText="Support"
        headerDescription="Get help with your account and services"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Email Support', value: 'support@strack.com', icon: Mail },
          { label: 'Phone Support', value: '+234 800 000 0000', icon: Phone },
          { label: 'Live Chat', value: 'Available 9am - 5pm', icon: MessageCircle },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="border border-[#E1E4EA] rounded-xl p-5 bg-white flex items-center gap-4 hover:bg-[#F7F9FC] cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#F7F9FC] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#525866]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0E121B]">{item.label}</p>
                <p className="text-xs text-[#99A0AE]">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
        <section className="lg:col-span-3 border border-[#E1E4EA] rounded-xl bg-white">
          <div className="p-5 border-b border-[#E1E4EA]">
            <h3 className="text-base font-semibold text-[#0E121B] flex items-center gap-2">
              <FileQuestion className="w-5 h-5" />
              Frequently Asked Questions
            </h3>
          </div>
          <div className="divide-y divide-[#E1E4EA]">
            {faqItems.map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full text-left p-5 flex items-center justify-between hover:bg-[#F7F9FC] transition-colors"
                >
                  <span className="text-sm font-medium text-[#0E121B] pr-4">{faq.question}</span>
                  <span
                    className={`text-[#525866] transition-transform shrink-0 ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 6l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                {expandedFaq === index && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-[#525866]">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2 border border-[#E1E4EA] rounded-xl bg-white h-fit">
          <div className="p-5 border-b border-[#E1E4EA]">
            <h3 className="text-base font-semibold text-[#0E121B] flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send a Message
            </h3>
            <p className="text-sm text-[#525866]">We&apos;ll get back to you within 24 hours</p>
          </div>
          <div className="p-5 space-y-4">
            <CustomInput
              id="support-subject"
              label="Subject"
              value={subject}
              onChange={setSubject}
              placeholder="What do you need help with?"
              required
            />
            <div className="grid w-full items-center gap-2">
              <label className="text-sm font-medium" htmlFor="support-message">
                Message
              </label>
              <textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={5}
                className="w-full px-3 py-2 border border-[#E1E4EA] rounded-lg text-sm resize-none focus:outline-none focus:border-[#020C14] placeholder:text-[#99A0AE]"
              />
            </div>
            <CustomButton text="Send Message" icon={<Send className="w-4 h-4" />} />
          </div>
        </section>
      </div>
    </main>
  );
}
