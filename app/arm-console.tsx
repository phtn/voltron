'use client'

import { Logo } from '@/components/logo'
import { RobotScenePreview } from '@/components/models/preview'
import { Joint } from '@/types'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'

type IconName =
  | 'arm'
  | 'chevron'
  | 'command'
  | 'cube'
  | 'expand'
  | 'grid'
  | 'help'
  | 'home'
  | 'layers'
  | 'more'
  | 'pause'
  | 'play'
  | 'plus'
  | 'rotate'
  | 'settings'
  | 'stop'
  | 'terminal'
  | 'trash'
  | 'user'
  | 'wifi'

const iconPaths: Record<IconName, React.ReactNode> = {
  arm: (
    <>
      <circle cx='6' cy='18' r='2' />
      <circle cx='10' cy='11' r='2' />
      <circle cx='17' cy='7' r='2' />
      <path d='m7.2 16.4 1.7-3.5m2.8-2.9 3.6-2.1M18.8 8.3l1.7 2.2m-3.6 5.2 2-5.2M14 17.5l3-1.8' />
    </>
  ),
  chevron: <path d='m9 18 6-6-6-6' />,
  command: (
    <>
      <path d='M18 9V5a2 2 0 0 0-2-2h-1a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4H6v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H8a2 2 0 0 0-2 2v4Z' />
    </>
  ),
  cube: (
    <>
      <path d='m12 3 8 4.5v9L12 21l-8-4.5v-9Z' />
      <path d='m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9' />
    </>
  ),
  expand: <path d='M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5' />,
  grid: (
    <>
      <rect x='3' y='3' width='7' height='7' rx='1' />
      <rect x='14' y='3' width='7' height='7' rx='1' />
      <rect x='3' y='14' width='7' height='7' rx='1' />
      <rect x='14' y='14' width='7' height='7' rx='1' />
    </>
  ),
  help: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M9.7 9a2.4 2.4 0 1 1 3.5 2.2c-.8.4-1.2.9-1.2 1.8m0 3.5h.01' />
    </>
  ),
  home: (
    <>
      <path d='m3 11 9-8 9 8' />
      <path d='M5 10v10h14V10M9 20v-6h6v6' />
    </>
  ),
  layers: (
    <>
      <path d='m12 2 9 5-9 5-9-5Z' />
      <path d='m3 12 9 5 9-5M3 17l9 5 9-5' />
    </>
  ),
  more: (
    <>
      <circle cx='5' cy='12' r='1' fill='currentColor' />
      <circle cx='12' cy='12' r='1' fill='currentColor' />
      <circle cx='19' cy='12' r='1' fill='currentColor' />
    </>
  ),
  pause: (
    <>
      <path d='M9 6v12M15 6v12' />
    </>
  ),
  play: <path d='m8 5 11 7-11 7Z' />,
  plus: <path d='M12 5v14M5 12h14' />,
  rotate: (
    <>
      <path d='M20 7v5h-5' />
      <path d='M19 12a7 7 0 1 1-2-5' />
    </>
  ),
  settings: (
    <>
      <circle cx='12' cy='12' r='3' />
      <path d='M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z' />
    </>
  ),
  stop: <rect x='6' y='6' width='12' height='12' rx='1' />,
  terminal: (
    <>
      <path d='m5 7 4 4-4 4m6 0h7' />
      <rect x='2.5' y='3' width='19' height='18' rx='2' />
    </>
  ),
  trash: (
    <>
      <path d='M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6' />
    </>
  ),
  user: (
    <>
      <circle cx='12' cy='8' r='4' />
      <path d='M4 21a8 8 0 0 1 16 0' />
    </>
  ),
  wifi: (
    <>
      <path d='M5 12.5a10 10 0 0 1 14 0M8 16a6 6 0 0 1 8 0' />
      <circle cx='12' cy='19' r='1' fill='currentColor' />
    </>
  )
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.7'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'>
      {iconPaths[name]}
    </svg>
  )
}

