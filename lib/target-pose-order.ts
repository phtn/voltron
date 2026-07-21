import type { TargetPose } from '@/types'

export function swapTargetPoseOrder(
  poses: readonly TargetPose[],
  sourceId: number,
  targetId: number
): TargetPose[] | null {
  const sourceIndex = poses.findIndex((pose) => pose.id === sourceId)
  const targetIndex = poses.findIndex((pose) => pose.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return null

  const slotTimes = poses.map((pose) => pose.time)
  const reordered = [...poses]
  const sourcePose = reordered[sourceIndex]
  reordered[sourceIndex] = reordered[targetIndex]
  reordered[targetIndex] = sourcePose

  return reordered.map((pose, index) => ({
    ...pose,
    time: slotTimes[index]
  }))
}
