import type { TargetPose } from '@/types'

const STORAGE_KEY = 'voltron:target-poses:v1'
const STORAGE_EVENT = 'voltron:target-poses-changed'
const SCHEMA_VERSION = 1
const JOINT_COUNT = 7

type TargetPosePayload = {
  schemaVersion: typeof SCHEMA_VERSION
  poses: TargetPose[]
}

export const DEFAULT_TARGET_POSES: readonly TargetPose[] = [
  { id: 1, name: 'Home', joints: [0, 0, 0, 0, 0, 0, 0], time: '00:00.0' },
  { id: 2, name: 'Approach', joints: [18, -18, 20, 12, 36, 0, 0], time: '00:01.2' },
  { id: 3, name: 'Pick', joints: [22, -8, 32, 12, 42, 8, 0], time: '00:02.5' },
  { id: 4, name: 'Inspect', joints: [-28, 12, 20, -22, 15, 0, 12], time: '00:04.1' }
]

let cachedRaw: string | null | undefined
let cachedSnapshot: readonly TargetPose[] = DEFAULT_TARGET_POSES
let memorySnapshot: readonly TargetPose[] | null = null

function isTargetPose(value: unknown): value is TargetPose {
  if (!value || typeof value !== 'object') return false
  const pose = value as Partial<TargetPose>
  return (
    Number.isSafeInteger(pose.id) &&
    typeof pose.name === 'string' &&
    pose.name.trim().length > 0 &&
    pose.name.length <= 80 &&
    Array.isArray(pose.joints) &&
    pose.joints.length === JOINT_COUNT &&
    pose.joints.every((joint) => typeof joint === 'number' && Number.isFinite(joint)) &&
    typeof pose.time === 'string'
  )
}

function parseTargetPoses(raw: string | null): readonly TargetPose[] {
  if (!raw) return DEFAULT_TARGET_POSES

  try {
    const payload = JSON.parse(raw) as Partial<TargetPosePayload>
    if (payload.schemaVersion !== SCHEMA_VERSION || !Array.isArray(payload.poses)) return DEFAULT_TARGET_POSES
    const poses = payload.poses.filter(isTargetPose)
    const uniqueIds = new Set(poses.map((pose) => pose.id))
    return poses.length > 0 && uniqueIds.size === poses.length ? poses : DEFAULT_TARGET_POSES
  } catch {
    return DEFAULT_TARGET_POSES
  }
}

export function getTargetPosesSnapshot(): readonly TargetPose[] {
  if (typeof window === 'undefined') return DEFAULT_TARGET_POSES
  if (memorySnapshot) return memorySnapshot

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === cachedRaw) return cachedSnapshot
    cachedRaw = raw
    cachedSnapshot = parseTargetPoses(raw)
    return cachedSnapshot
  } catch {
    return cachedSnapshot
  }
}

export function getTargetPosesServerSnapshot(): readonly TargetPose[] {
  return DEFAULT_TARGET_POSES
}

export function subscribeToTargetPoses(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    memorySnapshot = null
    cachedRaw = undefined
    onStoreChange()
  }
  const onLocalChange = () => onStoreChange()

  window.addEventListener('storage', onStorage)
  window.addEventListener(STORAGE_EVENT, onLocalChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(STORAGE_EVENT, onLocalChange)
  }
}

export function saveTargetPoses(poses: readonly TargetPose[]) {
  const nextSnapshot = poses.map((pose) => ({ ...pose, joints: [...pose.joints] }))
  const raw = JSON.stringify({ schemaVersion: SCHEMA_VERSION, poses: nextSnapshot } satisfies TargetPosePayload)

  try {
    window.localStorage.setItem(STORAGE_KEY, raw)
    memorySnapshot = null
    cachedRaw = raw
  } catch {
    memorySnapshot = nextSnapshot
  }
  cachedSnapshot = nextSnapshot
  window.dispatchEvent(new Event(STORAGE_EVENT))
}
