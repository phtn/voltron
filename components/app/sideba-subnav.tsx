import { Icon } from '@/lib/icons'
import type { RobotTelemetry } from '@/lib/robot/protocol'

interface SidebarSubNavProps {
  connected: boolean
  telemetry: RobotTelemetry | null
  connectionFault: string | null
  estopped: boolean
  toggleEstop: () => void
}

export function SidebarSubNav({
  connected,
  telemetry,
  connectionFault,
  estopped,
  toggleEstop
}: SidebarSubNavProps) {
  const peakTemperature = telemetry?.temperatures.length ? Math.max(...telemetry.temperatures) : null
  const reportedChannels = telemetry?.joints.length ?? 0
  const controllerEstopped = telemetry?.estopped ?? false
  const hasControllerFault = Boolean(connectionFault || telemetry?.faults.length || controllerEstopped)

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
        <span className={`status-dot ${estopped || hasControllerFault ? 'danger' : ''}`} />
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
          <b>{connected ? (telemetry?.voltage === null || telemetry?.voltage === undefined ? 'ONLINE' : `${telemetry.voltage.toFixed(1)} V`) : 'SIM'}</b>
        </div>
        <div>
          <span>Joint temperature</span>
          <b>{connected ? (peakTemperature === null ? '—' : `${peakTemperature.toFixed(1)} °C`) : '31.4 °C'}</b>
        </div>
        <div>
          <span>Rig channels</span>
          <b className={connected && reportedChannels !== 7 ? '' : 'good'}>
            {connected ? `${reportedChannels} / 7` : '7 / 7'}
          </b>
        </div>
      </div>
      <div className='side-footer'>
        <div className='safety-copy'>
          <i />
          <span>
            <b>
              {estopped
                ? 'MOTION LOCKED'
                : controllerEstopped
                  ? 'CONTROLLER E-STOP'
                  : hasControllerFault
                    ? 'CONTROLLER FAULT'
                    : 'SYSTEM NOMINAL'}
            </b>
            <small>
              {estopped
                ? 'Release E-stop to continue'
                : controllerEstopped
                  ? 'Release the physical E-stop'
                  : connectionFault ?? telemetry?.faults[0] ?? 'No faults detected'}
            </small>
          </span>
        </div>
        <button
          className='estop'
          onClick={toggleEstop}
          disabled={connected}
          title={connected ? 'Use the physical emergency stop while hardware is connected.' : undefined}>
          <span>
            <i />
          </span>
          {connected ? 'USE PHYSICAL E-STOP' : estopped ? 'RELEASE E-STOP' : 'EMERGENCY STOP'}
        </button>
      </div>
    </div>
  )
}
