export type JointMotionLimits = {
  maxVelocity: number
  maxAcceleration: number
  maxJerk: number
}

export type JointStep = 0.1 | 0.25 | 0.5 | 1

export type Joint = {
  id: string
  name: string
  type: string
  value: number
  home: number
  min: number
  max: number
  motion: JointMotionLimits
}

export type TargetPoseProcess = 'travel' | 'plot' | 'weld'

export type TargetPose = {
  id: number
  name: string
  joints: number[]
  time: string
  process?: TargetPoseProcess
}