const initialJoints: Joint[] = [
  { id: 'J1', name: 'Base', type: 'Rig axis', value: 0, home: 0, min: -170, max: 170 },
  { id: 'J2', name: 'Shoulder', type: 'Rig axis', value: 0, home: 0, min: -90, max: 90 },
  { id: 'J3', name: 'Upper arm', type: 'Rig axis', value: 0, home: 0, min: -45, max: 45 },
  { id: 'J4', name: 'Elbow', type: 'Rig axis', value: 0, home: 0, min: -90, max: 90 },
  { id: 'J5', name: 'Wrist A', type: 'Rig axis', value: 0, home: 0, min: -90, max: 90 },
  { id: 'J6', name: 'Wrist B', type: 'Rig axis', value: 0, home: 0, min: -120, max: 120 },
  { id: 'J7', name: 'Tool', type: 'Rig axis', value: 0, home: 0, min: -180, max: 180 }
]

const initialWaypoints = [
  { id: 1, name: 'Home', pose: '0, 0, 0, 0, 0, 0, 0', time: '00:00.0' },
  { id: 2, name: 'Approach', pose: '18, -18, 20, 12, 36, 0, 0', time: '00:01.2' },
  { id: 3, name: 'Pick', pose: '22, -8, 32, 12, 42, 8, 0', time: '00:02.5' },
  { id: 4, name: 'Inspect', pose: '-28, 12, 20, -22, 15, 0, 12', time: '00:04.1' }
]

const RobotScene = dynamic(() => import('../components/robot-scene'), {
  ssr: false,
  loading: () => <RobotScenePreview joints={initialJoints} view='Orbit' />
})

