'use client'

import { ControlPanel } from '@/components/app/control-panel'
import ProgramPanel from '@/components/app/program-panel'
import { SidebarNav } from '@/components/app/sidebar-nav'
import { SidebarSubNav } from '@/components/app/sidebar-subnav'
import { StageToolbar } from '@/components/app/stage-toolbar'
import { Toolbar } from '@/components/app/toolbar'
import { Logo } from '@/components/logo'
import { LoadScene } from '@/components/models/preview'
import { useProgramRunner } from '@/hooks/use-program-runner'
import { useRobotConnection } from '@/hooks/use-robot-connection'
import { useTargetPoses } from '@/hooks/use-target-poses'
import { Icon } from '@/lib/icons'
import { quantizeJointValue } from '@/lib/joint-step'
import { getRobotProgramPreset, materializeRobotProgramPreset } from '@/lib/robot-program-presets'
import type { RobotTelemetry } from '@/lib/robot/protocol'
import type { Joint, JointStep, SceneBackground } from '@/types'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  loading: () => <LoadScene />
})

export default function ArmConsole() {
  const [joints, setJoints] = useState(initialJoints)
  const [activeJoint, setActiveJoint] = useState(1)
  const [controlMode, setControlMode] = useState<'Joint' | 'Cartesian'>('Joint')
  const [mode, setMode] = useState<'Train' | 'Test'>('Train')
  const [estopped, setEstopped] = useState(false)
  const [view, setView] = useState('Orbit')
  const [sceneBackground, setSceneBackground] = useState<SceneBackground>('dark')
  const [laserEnabled, setLaserEnabled] = useState(false)
  const [jointStep, setJointStep] = useState<JointStep>(1)
  const [speed, setSpeed] = useState(42)
  const [activeWaypoint, setActiveWaypoint] = useState(1)
  const [notice, setNotice] = useState('Not connected.')
  const [sceneEnabled, setSceneEnabled] = useState(false)
  const jointsSnapshotRef = useRef(joints)

  useEffect(() => {
    jointsSnapshotRef.current = joints
  }, [joints])

  useEffect(() => {
    const idleWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }
    let timeoutId: number | null = null
    let idleId: number | null = null

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => setSceneEnabled(true), { timeout: 1_200 })
    } else {
      timeoutId = window.setTimeout(() => setSceneEnabled(true), 300)
    }

    return () => {
      if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [])

  const applyHardwareTelemetry = useCallback((nextTelemetry: RobotTelemetry) => {
    setJoints((current) => {
      let changed = false
      const next = current.map((joint, index) => {
        const measuredValue = nextTelemetry.joints[index]
        if (measuredValue === undefined) return joint
        const value = Math.min(joint.max, Math.max(joint.min, measuredValue))
        if (Math.abs(value - joint.value) < 0.0001) return joint
        changed = true
        return { ...joint, value }
      })
      return changed ? next : current
    })
  }, [])
  const {
    status: connectionStatus,
    connected,
    connecting,
    device,
    telemetry,
    error: connectionError,
    fault: connectionFault,
    connect,
    disconnect
  } = useRobotConnection({ onTelemetry: applyHardwareTelemetry })
  const {
    poses: waypoints,
    addTargetPose,
    createTargetPoseSet,
    deleteTargetPose,
    swapTargetPoses,
    replaceTargetPoses
  } = useTargetPoses()
  const resolvedActiveWaypoint = useMemo(
    () => (waypoints.some((point) => point.id === activeWaypoint) ? activeWaypoint : (waypoints[0]?.id ?? 0)),
    [activeWaypoint, waypoints]
  )
  const handleProgramComplete = useCallback(() => setNotice('Program complete.'), [])
  const handlePoseReached = useCallback((pose: { name: string }) => setNotice(`${pose.name} reached.`), [])
  const { running, paused, progress, motionKind, toggleProgram, moveToPose, cancelProgram, setTimelineIndex } =
    useProgramRunner({
      joints,
      setJoints,
      poses: waypoints,
      activePoseId: resolvedActiveWaypoint,
      setActivePoseId: setActiveWaypoint,
      speed,
      onComplete: handleProgramComplete,
      onPoseReached: handlePoseReached
    })

  const tcp = useMemo(
    () => ({
      x: (182.4 + (joints[0].value - joints[0].home) * 0.18).toFixed(1),
      y: (-46.8 + (joints[1].value - joints[1].home) * 0.09).toFixed(1),
      z: (214.2 + (joints[2].value - joints[2].home) * 0.22).toFixed(1)
    }),
    [joints]
  )

  const updateJoint = useCallback(
    (index: number, value: number) => {
      if (!Number.isFinite(value)) return
      if (connected) {
        setNotice('Manual hardware commands are disabled until the ESP32 command protocol is implemented.')
        return
      }
      cancelProgram()
      setJoints((current) =>
        current.map((joint, jointIndex) => {
          if (jointIndex !== index) return joint
          const clampedValue = Math.min(joint.max, Math.max(joint.min, value))
          const steppedValue = Math.min(joint.max, Math.max(joint.min, quantizeJointValue(clampedValue, jointStep)))
          return Math.abs(steppedValue - joint.value) < 0.0001 ? joint : { ...joint, value: steppedValue }
        })
      )
      setActiveJoint(index)
    },
    [cancelProgram, connected, jointStep]
  )

  const resetPose = useCallback(() => {
    if (connected) {
      setNotice('Hardware reset motion is disabled until command acknowledgements are implemented.')
      return
    }
    cancelProgram(true)
    setJoints(initialJoints)
    if (waypoints[0]) setActiveWaypoint(waypoints[0].id)
    setNotice('Robot returned to the Home pose.')
  }, [cancelProgram, connected, waypoints])

  const toggleRun = useCallback(() => {
    if (connected) {
      setNotice('Program execution is telemetry-only until the ESP32 motion command path is implemented.')
      return
    }
    if (estopped) {
      setNotice('Release the emergency stop before running a program.')
      return
    }
    const action = toggleProgram()
    if (action === 'paused') setNotice('Motion paused at the current interpolated pose.')
    if (action === 'resumed') setNotice('Motion resumed toward the target pose.')
    if (action === 'started') setNotice('Running from the current pose through the remaining timeline.')
    if (action === 'at-end') setNotice('The final target is selected. Choose an earlier pose to run the timeline.')
  }, [connected, estopped, toggleProgram])

  const toggleEstop = useCallback(() => {
    if (connected) {
      setNotice('Use the physical emergency stop. Browser E-stop commands are not enabled yet.')
      return
    }
    if (!estopped) cancelProgram()
    setEstopped((value) => !value)
    setNotice(
      estopped ? 'Emergency stop released. Motion remains stopped.' : 'Emergency stop engaged. All motion inhibited.'
    )
  }, [cancelProgram, connected, estopped])

  const toggleSceneBackground = useCallback(() => {
    setSceneBackground((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const toggleLaser = useCallback(() => {
    setLaserEnabled((current) => !current)
  }, [])

  async function toggleHardwareConnection() {
    if (connecting) return
    if (connected) {
      await disconnect()
      setNotice('ESP32 disconnected. Returning to simulation-only mode.')
      return
    }

    const result = await connect()
    if (result.ok) {
      cancelProgram()
      setNotice(`${result.device.name} connected over USB serial · firmware ${result.device.firmware}.`)
    } else if (result.cancelled) {
      setNotice('ESP32 selection cancelled. Simulation remains active.')
    } else {
      setNotice(result.error)
    }
  }

  const addWaypoint = useCallback(() => {
    cancelProgram()
    const newPose = addTargetPose(jointsSnapshotRef.current.map((joint) => joint.value))
    setActiveWaypoint(newPose.id)
    setNotice(`${newPose.name} saved in this browser.`)
  }, [addTargetPose, cancelProgram])

  const createPoseSet = useCallback(() => {
    if (connected) {
      setNotice('Disconnect the ESP32 before replacing the simulated program.')
      return
    }

    const confirmed = window.confirm(
      `Create a new pose set from the robot's current pose? This replaces ${waypoints.length} locally saved ${waypoints.length === 1 ? 'pose' : 'poses'}.`
    )
    if (!confirmed) return

    cancelProgram(true)
    const firstPose = createTargetPoseSet(jointsSnapshotRef.current.map((joint) => joint.value))
    setActiveWaypoint(firstPose.id)
    setNotice('New pose set created from the current robot pose.')
  }, [cancelProgram, connected, createTargetPoseSet, waypoints.length])

  const deleteWaypoint = useCallback(() => {
    if (waypoints.length <= 1) return
    cancelProgram()
    const selectedIndex = waypoints.findIndex((point) => point.id === resolvedActiveWaypoint)
    const nextPose = waypoints[selectedIndex + 1] ?? waypoints[selectedIndex - 1]
    if (!deleteTargetPose(resolvedActiveWaypoint)) return
    if (nextPose) setActiveWaypoint(nextPose.id)
    setNotice('Target pose removed from local storage.')
  }, [cancelProgram, deleteTargetPose, resolvedActiveWaypoint, waypoints])

  const selectWaypoint = useCallback(
    (id: number) => {
      const target = waypoints.find((point) => point.id === id)
      if (!target) return
      if (connected) {
        setNotice('Target-pose commands are disabled until the ESP32 can validate and acknowledge them.')
        return
      }
      if (estopped) {
        setNotice('Release the emergency stop before moving to a target pose.')
        return
      }
      if (!moveToPose(id)) return
      setNotice(`Moving to ${target.name} with constrained motion.`)
    },
    [connected, estopped, moveToPose, waypoints]
  )

  const swapWaypoints = useCallback(
    (sourceId: number, targetId: number) => {
      if (sourceId === targetId) return
      cancelProgram()
      const reordered = swapTargetPoses(sourceId, targetId)
      if (!reordered) return

      const activeIndex = reordered.findIndex((point) => point.id === resolvedActiveWaypoint)
      if (activeIndex >= 0) setTimelineIndex(activeIndex, reordered.length)
      setNotice('Timeline order updated and saved in this browser.')
    },
    [cancelProgram, resolvedActiveWaypoint, setTimelineIndex, swapTargetPoses]
  )

  const loadPreset = useCallback(
    (presetId: string) => {
      if (connected) {
        setNotice('Disconnect the ESP32 before replacing the simulated program.')
        return
      }

      const preset = getRobotProgramPreset(presetId)
      if (!preset) {
        setNotice('The selected program preset is unavailable.')
        return
      }

      const nextPoses = materializeRobotProgramPreset(preset)
      const firstPose = nextPoses[0]
      if (!firstPose) return

      cancelProgram(true)
      if (!replaceTargetPoses(nextPoses)) return
      setJoints((current) =>
        current.map((joint, index) => ({
          ...joint,
          value: Math.min(joint.max, Math.max(joint.min, firstPose.joints[index] ?? joint.home))
        }))
      )
      setActiveWaypoint(firstPose.id)
      setSpeed(preset.recommendedSpeed)
      setNotice(
        preset.category === 'welding'
          ? `${preset.name} loaded in simulation. Arc output remains disabled.`
          : `${preset.name} loaded. Verify the tool center point and clearance before use.`
      )
    },
    [cancelProgram, connected, replaceTargetPoses]
  )

  const connectionLabel = connected
    ? 'ESP32 ONLINE'
    : connectionStatus === 'requesting'
      ? 'SELECT DEVICE…'
      : connectionStatus === 'handshaking'
        ? 'HANDSHAKING…'
        : connectionStatus === 'unsupported'
          ? 'SERIAL UNSUPPORTED'
          : connectionStatus === 'error'
            ? 'RETRY ESP32'
            : 'CONNECT ESP32'

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
            className={`connection ${connected ? 'connected' : connecting ? 'connecting' : connectionStatus === 'error' ? 'error' : ''}`}
            title={
              connectionError ??
              (device ? `${device.name} · firmware ${device.firmware}` : 'Connect a classic ESP32 over USB')
            }
            disabled={connecting}
            aria-busy={connecting}
            onClick={() => void toggleHardwareConnection()}>
            <Icon name='chip' size={16} />
            <span>{connectionLabel}</span>
          </button>

          <Link href='https://github.com/phtn/voltron' className='' aria-label='repo'>
            <Icon name='github' size={16} />
          </Link>
        </div>
      </header>

      <aside className='sidebar'>
        <SidebarNav />
        <SidebarSubNav
          connected={connected}
          telemetry={telemetry}
          connectionFault={connectionFault}
          estopped={estopped}
          toggleEstop={toggleEstop}
        />
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
        <div className={`stage-panel scene-${sceneBackground}`}>
          <StageToolbar
            background={sceneBackground}
            laserEnabled={laserEnabled}
            view={view}
            setView={setView}
            toggleBackground={toggleSceneBackground}
            toggleLaser={toggleLaser}
          />
          {sceneEnabled ? (
            <RobotScene
              background={sceneBackground}
              laserEnabled={laserEnabled}
              joints={joints}
              view={view}
              activeJoint={activeJoint}
            />
          ) : (
            <LoadScene />
          )}

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
                      : 'Ready'}
              </b>
              {connectionError ?? notice}
            </span>
          </div>
        </div>

        <ProgramPanel
          activeWaypoint={resolvedActiveWaypoint}
          selectWaypoint={selectWaypoint}
          swapWaypoints={swapWaypoints}
          waypoints={waypoints}
          addWaypoint={addWaypoint}
          createPoseSet={createPoseSet}
          newSetDisabled={connected}
          loadPreset={loadPreset}
          presetLoadDisabled={connected}
          deleteWaypoint={deleteWaypoint}
          progress={progress}
        />
      </section>

      <ControlPanel
        controlMode={controlMode}
        tcp={tcp}
        joints={joints}
        jointStep={jointStep}
        updateJoint={updateJoint}
        activeJoint={activeJoint}
        speed={speed}
        setSpeed={setSpeed}
        setJointStep={setJointStep}
        setActiveJoint={setActiveJoint}
        setControlMode={setControlMode}
        saveTargetPose={addWaypoint}
      />
    </main>
  )
}
