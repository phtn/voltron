import { describe, expect, test } from 'bun:test'
import { swapTargetPoseOrder } from './target-pose-order'

const poses = [
  { id: 1, name: 'Home', joints: [0], time: '00:00.0' },
  { id: 2, name: 'Pick', joints: [20], time: '00:01.2' },
  { id: 3, name: 'Place', joints: [40], time: '00:02.5' }
]

describe('swapTargetPoseOrder', () => {
  test('swaps the requested poses without mutating the source', () => {
    const reordered = swapTargetPoseOrder(poses, 1, 3)

    expect(reordered?.map((pose) => pose.id)).toEqual([3, 2, 1])
    expect(poses.map((pose) => pose.id)).toEqual([1, 2, 3])
  })

  test('keeps chronological time slots attached to timeline positions', () => {
    const reordered = swapTargetPoseOrder(poses, 1, 3)

    expect(reordered?.map((pose) => pose.time)).toEqual(['00:00.0', '00:01.2', '00:02.5'])
  })

  test('rejects missing or identical swap targets', () => {
    expect(swapTargetPoseOrder(poses, 1, 1)).toBeNull()
    expect(swapTargetPoseOrder(poses, 1, 99)).toBeNull()
  })
})
