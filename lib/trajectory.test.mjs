import { describe, expect, test } from 'bun:test'
import { createSynchronizedTrajectory, sampleSynchronizedTrajectory } from './trajectory'

const effectivelyUnlimited = {
  maxVelocity: 1_000_000,
  maxAcceleration: 1_000_000,
  maxJerk: 1_000_000
}

describe('createSynchronizedTrajectory', () => {
  test('selects the duration required by the limiting joint', () => {
    const trajectory = createSynchronizedTrajectory(
      [0, 0],
      [120, 20],
      [
        { maxVelocity: 80, maxAcceleration: 160, maxJerk: 1200 },
        effectivelyUnlimited
      ],
      100
    )

    expect(trajectory.durationSeconds).toBeCloseTo((15 / 8) * (120 / 80), 10)
  })

  test('accounts for acceleration and jerk limits', () => {
    const accelerationLimited = createSynchronizedTrajectory(
      [0],
      [100],
      [{ maxVelocity: 1_000_000, maxAcceleration: 100, maxJerk: 1_000_000 }],
      100
    )
    const jerkLimited = createSynchronizedTrajectory(
      [0],
      [1],
      [{ maxVelocity: 1_000_000, maxAcceleration: 1_000_000, maxJerk: 60 }],
      100
    )

    expect(accelerationLimited.durationSeconds).toBeCloseTo(Math.sqrt(10 / Math.sqrt(3)), 10)
    expect(jerkLimited.durationSeconds).toBeCloseTo(1, 10)
  })

  test('applies the speed override as time scaling', () => {
    const fullSpeed = createSynchronizedTrajectory([0], [90], [effectivelyUnlimited], 100)
    const halfSpeed = createSynchronizedTrajectory([0], [90], [effectivelyUnlimited], 50)

    expect(halfSpeed.durationSeconds).toBeCloseTo(fullSpeed.durationSeconds * 2, 10)
  })

  test('rejects malformed joint data', () => {
    expect(() => createSynchronizedTrajectory([0], [10, 20], [effectivelyUnlimited], 100)).toThrow(RangeError)
    expect(() =>
      createSynchronizedTrajectory(
        [0],
        [10],
        [{ maxVelocity: 0, maxAcceleration: 100, maxJerk: 100 }],
        100
      )
    ).toThrow(RangeError)
  })
})

describe('sampleSynchronizedTrajectory', () => {
  test('starts and ends at rest while all joints arrive together', () => {
    const trajectory = createSynchronizedTrajectory(
      [0, -10],
      [90, 30],
      [effectivelyUnlimited, effectivelyUnlimited],
      100
    )
    const start = sampleSynchronizedTrajectory(trajectory, 0)
    const midpoint = sampleSynchronizedTrajectory(trajectory, trajectory.durationSeconds / 2)
    const end = sampleSynchronizedTrajectory(trajectory, trajectory.durationSeconds)

    expect(start.positions).toEqual([0, -10])
    expect(start.velocities).toEqual([0, 0])
    expect(midpoint.positions[0]).toBeCloseTo(45, 10)
    expect(midpoint.positions[1]).toBeCloseTo(10, 10)
    expect(end.positions).toEqual([90, 30])
    expect(end.velocities[0]).toBeCloseTo(0, 10)
    expect(end.velocities[1]).toBeCloseTo(0, 10)
    expect(end.accelerations[0]).toBeCloseTo(0, 10)
    expect(end.accelerations[1]).toBeCloseTo(0, 10)
    expect(end.complete).toBe(true)
  })

  test('never exceeds the configured velocity or acceleration limits', () => {
    const limits = [
      { maxVelocity: 80, maxAcceleration: 160, maxJerk: 1200 },
      { maxVelocity: 50, maxAcceleration: 100, maxJerk: 800 }
    ]
    const trajectory = createSynchronizedTrajectory([0, 0], [120, -60], limits, 100)
    let peakVelocity = [0, 0]
    let peakAcceleration = [0, 0]

    for (let step = 0; step <= 1000; step += 1) {
      const sample = sampleSynchronizedTrajectory(trajectory, (trajectory.durationSeconds * step) / 1000)
      peakVelocity = peakVelocity.map((peak, index) => Math.max(peak, Math.abs(sample.velocities[index])))
      peakAcceleration = peakAcceleration.map((peak, index) =>
        Math.max(peak, Math.abs(sample.accelerations[index]))
      )
    }

    expect(peakVelocity[0]).toBeLessThanOrEqual(limits[0].maxVelocity + 1e-9)
    expect(peakVelocity[1]).toBeLessThanOrEqual(limits[1].maxVelocity + 1e-9)
    expect(peakAcceleration[0]).toBeLessThanOrEqual(limits[0].maxAcceleration + 1e-9)
    expect(peakAcceleration[1]).toBeLessThanOrEqual(limits[1].maxAcceleration + 1e-9)
  })

  test('completes a zero-distance segment immediately', () => {
    const trajectory = createSynchronizedTrajectory([12], [12], [effectivelyUnlimited], 42)
    const sample = sampleSynchronizedTrajectory(trajectory, 0)

    expect(trajectory.durationSeconds).toBe(0)
    expect(sample.positions).toEqual([12])
    expect(sample.complete).toBe(true)
  })
})
