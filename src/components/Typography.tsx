import type { HTMLAttributes, ReactNode } from 'react';

type HeadingLevel = 1 | 2 | 3;

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  children: ReactNode;
}

export function Heading({ level = 2, children, className = '', ...props }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag className={`font-semibold tracking-normal text-app-fg ${className}`} {...props}>
      {children}
    </Tag>
  );
}

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  as?: 'p' | 'span' | 'div';
}

export function Text({ as: Tag = 'p', children, className = '', ...props }: TextProps) {
  return (
    <Tag className={`text-app-muted tracking-normal ${className}`} {...props}>
      {children}
    </Tag>
  );
}
