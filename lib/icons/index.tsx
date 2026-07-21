'use client'

import { type IconNameType, icons } from '@/lib/icons/icons'
import type { IconProps } from '@/lib/icons/types'
import { cn } from '@/lib/utils'
import type { FC } from 'react'

export type IconName = IconNameType

export const Icon: FC<IconProps> = ({ name, className, size = 16, color = 'currentColor', solid = true, ...props }) => {
  const icon = icons[name as IconNameType]

  return (
    <div
      suppressHydrationWarning
      className={cn(props.onClick && 'cursor-pointer active:scale-92 transition-transform duration-200', className)}>
      <svg
        aria-hidden
        strokeWidth='1'
        suppressHydrationWarning
        className={cn('shrink-0 my-auto', { 'cursor-pointer': props.onClick }, className)}
        xmlns='http://www.w3.org/2000/svg'
        viewBox={icon?.viewBox ?? '0 0 24 24'}
        width={size}
        height={size}
        fill={solid ? color : 'none'}
        stroke={solid ? 'none' : color}
        strokeLinejoin='round'
        strokeLinecap='round'
        {...props}
        dangerouslySetInnerHTML={{ __html: icon?.symbol }}
      />
    </div>
  )
}
