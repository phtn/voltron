import type { JointMotionLimits } from '@/types'

const MIN_SPEED_SCALE = 0.01
const POSITION_EPSILON = 1e-9

// Peak derivatives of 10t^3 - 15t^4 + 6t^5 over the normalized [0, 1] interval.
const PEAK_NORMALIZED_VELOCITY = 15 / 8
const PEAK_NORMALIZED_ACCELERATION = 10 / Math.sqrt(3)
const PEAK_NORMALIZED_JERK = 60

export type SynchronizedTrajectory = {
  from: readonly number[]
  to: readonly number[]
  durationSeconds: number
}

export type TrajectorySample = {
  positions: number[]
  velocities: number[]
  accelerations: number[]
  progress: number
  motionProgress: number
  complete: boolean
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function assertMotionLimits(limits: JointMotionLimits, index: number) {
  const values = [limits.maxVelocity, limits.maxAcceleration, limits.maxJerk]
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError(`Joint ${index + 1} motion limits must be finite positive values.`)
  }
}

function minimumDuration(distance: number, limits: JointMotionLimits) {
  if (distance <= POSITION_EPSILON) return 0

  const velocityDuration = (PEAK_NORMALIZED_VELOCITY * distance) / limits.maxVelocity
  const accelerationDuration = Math.sqrt((PEAK_NORMALIZED_ACCELERATION * distance) / limits.maxAcceleration)
  const jerkDuration = Math.cbrt((PEAK_NORMALIZED_JERK * distance) / limits.maxJerk)

  return Math.max(velocityDuration, accelerationDuration, jerkDuration)
}

export function createSynchronizedTrajectory(
  from: readonly number[],
  to: readonly number[],
  limits: readonly JointMotionLimits[],
  speedPercent: number
): SynchronizedTrajectory {
  if (from.length !== to.length || from.length !== limits.length) {
    throw new RangeError('Trajectory positions and motion limits must have matching joint counts.')
  }

  let fullSpeedDuration = 0
  for (let index = 0; index < from.length; index += 1) {
    if (!Number.isFinite(from[index]) || !Number.isFinite(to[index])) {
      throw new RangeError(`Joint ${index + 1} trajectory positions must be finite values.`)
    }

    assertMotionLimits(limits[index], index)
    const distance = Math.abs(to[index] - from[index])
    fullSpeedDuration = Math.max(fullSpeedDuration, minimumDuration(distance, limits[index]))
  }

  const requestedScale = Number.isFinite(speedPercent) ? speedPercent / 100 : 1
  const speedScale = Math.min(1, Math.max(MIN_SPEED_SCALE, requestedScale))

  return {
    from: [...from],
    to: [...to],
    durationSeconds: fullSpeedDuration / speedScale
  }
}

export function sampleSynchronizedTrajectory(
  trajectory: SynchronizedTrajectory,
  elapsedSeconds: number
): TrajectorySample {
  const complete = trajectory.durationSeconds <= POSITION_EPSILON || elapsedSeconds >= trajectory.durationSeconds
  const progress = complete ? 1 : clamp01(elapsedSeconds / trajectory.durationSeconds)
  const progress2 = progress * progress
  const progress3 = progress2 * progress
  const progress4 = progress3 * progress
  const progress5 = progress4 * progress

  const motionProgress = 10 * progress3 - 15 * progress4 + 6 * progress5
  const normalizedVelocity = 30 * progress2 - 60 * progress3 + 30 * progress4
  const normalizedAcceleration = 60 * progress - 180 * progress2 + 120 * progress3
  const duration = trajectory.durationSeconds

  const positions = trajectory.from.map((start, index) => {
    const distance = trajectory.to[index] - start
    return complete ? trajectory.to[index] : start + distance * motionProgress
  })
  const velocities = trajectory.from.map((start, index) => {
    if (duration <= POSITION_EPSILON) return 0
    return ((trajectory.to[index] - start) * normalizedVelocity) / duration
  })
  const accelerations = trajectory.from.map((start, index) => {
    if (duration <= POSITION_EPSILON) return 0
    return ((trajectory.to[index] - start) * normalizedAcceleration) / (duration * duration)
  })

  return { positions, velocities, accelerations, progress, motionProgress, complete }
}
