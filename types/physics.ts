export type JointMotionLimits = {
  maxVelocity: number
  maxAcceleration: number
  maxJerk: number
}

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

export type TargetPose = {
  id: number
  name: string
  joints: number[]
  time: string
}
