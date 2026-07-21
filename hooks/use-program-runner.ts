'use client'

import type { Joint, TargetPose } from '@/types'
import {
  createSynchronizedTrajectory,
  sampleSynchronizedTrajectory,
  type SynchronizedTrajectory
} from '@/lib/trajectory'
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

type MotionKind = 'program' | 'pose'

type ProgramSegment = {
  trajectory: SynchronizedTrajectory
  targetIndex: number
  timelineStartPosition: number
  elapsedSeconds: number
  kind: MotionKind
}

const MAX_FRAME_DELTA_SECONDS = 0.05

export type ProgramToggleResult = 'started' | 'paused' | 'resumed' | 'at-end'

type ProgramRunnerOptions = {
  joints: Joint[]
  setJoints: Dispatch<SetStateAction<Joint[]>>
  poses: readonly TargetPose[]
  activePoseId: number
  setActivePoseId: (id: number) => void
  speed: number
  onComplete: () => void
  onPoseReached: (pose: TargetPose) => void
}

function targetValues(pose: TargetPose, joints: Joint[]) {
  return joints.map((joint, index) => Math.min(joint.max, Math.max(joint.min, pose.joints[index] ?? joint.value)))
}

function createProgramSegment(
  from: readonly number[],
  pose: TargetPose,
  targetIndex: number,
  timelineStartPosition: number,
  kind: MotionKind,
  joints: Joint[],
  speed: number
): ProgramSegment {
  const to = targetValues(pose, joints)
  return {
    trajectory: createSynchronizedTrajectory(
      from,
      to,
      joints.map((joint) => joint.motion),
      speed
    ),
    targetIndex,
    timelineStartPosition,
    elapsedSeconds: 0,
    kind
  }
}

export function useProgramRunner({
  joints,
  setJoints,
  poses,
  activePoseId,
  setActivePoseId,
  speed,
  onComplete,
  onPoseReached
}: ProgramRunnerOptions) {
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [motionKind, setMotionKind] = useState<MotionKind | null>(null)
  const segmentRef = useRef<ProgramSegment | null>(null)
  const jointsRef = useRef(joints)
  const speedRef = useRef(speed)
  const progressRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const onPoseReachedRef = useRef(onPoseReached)

  const updateProgress = useCallback((value: number) => {
    const nextProgress = Math.min(100, Math.max(0, value))
    progressRef.current = nextProgress
    setProgress(nextProgress)
  }, [])

  useEffect(() => {
    jointsRef.current = joints
  }, [joints])

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    onPoseReachedRef.current = onPoseReached
  }, [onPoseReached])

  useEffect(() => {
    if (!running) return

    let frameId = 0
    let previousTime: number | null = null

    const tick = (time: number) => {
      const segment = segmentRef.current
      if (!segment) {
        setRunning(false)
        setPaused(false)
        setMotionKind(null)
        return
      }

      if (previousTime === null) previousTime = time
      const elapsedSeconds = Math.min((time - previousTime) / 1000, MAX_FRAME_DELTA_SECONDS)
      previousTime = time

      segment.elapsedSeconds = Math.min(
        segment.trajectory.durationSeconds,
        segment.elapsedSeconds + elapsedSeconds
      )
      const sample = sampleSynchronizedTrajectory(segment.trajectory, segment.elapsedSeconds)

      setJoints((current) =>
        current.map((joint, index) => ({
          ...joint,
          value: sample.positions[index] ?? joint.value
        }))
      )

      const timelineSegments = poses.length - 1
      const timelinePosition =
        segment.timelineStartPosition +
        (segment.targetIndex - segment.timelineStartPosition) * sample.motionProgress
      updateProgress(timelineSegments > 0 ? (timelinePosition / timelineSegments) * 100 : 0)

      if (sample.complete) {
        const reachedPose = poses[segment.targetIndex]
        if (!reachedPose) {
          segmentRef.current = null
          setRunning(false)
          setPaused(false)
          setMotionKind(null)
          return
        }

        setActivePoseId(reachedPose.id)

        if (segment.kind === 'pose') {
          segmentRef.current = null
          updateProgress(timelineSegments > 0 ? (segment.targetIndex / timelineSegments) * 100 : 0)
          setRunning(false)
          setPaused(false)
          setMotionKind(null)
          onPoseReachedRef.current(reachedPose)
          return
        }

        const nextTargetIndex = segment.targetIndex + 1
        const nextPose = poses[nextTargetIndex]

        if (!nextPose) {
          segmentRef.current = null
          updateProgress(100)
          setRunning(false)
          setPaused(false)
          setMotionKind(null)
          onCompleteRef.current()
          return
        }

        segmentRef.current = createProgramSegment(
          segment.trajectory.to,
          nextPose,
          nextTargetIndex,
          segment.targetIndex,
          'program',
          jointsRef.current,
          speedRef.current
        )
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [poses, running, setActivePoseId, setJoints, updateProgress])

  const toggleProgram = useCallback((): ProgramToggleResult => {
    if (running) {
      setRunning(false)
      setPaused(true)
      return 'paused'
    }

    if (segmentRef.current) {
      setRunning(true)
      setPaused(false)
      return 'resumed'
    }

    const activeIndex = poses.findIndex((pose) => pose.id === activePoseId)
    const targetIndex = activeIndex + 1
    const nextPose = poses[targetIndex]
    if (activeIndex < 0 || !nextPose) return 'at-end'

    segmentRef.current = createProgramSegment(
      joints.map((joint) => joint.value),
      nextPose,
      targetIndex,
      activeIndex,
      'program',
      joints,
      speed
    )
    setRunning(true)
    setPaused(false)
    setMotionKind('program')
    return 'started'
  }, [activePoseId, joints, poses, running, speed])

  const moveToPose = useCallback(
    (poseId: number) => {
      const targetIndex = poses.findIndex((pose) => pose.id === poseId)
      const targetPose = poses[targetIndex]
      if (targetIndex < 0 || !targetPose) return false

      const timelineSegments = poses.length - 1
      const timelineStartPosition =
        timelineSegments > 0 ? (progressRef.current / 100) * timelineSegments : targetIndex

      segmentRef.current = createProgramSegment(
        joints.map((joint) => joint.value),
        targetPose,
        targetIndex,
        timelineStartPosition,
        'pose',
        joints,
        speed
      )
      setActivePoseId(targetPose.id)
      setRunning(true)
      setPaused(false)
      setMotionKind('pose')
      return true
    },
    [joints, poses, setActivePoseId, speed]
  )

  const cancelProgram = useCallback((resetProgress = false) => {
    segmentRef.current = null
    setRunning(false)
    setPaused(false)
    setMotionKind(null)
    if (resetProgress) updateProgress(0)
  }, [updateProgress])

  const setTimelineIndex = useCallback(
    (index: number, poseCount: number) => {
      updateProgress(poseCount > 1 ? (index / (poseCount - 1)) * 100 : 0)
    },
    [updateProgress]
  )

  return {
    running,
    paused,
    progress,
    motionKind,
    toggleProgram,
    moveToPose,
    cancelProgram,
    setTimelineIndex
  }
}
