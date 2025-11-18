import React from 'react';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

type Props = {
  value: string;
  type: HeadingLevel;
  styleProps?: React.CSSProperties;
  className?: string;
};

const sizeMap: Record<HeadingLevel, string> = {
  h1: 'text-3xl lg:text-4xl',
  h2: 'text-2xl lg:text-3xl',
  h3: 'text-xl lg:text-2xl',
  h4: 'text-lg lg:text-xl',
  h5: 'text-base lg:text-lg',
};

const CustomHeading = ({ value, type, styleProps, className }: Props) => {
  const Tag = type;

  return (
    <Tag
      style={styleProps}
      className={`text-[#101928] font-semibold leading-tight ${sizeMap[type]} ${className || ''}`}
    >
      {value}
    </Tag>
  );
};

export default CustomHeading;
