'use client';
import React, { JSX, useEffect, useState } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '../../../@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbData {
  id: number;
  label: string;
  details: JSX.Element;
}

interface BreadcrumbProps {
  breadcrumbs: BreadcrumbData[];
}

const BreadCrumbSelector = ({ breadcrumbs }: BreadcrumbProps) => {
  const [selectedBreadcrumb, setSelectedBreadcrumb] = useState<JSX.Element | null>(
    breadcrumbs[0].details || null
  );

  const handleBreadcrumbClick = (breadcrumb: BreadcrumbData) => {
    setSelectedBreadcrumb(breadcrumb.details);
  };

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={breadcrumb.id} className="flex items-center gap-6 mr-4">
              <BreadcrumbLink asChild key={breadcrumb.id}>
                <BreadcrumbItem
                  key={breadcrumb.id}
                  onClick={() => handleBreadcrumbClick(breadcrumb)}
                  className={`cursor-pointer hover:text-[#0E121B] `}
                >
                  <div
                    className={`${breadcrumb.details === selectedBreadcrumb ? 'text-[#0E121B]' : ''} flex items-center`}
                  >
                    <span
                      className={`flex items-center justify-center w-5 h-5 rounded-full border ${
                        breadcrumb.details === selectedBreadcrumb
                          ? 'bg-[#0E121B] text-white'
                          : 'bg-white text-[#525866]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`ml-2 ${
                        breadcrumb.details === selectedBreadcrumb ? 'text-[#0E121B]' : ''
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

      {selectedBreadcrumb && <div>{selectedBreadcrumb}</div>}
    </div>
  );
};

export default BreadCrumbSelector;
