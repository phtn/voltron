import { Icon } from '@/lib/icons'

export function StageToolbar({ view, setView }: { view: string; setView: (view: string) => void }) {
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
