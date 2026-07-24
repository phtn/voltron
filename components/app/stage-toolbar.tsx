import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { SceneBackground } from '@/types'

type StageToolbarProps = {
  background: SceneBackground
  laserEnabled: boolean
  setView: (view: string) => void
  toggleBackground: () => void
  toggleLaser: () => void
  view: string
}

export function StageToolbar({
  background,
  laserEnabled,
  setView,
  toggleBackground,
  toggleLaser,
  view
}: StageToolbarProps) {
  const nextBackground = background === 'dark' ? 'light' : 'dark'

  return (
    <div className='stage-toolbar'>
      <div className='view-switcher'>
        {['Orbit', 'Front', 'Top'].map((item) => (
          <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className='stage-tools'>
        <button
          aria-label={`Switch to ${nextBackground} scene background`}
          aria-pressed={background === 'light'}
          title={`Switch to ${nextBackground} scene background`}
          onClick={toggleBackground}>
          <Icon name={'theme'} className={cn('size-4 transition', background === 'dark' ? 'rotate-180' : 'rotate-0')} />
        </button>
        <button
          className='laser-toggle'
          aria-label={`Turn simulated laser ${laserEnabled ? 'off' : 'on'}`}
          aria-pressed={laserEnabled}
          title={`Turn simulated laser ${laserEnabled ? 'off' : 'on'}`}
          onClick={toggleLaser}>
          <Icon name='laser' />
        </button>
        <button aria-label='Toggle grid'>
          <Icon name='grid' />
        </button>
        <button aria-label='Fullscreen'>
          <Icon name='fullscreen' />
        </button>
      </div>
    </div>
  )
}
