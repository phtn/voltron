import type { IconNameType } from '@/lib/icons/icons'
import type { ClassName } from '@/types'
import type { SVGProps } from 'react'
export type IconList = Record<IconNameType, { viewBox: string; symbol: string }>

export type IconName = IconNameType

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  className?: ClassName
  size?: number
  color?: string
  solid?: boolean
}

export interface IconData {
  symbol: string
  set: string
  viewBox?: string
}
