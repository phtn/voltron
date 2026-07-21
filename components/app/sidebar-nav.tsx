import { Icon } from '@/lib/icons'

export function SidebarNav() {
  return (
    <nav className='primary-nav' aria-label='Primary navigation'>
      <button title='Overview'>
        <Icon name='home' />
      </button>
      <button className='active' title='Arm workspace'>
        <Icon name='arm' />
      </button>
      <button title='Programs'>
        <Icon name='layers' />
      </button>
      <button title='Digital twin'>
        <Icon name='cube' />
      </button>
      <button title='Terminal'>
        <Icon name='terminal-fill' />
      </button>
      <span className='nav-spacer' />
      <button title='Settings'>
        <Icon name='settings-fill' />
      </button>
    </nav>
  )
}
