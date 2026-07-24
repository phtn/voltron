import type { JointStep } from '@/types/physics'

export const JOINT_STEPS = [0.1, 0.25, 0.5, 1] as const satisfies readonly JointStep[]

export function quantizeJointValue(value: number, step: JointStep) {
  return Number((Math.round(value / step) * step).toFixed(2))
}

export function roundPoseJointValue(value: number) {
  return Number(value.toFixed(2))
}
