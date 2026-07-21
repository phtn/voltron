'use client'

import { ControlPanel } from '@/components/app/control-panel'
import ProgramPanel from '@/components/app/program-panel'
import { SidebarSubNav } from '@/components/app/sideba-subnav'
import { SidebarNav } from '@/components/app/sidebar-nav'
import { StageToolbar } from '@/components/app/stage-toolbar'
import { Toolbar } from '@/components/app/toolbar'
import { Logo } from '@/components/logo'
import { RobotScenePreview } from '@/components/models/preview'
import { useProgramRunner } from '@/hooks/use-program-runner'
import { useTargetPoses } from '@/hooks/use-target-poses'
import { Icon } from '@/lib/icons'
import { Joint } from '@/types'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

const initialJoints: Joint[] = [
  {
    id: 'J1',
    name: 'Base',
    type: 'Rig axis',
    value: 0,
    home: 0,
    min: -170,
    max: 170,
    motion: { maxVelocity: 75, maxAcceleration: 180, maxJerk: 900 }
  },
  {
    id: 'J2',
    name: 'Shoulder',
    type: 'Rig axis',
    value: 0,
    home: 0,
    min: -90,
    max: 90,
    motion: { maxVelocity: 60, maxAcceleration: 140, maxJerk: 700 }
  },
  {
    id: 'J3',
    name: 'Upper arm',
    type: 'Rig axis',
    value: 0,
    home: 0,
    min: -45,
    max: 45,
    motion: { maxVelocity: 75, maxAcceleration: 180, maxJerk: 900 }
  },
  {
    id: 'J4',
    name: 'Elbow',
    type: 'Rig axis',
    value: 0,
    home: 0,
    min: -90,
    max: 90,
    motion: { maxVelocity: 100, maxAcceleration: 260, maxJerk: 1400 }
  },
  {
    id: 'J5',
    name: 'Wrist A',
    type: 'Rig axis',
    value: 0,
    home: 0,
    min: -90,
    max: 90,
    motion: { maxVelocity: 130, maxAcceleration: 360, maxJerk: 2200 }
  },
  {
    id: 'J6',
    name: 'Wrist B',
    type: 'Rig axis',
    value: 0,
    home: 0,
    min: -120,
    max: 120,
    motion: { maxVelocity: 160, maxAcceleration: 480, maxJerk: 3000 }
  },
  {
    id: 'J7',
    name: 'Tool',
    type: 'Rig axis',
    value: 0,
    home: 0,
    min: -180,
    max: 180,
    motion: { maxVelocity: 200, maxAcceleration: 600, maxJerk: 4000 }
  }
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
  const [estopped, setEstopped] = useState(false)
  const [connected, setConnected] = useState(false)
  const [view, setView] = useState('Orbit')
  const [speed, setSpeed] = useState(42)
  const [activeWaypoint, setActiveWaypoint] = useState(1)
  const [notice, setNotice] = useState('Sandbox is ready. Connect hardware when available.')
  const { poses: waypoints, addTargetPose, deleteTargetPose } = useTargetPoses()
  const resolvedActiveWaypoint = waypoints.some((point) => point.id === activeWaypoint)
    ? activeWaypoint
    : (waypoints[0]?.id ?? 0)
  const { running, paused, progress, motionKind, toggleProgram, moveToPose, cancelProgram } = useProgramRunner({
    joints,
    setJoints,
    poses: waypoints,
    activePoseId: resolvedActiveWaypoint,
    setActivePoseId: setActiveWaypoint,
    speed,
    onComplete: () => setNotice('Program complete. Final target pose reached.'),
    onPoseReached: (pose) => setNotice(`${pose.name} reached.`)
  })

  const tcp = useMemo(
    () => ({
      x: (182.4 + (joints[0].value - joints[0].home) * 0.18).toFixed(1),
      y: (-46.8 + (joints[1].value - joints[1].home) * 0.09).toFixed(1),
      z: (214.2 + (joints[2].value - joints[2].home) * 0.22).toFixed(1)
    }),
    [joints]
  )

  function updateJoint(index: number, value: number) {
    cancelProgram()
    setJoints((current) => current.map((joint, jointIndex) => (jointIndex === index ? { ...joint, value } : joint)))
    setActiveJoint(index)
  }

  function resetPose() {
    cancelProgram(true)
    setJoints(initialJoints)
    if (waypoints[0]) setActiveWaypoint(waypoints[0].id)
    setNotice('Robot returned to the Home pose.')
  }

  function toggleRun() {
    if (estopped) {
      setNotice('Release the emergency stop before running a program.')
      return
    }
    const action = toggleProgram()
    if (action === 'paused') setNotice('Motion paused at the current interpolated pose.')
    if (action === 'resumed') setNotice('Motion resumed toward the target pose.')
    if (action === 'started') setNotice('Running from the current pose through the remaining timeline.')
    if (action === 'at-end') setNotice('The final target is selected. Choose an earlier pose to run the timeline.')
  }

  function toggleEstop() {
    if (!estopped) cancelProgram()
    setEstopped((value) => !value)
    setNotice(
      estopped ? 'Emergency stop released. Motion remains stopped.' : 'Emergency stop engaged. All motion inhibited.'
    )
  }

  function addWaypoint() {
    cancelProgram()
    const newPose = addTargetPose(joints.map((joint) => joint.value))
    setActiveWaypoint(newPose.id)
    setNotice(`${newPose.name} saved in this browser.`)
  }

  function deleteWaypoint() {
    if (waypoints.length <= 1) return
    cancelProgram()
    const selectedIndex = waypoints.findIndex((point) => point.id === resolvedActiveWaypoint)
    const nextPose = waypoints[selectedIndex + 1] ?? waypoints[selectedIndex - 1]
    if (!deleteTargetPose(resolvedActiveWaypoint)) return
    if (nextPose) setActiveWaypoint(nextPose.id)
    setNotice('Target pose removed from local storage.')
  }

  function selectWaypoint(id: number) {
    const target = waypoints.find((point) => point.id === id)
    if (!target) return
    if (estopped) {
      setNotice('Release the emergency stop before moving to a target pose.')
      return
    }
    if (!moveToPose(id)) return
    setNotice(`Moving to ${target.name} with constrained motion.`)
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
        <Toolbar
          mode={mode}
          running={running}
          paused={paused}
          resetPose={resetPose}
          toggleRun={toggleRun}
          setMode={setMode}
        />
        <div className='stage-panel'>
          <StageToolbar view={view} setView={setView} />
          <RobotScene joints={joints} view={view} activeJoint={activeJoint} />

          <div className='scene-toast'>
            <i className={estopped ? 'danger' : running ? 'running' : ''} />
            <span>
              <b>
                {estopped
                  ? 'Motion inhibited'
                  : running
                    ? motionKind === 'pose'
                      ? 'Moving to target'
                      : 'Program running'
                    : paused
                      ? 'Motion paused'
                      : 'Ready for motion'}
              </b>
              {notice}
            </span>
          </div>
        </div>

        <ProgramPanel
          activeWaypoint={resolvedActiveWaypoint}
          selectWaypoint={selectWaypoint}
          waypoints={waypoints}
          addWaypoint={addWaypoint}
          deleteWaypoint={deleteWaypoint}
          progress={progress}
        />
      </section>

      <ControlPanel
        controlMode={controlMode}
        tcp={tcp}
        joints={joints}
        updateJoint={updateJoint}
        activeJoint={activeJoint}
        speed={speed}
        setSpeed={setSpeed}
        setActiveJoint={setActiveJoint}
        setControlMode={setControlMode}
        saveTargetPose={addWaypoint}
      />
    </main>
  )
}
