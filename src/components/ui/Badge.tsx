/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning' | 'info' | 'gradient';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-slate-900 text-white',
      secondary: 'bg-slate-100 text-slate-900',
      outline: 'border border-slate-200 text-slate-900',
      success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      danger: 'bg-red-50 text-red-600 border border-red-100',
      warning: 'bg-amber-50 text-amber-600 border border-amber-100',
      info: 'bg-blue-50 text-blue-600 border border-blue-100',
      gradient: 'bg-gradient-to-r from-[#ff5a7a] to-[#8a14d1] text-white',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
