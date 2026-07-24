'use client'

import {
  getTargetPosesServerSnapshot,
  getTargetPosesSnapshot,
  saveTargetPoses,
  subscribeToTargetPoses
} from '@/lib/target-pose-storage'
import { roundPoseJointValue } from '@/lib/joint-step'
import { swapTargetPoseOrder } from '@/lib/target-pose-order'
import type { TargetPose } from '@/types'
import { useCallback, useSyncExternalStore } from 'react'

function timelineTime(index: number) {
  const seconds = index * 1.2
  const wholeSeconds = Math.floor(seconds)
  const tenths = Math.round((seconds - wholeSeconds) * 10)
  return `00:${String(wholeSeconds).padStart(2, '0')}.${tenths}`
}

function createTargetPose(id: number, index: number, jointValues: readonly number[]): TargetPose {
  return {
    id,
    name: `Target ${String(id).padStart(2, '0')}`,
    joints: jointValues.map(roundPoseJointValue),
    time: timelineTime(index)
  }
}

export function useTargetPoses() {
  const poses = useSyncExternalStore(subscribeToTargetPoses, getTargetPosesSnapshot, getTargetPosesServerSnapshot)

  const addTargetPose = useCallback(
    (jointValues: number[]) => {
      const id = poses.reduce((highestId, pose) => Math.max(highestId, pose.id), 0) + 1
      const pose = createTargetPose(id, poses.length, jointValues)
      saveTargetPoses([...poses, pose])
      return pose
    },
    [poses]
  )

  const createTargetPoseSet = useCallback((jointValues: readonly number[]) => {
    const firstPose = createTargetPose(1, 0, jointValues)
    saveTargetPoses([firstPose])
    return firstPose
  }, [])

  const deleteTargetPose = useCallback(
    (id: number) => {
      if (poses.length <= 1 || !poses.some((pose) => pose.id === id)) return false
      saveTargetPoses(poses.filter((pose) => pose.id !== id))
      return true
    },
    [poses]
  )

  const swapTargetPoses = useCallback(
    (sourceId: number, targetId: number) => {
      const reordered = swapTargetPoseOrder(poses, sourceId, targetId)
      if (!reordered) return null
      saveTargetPoses(reordered)
      return reordered
    },
    [poses]
  )

  const replaceTargetPoses = useCallback((nextPoses: readonly TargetPose[]) => {
    if (nextPoses.length === 0) return false
    saveTargetPoses(nextPoses)
    return true
  }, [])

  return {
    poses,
    addTargetPose,
    createTargetPoseSet,
    deleteTargetPose,
    swapTargetPoses,
    replaceTargetPoses
  }
}
