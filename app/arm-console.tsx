'use client'

import { ControlPanel } from '@/components/app/control-panel'
import ProgramPanel from '@/components/app/program-panel'
import { SidebarSubNav } from '@/components/app/sideba-subnav'
import { SidebarNav } from '@/components/app/sidebar-nav'
import { StageToolbar } from '@/components/app/stage-toolbar'
import { Toolbar } from '@/components/app/toolbar'
import { Logo } from '@/components/logo'
import { RobotScenePreview } from '@/components/models/preview'
import { Icon } from '@/lib/icons'
import { Joint } from '@/types'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'

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
          <Icon name='chevron-right' className='size-3' />
          <button>KUMA Heavy</button>
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
            <Icon name='chip' size={16} />
            <span>{connected ? 'ESP-32 ONLINE' : 'NO HARDWARE'}</span>
          </button>

          <button className='' aria-label='Profile'>
            <Icon name='re-up.ph' size={16} />
          </button>
        </div>
      </header>

      <aside className='sidebar'>
        <SidebarNav />
        <SidebarSubNav connected={connected} estopped={estopped} toggleEstop={toggleEstop} />
      </aside>

      <section className='workspace'>
        <Toolbar mode={mode} running={running} resetPose={resetPose} toggleRun={toggleRun} setMode={setMode} />
        <div className='stage-panel'>
          <StageToolbar view={view} setView={setView} />
          <RobotScene joints={joints} view={view} activeJoint={activeJoint} />

          <div className='scene-toast'>
            <i className={estopped ? 'danger' : running ? 'running' : ''} />
            <span>
              <b>{estopped ? 'Motion inhibited' : running ? 'Program running' : 'Ready for motion'}</b>
              {notice}
            </span>
          </div>
        </div>

        <ProgramPanel
          activeWaypoint={activeWaypoint}
          setActiveWaypoint={setActiveWaypoint}
          waypoints={waypoints}
          addWaypoint={addWaypoint}
          deleteWaypoint={deleteWaypoint}
          progress={progress}
        />
      </section>

      <ControlPanel
        controlMode={controlMode}
        onActiveJointChange={setActiveJoint}
        onSpeedChange={setSpeed}
        tcp={tcp}
        joints={joints}
        updateJoint={updateJoint}
        activeJoint={0}
        speed={0}
        setSpeed={setSpeed}
        setActiveJoint={setActiveJoint}
        setControlMode={setControlMode}
      />
    </main>
  )
}
