'use client';
import React, { JSX, createContext, useContext, useState } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '../../../@/components/ui/breadcrumb';
import { Check, ChevronRight } from 'lucide-react';

export interface BreadcrumbData {
  id: number;
  label: string;
  details: JSX.Element;
  /** Shows a green check instead of the step number. */
  completed?: boolean;
}

interface BreadcrumbProps {
  breadcrumbs: BreadcrumbData[];
}

const StepContext = createContext<{ next: () => void; goTo: (index: number) => void }>({
  next: () => {},
  goTo: () => {},
});

/** Lets a step's content move the selector, e.g. to the next step after saving. */
export const useBreadcrumbStep = () => useContext(StepContext);

const BreadCrumbSelector = ({ breadcrumbs }: BreadcrumbProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const current = Math.min(selectedIndex, breadcrumbs.length - 1);

  const goTo = (index: number) =>
    setSelectedIndex(Math.max(0, Math.min(index, breadcrumbs.length - 1)));
  const next = () => goTo(current + 1);

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={breadcrumb.id} className="flex items-center gap-6 mr-4">
              <BreadcrumbLink asChild key={breadcrumb.id}>
                <BreadcrumbItem
                  key={breadcrumb.id}
                  onClick={() => goTo(index)}
                  className={`cursor-pointer hover:text-[#0E121B] `}
                >
                  <div
                    className={`${index === current ? 'text-[#0E121B]' : ''} flex items-center`}
                  >
                    <span
                      className={`flex items-center justify-center w-5 h-5 rounded-full border ${
                        breadcrumb.completed
                          ? 'bg-[#036B26] border-[#036B26] text-white'
                          : index === current
                            ? 'bg-[#0E121B] text-white'
                            : 'bg-white text-[#525866]'
                      }`}
                    >
                      {breadcrumb.completed ? <Check size={12} strokeWidth={3} /> : index + 1}
                    </span>
                    <span
                      className={`ml-2 ${
                        index === current ? 'text-[#0E121B]' : ''
                      }`}
                    >
                      {breadcrumb.label}
                    </span>
                  </div>
                </BreadcrumbItem>
              </BreadcrumbLink>
              {index === breadcrumbs.length - 1 ? null : (
                <BreadcrumbSeparator>
                  <ChevronRight />
                </BreadcrumbSeparator>
              )}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <StepContext.Provider value={{ next, goTo }}>
        <div key={breadcrumbs[current]?.id}>{breadcrumbs[current]?.details}</div>
      </StepContext.Provider>
    </div>
  );
};

export default BreadCrumbSelector;