export default function ArmConsole() {
  const [joints, setJoints] = useState(initialJoints)
  const [activeJoint, setActiveJoint] = useState(1)
  const [controlMode, setControlMode] = useState<'Joint' | 'Cartesian'>('Joint')
  const [mode, setMode] = useState<'Train' | 'Test'>('Train')
  const [running, setRunning] = useState(false)
  const [estopped, setEstopped] = useState(false)
  const [connected, setConnected] = useState(false)
  const [view, setView] = useState('Orbit')
  const [speed, setSpeed] = useState(42)
  const [progress, setProgress] = useState(0)
  const [activeWaypoint, setActiveWaypoint] = useState(1)
  const [waypoints, setWaypoints] = useState(initialWaypoints)
  const [notice, setNotice] = useState('Sandbox is ready. Connect hardware when available.')

  useEffect(() => {
    if (!running || estopped) return
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 0 : value + 0.25 + speed / 180))
    }, 60)
    return () => window.clearInterval(timer)
  }, [running, estopped, speed])

  const tcp = useMemo(
    () => ({
      x: (182.4 + (joints[0].value - joints[0].home) * 0.18).toFixed(1),
      y: (-46.8 + (joints[1].value - joints[1].home) * 0.09).toFixed(1),
      z: (214.2 + (joints[2].value - joints[2].home) * 0.22).toFixed(1)
    }),
    [joints]
  )

  function updateJoint(index: number, value: number) {
    setJoints((current) => current.map((joint, jointIndex) => (jointIndex === index ? { ...joint, value } : joint)))
    setActiveJoint(index)
  }

  function resetPose() {
    setJoints(initialJoints)
    setProgress(0)
    setRunning(false)
    setNotice('Robot returned to the Home pose.')
  }

  function toggleRun() {
    if (estopped) {
      setNotice('Release the emergency stop before running a program.')
      return
    }
    setRunning((value) => !value)
    setNotice(running ? 'Program paused.' : 'Running Pick & Inspect in simulation.')
  }

  function toggleEstop() {
    setEstopped((value) => !value)
    setRunning(false)
    setNotice(
      estopped ? 'Emergency stop released. Motion is still paused.' : 'Emergency stop engaged. All motion inhibited.'
    )
  }

  function addWaypoint() {
    const id = waypoints.length ? Math.max(...waypoints.map((point) => point.id)) + 1 : 1
    const newPoint = {
      id,
      name: `Waypoint ${String(id).padStart(2, '0')}`,
      pose: joints.map((joint) => Math.round(joint.value)).join(', '),
      time: `00:0${Math.min(id, 9)}.0`
    }
    setWaypoints((current) => [...current, newPoint])
    setActiveWaypoint(id)
    setNotice(`${newPoint.name} recorded from the current pose.`)
  }

  function deleteWaypoint() {
    if (waypoints.length <= 1) return
    setWaypoints((current) => current.filter((point) => point.id !== activeWaypoint))
    setActiveWaypoint(waypoints[0].id === activeWaypoint ? waypoints[1].id : waypoints[0].id)
    setNotice('Waypoint removed from the sequence.')
  }

  return (
    <main className={`app-shell ${estopped ? 'is-estopped' : ''}`}>
      <header className='topbar'>
        <Logo />
        <div className='project-switcher'>
          <span>PROJECT</span>
          <button>
            Kuma Heavy <Icon name='chevron' size={14} />
          </button>
        </div>
        <div className='topbar-actions'>
          <span className='sim-badge'>
            <i /> SIMULATION
          </span>
          <button
            className={`connection ${connected ? 'connected' : ''}`}
            onClick={() => {
              setConnected((value) => !value)
              setNotice(connected ? 'Hardware disconnected.' : 'ESP-32 placeholder connected in demo mode.')
            }}>
            <Icon name='wifi' size={16} />
            <span>{connected ? 'ESP-32 ONLINE' : 'NO HARDWARE'}</span>
          </button>
          <button className='icon-button' aria-label='Help'>
            <Icon name='help' />
          </button>
          <button className='avatar' aria-label='Profile'>
            <Icon name='user' size={16} />
          </button>
        </div>
      </header>

      <aside className='sidebar'>
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
            <Icon name='terminal' />
          </button>
          <span className='nav-spacer' />
          <button title='Settings'>
            <Icon name='settings' />
          </button>
        </nav>
        <div className='sidebar-content'>
          <div className='sidebar-heading'>
            <div>
              <span>ROBOT</span>
              <h2>VOLTRON M1</h2>
            </div>
            <button>
              <Icon name='more' />
            </button>
          </div>
          <div className='robot-card'>
            <div className='mini-arm'>
              <Icon name='arm' size={34} />
            </div>
            <div>
              <b>7-bone model rig</b>
              <span>250 mm reach · 250 g</span>
            </div>
            <span className={`status-dot ${estopped ? 'danger' : ''}`} />
          </div>
          <div className='side-section'>
            <span className='section-label'>WORKSPACE</span>
            <button className='side-link active'>
              <Icon name='command' />
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
      </aside>

      <section className='workspace'>
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
            <button onClick={resetPose}>
              <Icon name='rotate' />
              Reset pose
            </button>
            <button className='run-button' onClick={toggleRun}>
              <Icon name={running ? 'pause' : 'play'} />
              {running ? 'Pause' : 'Run program'}
            </button>
          </div>
        </div>

        <div className='stage-panel'>
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
                <Icon name='expand' />
              </button>
            </div>
          </div>
          <RobotScene joints={joints} view={view} activeJoint={activeJoint} />
          <div className='scale'>
            <span>0</span>
            <i />
            <span>100 mm</span>
          </div>
          <div className='scene-toast'>
            <i className={estopped ? 'danger' : running ? 'running' : ''} />
            <span>
              <b>{estopped ? 'Motion inhibited' : running ? 'Program running' : 'Ready for motion'}</b>
              {notice}
            </span>
          </div>
        </div>

        <section className='program-panel'>
          <div className='program-head'>
            <div>
              <span className='section-label'>ACTIVE PROGRAM</span>
              <h2>
                Pick &amp; Inspect <small>v0.3</small>
              </h2>
            </div>
            <div className='program-actions'>
              <button onClick={addWaypoint}>
                <Icon name='plus' />
                Add waypoint
              </button>
              <button aria-label='Delete selected waypoint' onClick={deleteWaypoint} disabled={waypoints.length <= 1}>
                <Icon name='trash' />
              </button>
            </div>
          </div>
          <div className='timeline-wrap'>
            <div className='timeline-line'>
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className='timeline'>
              {waypoints.map((point, index) => (
                <button
                  key={point.id}
                  className={activeWaypoint === point.id ? 'active' : ''}
                  onClick={() => setActiveWaypoint(point.id)}>
                  <span className='waypoint-marker'>
                    <i>{index + 1}</i>
                  </span>
                  <span className='waypoint-copy'>
                    <b>{point.name}</b>
                    <small>{point.time}</small>
                  </span>
                </button>
              ))}
              <button className='add-point' onClick={addWaypoint}>
                <span>
                  <Icon name='plus' size={14} />
                </span>
                <small>ADD</small>
              </button>
            </div>
          </div>
        </section>
      </section>

      <aside className='control-panel'>
        <div className='control-header'>
          <div>
            <h2>Pose Controller</h2>
          </div>
          <button>
            <Icon name='more' />
          </button>
        </div>
        <div className='control-tabs'>
          {(['Joint', 'Cartesian'] as const).map((tab) => (
            <button key={tab} className={controlMode === tab ? 'active' : ''} onClick={() => setControlMode(tab)}>
              {tab}
            </button>
          ))}
        </div>

        {controlMode === 'Joint' ? (
          <div className='joint-list'>
            {joints.map((joint, index) => {
              const position = ((joint.value - joint.min) / (joint.max - joint.min)) * 100
              return (
                <div
                  className={`joint-row ${activeJoint === index ? 'active' : ''}`}
                  key={joint.id}
                  onClick={() => setActiveJoint(index)}>
                  <div className='joint-meta'>
                    <span>{joint.id}</span>
                    <div>
                      <b>{joint.name}</b>
                      <small>{joint.type}</small>
                    </div>
                    <label>
                      <input
                        type='number'
                        min={joint.min}
                        max={joint.max}
                        value={Math.round(joint.value)}
                        onChange={(event) => updateJoint(index, Number(event.target.value))}
                      />
                      <em>°</em>
                    </label>
                  </div>
                  <div className='range-label'>
                    <span>{joint.min}°</span>
                    <span>{joint.max}°</span>
                  </div>
                  <input
                    className='joint-slider'
                    style={{ '--value': `${position}%` } as React.CSSProperties}
                    type='range'
                    min={joint.min}
                    max={joint.max}
                    value={joint.value}
                    onChange={(event) => updateJoint(index, Number(event.target.value))}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className='cartesian-panel'>
            <div className='coordinate-group'>
              <span>POSITION / MM</span>
              {[
                ['X', tcp.x],
                ['Y', tcp.y],
                ['Z', tcp.z]
              ].map(([axis, value]) => (
                <label key={axis}>
                  <i>{axis}</i>
                  <input value={value} readOnly />
                  <em>mm</em>
                </label>
              ))}
            </div>
            <div className='coordinate-group'>
              <span>ORIENTATION / DEG</span>
              {[
                ['RX', '0.0'],
                ['RY', '24.0'],
                ['RZ', '0.0']
              ].map(([axis, value]) => (
                <label key={axis}>
                  <i>{axis}</i>
                  <input value={value} readOnly />
                  <em>°</em>
                </label>
              ))}
            </div>
            <button className='apply-pose'>Apply target pose</button>
          </div>
        )}

        <div className='speed-control'>
          <div>
            <span className='section-label'>MOTION SPEED</span>
            <b>{speed}%</b>
          </div>
          <input
            className='speed-slider'
            style={{ '--value': `${speed}%` } as React.CSSProperties}
            type='range'
            min='1'
            max='100'
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
          <div className='range-label'>
            <span>Precise</span>
            <span>Fast</span>
          </div>
        </div>
        <div className='control-footer'>
          <div>
            <span>Payload</span>
            <b>250 g</b>
          </div>
          <div>
            <span>Repeatability</span>
            <b>±0.01 mm</b>
          </div>
          <div>
            <span>Cycle time</span>
            <b>5.8 s</b>
          </div>
        </div>
      </aside>
    </main>
  )
}
