import { Icon } from '@/lib/icons'

interface ToolbarProps {
  mode: 'Train' | 'Test'
  running: boolean
  paused: boolean
  resetPose: () => void
  toggleRun: () => void
  setMode: (mode: 'Train' | 'Test') => void
}

export function Toolbar({ mode, running, paused, resetPose, toggleRun, setMode }: ToolbarProps) {
  return (
    <div className='workspace-toolbar px-2'>
      <div>
        <h1>Workspace</h1>
      </div>
      <div className='mode-toggle' aria-label='Operation mode'>
        {(['Train', 'Test'] as const).map((item) => (
          <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className='workspace-actions'>
        <button onClick={resetPose} className='border-none shadow-none'>
          <Icon name='rotate-x' />
          Reset pose
        </button>
        <button className='run-button' onClick={toggleRun}>
          <Icon name={running ? 'pause' : 'play'} />
          {running ? 'Pause' : paused ? 'Resume' : 'Run program'}
        </button>
      </div>
    </div>
  )
}
