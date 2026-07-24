import type { HTMLProps } from 'react'
export type ClassName = HTMLProps<HTMLElement>['className']
export type SceneBackground = 'dark' | 'light'
// export type { LinkItem } from './profile'
export type VoidPromise = () => Promise<void>
export type { Joint, JointMotionLimits, JointStep, TargetPose, TargetPoseProcess } from './physics'
