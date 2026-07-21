'use client'

import type { Joint, TargetPose } from '@/types'
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

type ProgramSegment = {
  from: number[]
  to: number[]
  targetIndex: number
  progress: number
}

export type ProgramToggleResult = 'started' | 'paused' | 'resumed' | 'at-end'

type ProgramRunnerOptions = {
  joints: Joint[]
  setJoints: Dispatch<SetStateAction<Joint[]>>
  poses: readonly TargetPose[]
  activePoseId: number
  setActivePoseId: (id: number) => void
  speed: number
  onComplete: () => void
}

function targetValues(pose: TargetPose, joints: Joint[]) {
  return joints.map((joint, index) => Math.min(joint.max, Math.max(joint.min, pose.joints[index] ?? joint.value)))
}

function smootherStep(value: number) {
  return value * value * value * (value * (value * 6 - 15) + 10)
}

export function useProgramRunner({
  joints,
  setJoints,
  poses,
  activePoseId,
  setActivePoseId,
  speed,
  onComplete
}: ProgramRunnerOptions) {
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const segmentRef = useRef<ProgramSegment | null>(null)
  const jointsRef = useRef(joints)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    jointsRef.current = joints
  }, [joints])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!running) return

    let frameId = 0
    let previousTime: number | null = null

    const tick = (time: number) => {
      const segment = segmentRef.current
      if (!segment) {
        setRunning(false)
        setPaused(false)
        return
      }

      if (previousTime === null) previousTime = time
      const elapsedMs = Math.min(time - previousTime, 50)
      previousTime = time

      const travel = segment.to.reduce(
        (largest, value, index) => Math.max(largest, Math.abs(value - segment.from[index])),
        0
      )
      const degreesPerSecond = 5 + speed * 0.75
      segment.progress = Math.min(1, segment.progress + (elapsedMs * degreesPerSecond) / (Math.max(travel, 30) * 1000))

      const easedProgress = smootherStep(segment.progress)
      setJoints((current) =>
        current.map((joint, index) => ({
          ...joint,
          value: segment.from[index] + (segment.to[index] - segment.from[index]) * easedProgress
        }))
      )

      const timelineSegments = Math.max(poses.length - 1, 1)
      setProgress(Math.min(100, ((segment.targetIndex - 1 + easedProgress) / timelineSegments) * 100))

      if (segment.progress >= 1) {
        const reachedPose = poses[segment.targetIndex]
        if (!reachedPose) {
          segmentRef.current = null
          setRunning(false)
          setPaused(false)
          return
        }

        setActivePoseId(reachedPose.id)
        const nextTargetIndex = segment.targetIndex + 1
        const nextPose = poses[nextTargetIndex]

        if (!nextPose) {
          segmentRef.current = null
          setProgress(100)
          setRunning(false)
          setPaused(false)
          onCompleteRef.current()
          return
        }

        segmentRef.current = {
          from: segment.to,
          to: targetValues(nextPose, jointsRef.current),
          targetIndex: nextTargetIndex,
          progress: 0
        }
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [poses, running, setActivePoseId, setJoints, speed])

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

    segmentRef.current = {
      from: joints.map((joint) => joint.value),
      to: targetValues(nextPose, joints),
      targetIndex,
      progress: 0
    }
    setRunning(true)
    setPaused(false)
    return 'started'
  }, [activePoseId, joints, poses, running])

  const cancelProgram = useCallback((resetProgress = false) => {
    segmentRef.current = null
    setRunning(false)
    setPaused(false)
    if (resetProgress) setProgress(0)
  }, [])

  const setTimelinePosition = useCallback(
    (poseId: number) => {
      const index = poses.findIndex((pose) => pose.id === poseId)
      if (index < 0) return
      setProgress(poses.length > 1 ? (index / (poses.length - 1)) * 100 : 0)
    },
    [poses]
  )

  return {
    running,
    paused,
    progress,
    toggleProgram,
    cancelProgram,
    setTimelinePosition
  }
}
