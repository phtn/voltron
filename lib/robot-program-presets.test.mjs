import { describe, expect, test } from 'bun:test'
import {
  ROBOT_PROGRAM_PRESETS,
  getRobotProgramPreset,
  materializeRobotProgramPreset
} from './robot-program-presets'

const jointLimits = [
  [-170, 170],
  [-90, 90],
  [-45, 45],
  [-90, 90],
  [-90, 90],
  [-120, 120],
  [-180, 180]
]

describe('robot program presets', () => {
  test('ships complete plotting and welding libraries', () => {
    expect(ROBOT_PROGRAM_PRESETS.filter((preset) => preset.category === 'plotting')).toHaveLength(8)
    expect(ROBOT_PROGRAM_PRESETS.filter((preset) => preset.category === 'welding')).toHaveLength(8)
    expect(new Set(ROBOT_PROGRAM_PRESETS.map((preset) => preset.id)).size).toBe(ROBOT_PROGRAM_PRESETS.length)
  })

  test('keeps every generated pose valid for the seven-axis rig', () => {
    for (const preset of ROBOT_PROGRAM_PRESETS) {
      expect(preset.poses.length).toBeGreaterThanOrEqual(6)
      expect(preset.recommendedSpeed).toBeGreaterThanOrEqual(1)
      expect(preset.recommendedSpeed).toBeLessThanOrEqual(100)
      expect(preset.poses.map((pose) => pose.id)).toEqual(
        Array.from({ length: preset.poses.length }, (_, index) => index + 1)
      )

      for (const pose of preset.poses) {
        expect(pose.joints).toHaveLength(7)
        pose.joints.forEach((value, jointIndex) => {
          const [min, max] = jointLimits[jointIndex]
          expect(Number.isFinite(value)).toBe(true)
          expect(value).toBeGreaterThanOrEqual(min)
          expect(value).toBeLessThanOrEqual(max)
        })
      }
    }
  })

  test('wraps process paths in travel-safe home, approach, and retract poses', () => {
    for (const preset of ROBOT_PROGRAM_PRESETS) {
      expect(preset.poses[0].name).toBe('Home')
      expect(preset.poses[0].process).toBe('travel')
      expect(preset.poses.at(-1)?.name).toBe('Home')
      expect(preset.poses.at(-1)?.process).toBe('travel')

      const expectedProcess = preset.category === 'plotting' ? 'plot' : 'weld'
      expect(preset.poses.some((pose) => pose.process === expectedProcess)).toBe(true)
    }
  })

  test('looks up presets in constant time and materializes editable copies', () => {
    const preset = getRobotProgramPreset('plot-circle')
    expect(preset?.name).toBe('Circle')
    expect(getRobotProgramPreset('missing')).toBeNull()

    if (!preset) throw new Error('Circle preset is required by this test.')
    const materialized = materializeRobotProgramPreset(preset)
    expect(materialized).toEqual(preset.poses)
    expect(materialized).not.toBe(preset.poses)
    expect(materialized[0].joints).not.toBe(preset.poses[0].joints)
  })
})
