'use client'

import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { animate, stagger, svg } from 'animejs'
import { useEffect } from 'react'

export const Loader = () => (
  <div className='h-64 w-64 mx-auto scale-75 flex items-center justify-center'>
    <Inner />
    <Tracer />
  </div>
)

const Inner = () => (
  <div className='absolute flex flex-col items-center justify-center'>
    <div className='text-zinc-600 dark:text-zinc-900 font-space aspect-square flex items-center justify-center'>
      <Icon
        solid
        name='re-up.ph'
        className={cn(
          'absolute translate-x-1 origin-center opacity-0',
          'flex size-16',
          'dark:text-emerald-50 dark:scale-105 dark:blur-sm',
          'text-teal-100/60 blur-sm',
          'opacity-100 animate-ping duration-[2s]',
          'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]'
        )}
      />
      <Icon
        solid
        name='re-up.ph'
        className={cn(
          'relative origin-center z-10 size-16',
          'dark:text-white',
          'text-slate-500',
          'transition-colors duration-500 ease-out'
        )}
      />
    </div>
  </div>
)

const Tracer = () => {
  useEffect(() => {
    animate(svg.createDrawable('.logo-outline'), {
      draw: ['0 0', '0 0.5', '0 1', '1 1'],
      ease: 'inOutQuad',
      duration: 1600,
      delay: stagger(50),
      loop: true,
      autoplay: true
    })
  }, [])

  return (
    <div className='absolute w-full flex justify-center'>
      <svg
        width='600'
        height='600'
        viewBox='0 0 600 600'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className='scale-[16%] text-slate-600 dark:text-zinc-700 shrink-0'>
        <path
          className='logo-outline'
          d='M442 437.562V166C442 158 442 158 434 158H166C158 158 158 158 158 166V434C158 442 158 442 166 442H300M442 446.438V555.825C442 584 442 584 470.175 584H584V470.175C584 442 584 442 555.825 442H300M300 442V555.825C300 584 300 584 271.825 584H44.1746C16 584 16 584 16 555.825V44.1746C16 16 16 16 44.1746 16H555.825C584 16 584 16 584 44.1746V271.825C584 300 584 300 555.825 300H443M300 442V302C300 300 300 300 302 300H441'
          stroke='currentColor'
          strokeWidth={16}
        />
      </svg>
    </div>
  )
}
