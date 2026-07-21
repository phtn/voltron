'use client'

import {
  getTargetPosesServerSnapshot,
  getTargetPosesSnapshot,
  saveTargetPoses,
  subscribeToTargetPoses
} from '@/lib/target-pose-storage'
import { useCallback, useSyncExternalStore } from 'react'

function timelineTime(index: number) {
  const seconds = index * 1.2
  const wholeSeconds = Math.floor(seconds)
  const tenths = Math.round((seconds - wholeSeconds) * 10)
  return `00:${String(wholeSeconds).padStart(2, '0')}.${tenths}`
}

export function useTargetPoses() {
  const poses = useSyncExternalStore(subscribeToTargetPoses, getTargetPosesSnapshot, getTargetPosesServerSnapshot)

  const addTargetPose = useCallback(
    (jointValues: number[]) => {
      const id = poses.reduce((highestId, pose) => Math.max(highestId, pose.id), 0) + 1
      const pose = {
        id,
        name: `Target ${String(id).padStart(2, '0')}`,
        joints: jointValues.map((value) => Math.round(value * 10) / 10),
        time: timelineTime(poses.length)
      }
      saveTargetPoses([...poses, pose])
      return pose
    },
    [poses]
  )

  const deleteTargetPose = useCallback(
    (id: number) => {
      if (poses.length <= 1 || !poses.some((pose) => pose.id === id)) return false
      saveTargetPoses(poses.filter((pose) => pose.id !== id))
      return true
    },
    [poses]
  )

  return { poses, addTargetPose, deleteTargetPose }
}
