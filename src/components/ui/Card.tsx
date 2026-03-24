/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'gradient';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-white shadow-sm',
      outline: 'border border-slate-200 bg-white',
      ghost: 'bg-transparent',
      gradient: 'bg-gradient-to-br from-[#ff5a7a10] to-[#8a14d110] border border-[#ff5a7a20]',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-3xl p-6', variants[variant], className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export { Card };
