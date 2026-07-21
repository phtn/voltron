import { Icon } from '@/lib/icons'

interface SidebarSubNavProps {
  connected: boolean
  estopped: boolean
  toggleEstop: () => void
}

export function SidebarSubNav({ connected, estopped, toggleEstop }: SidebarSubNavProps) {
  return (
    <div className='sidebar-content'>
      <div className='sidebar-heading'>
        <div>
          <h2>V_Mk1</h2>
        </div>
        <button>
          <Icon name='more-h' />
        </button>
      </div>
      <div className='robot-card'>
        <div className='mini-arm'>
          <Icon name='arm' size={28} />
        </div>
        <div>
          <b>7 DOF Model</b>
          <span>250 mm reach · 250 g</span>
        </div>
        <span className={`status-dot ${estopped ? 'danger' : ''}`} />
      </div>
      <div className='side-section'>
        <span className='section-label'>WORKSPACE</span>
        <button className='side-link active'>
          <Icon name='terminal-fill' />
          <span>Control room</span>
          <kbd>1</kbd>
        </button>
        <button className='side-link'>
          <Icon name='layers' />
          <span>Programs</span>
          <small>3</small>
        </button>
        <button className='side-link'>
          <Icon name='cube' />
          <span>Calibration</span>
        </button>
      </div>
      <div className='side-section telemetry'>
        <span className='section-label'>ROBOT HEALTH</span>
        <div>
          <span>Controller</span>
          <b>{connected ? '24.1 V' : 'SIM'}</b>
        </div>
        <div>
          <span>Joint temperature</span>
          <b>31.4 °C</b>
        </div>
        <div>
          <span>Rig channels</span>
          <b className='good'>7 / 7</b>
        </div>
      </div>
      <div className='side-footer'>
        <div className='safety-copy'>
          <i />
          <span>
            <b>{estopped ? 'MOTION LOCKED' : 'SYSTEM NOMINAL'}</b>
            <small>{estopped ? 'Release E-stop to continue' : 'No faults detected'}</small>
          </span>
        </div>
        <button className='estop' onClick={toggleEstop}>
          <span>
            <i />
          </span>
          {estopped ? 'RELEASE E-STOP' : 'EMERGENCY STOP'}
        </button>
      </div>
    </div>
  )
}
