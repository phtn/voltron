import { describe, expect, test } from 'bun:test'
import { JOINT_STEPS, quantizeJointValue, roundPoseJointValue } from './joint-step'

describe('joint stepping', () => {
  test('offers the supported degree increments', () => {
    expect(JOINT_STEPS).toEqual([0.1, 0.25, 0.5, 1])
  })

  test('quantizes positive and negative angles without floating-point drift', () => {
    expect(quantizeJointValue(12.37, 0.1)).toBe(12.4)
    expect(quantizeJointValue(12.37, 0.25)).toBe(12.25)
    expect(quantizeJointValue(-12.26, 0.5)).toBe(-12.5)
    expect(quantizeJointValue(12.6, 1)).toBe(13)
  })

  test('keeps quarter-degree values when saving poses', () => {
    expect(roundPoseJointValue(4.25)).toBe(4.25)
    expect(roundPoseJointValue(4.249)).toBe(4.25)
  })
})
