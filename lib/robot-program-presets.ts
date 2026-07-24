import type { TargetPose, TargetPoseProcess } from '@/types'

export type RobotProgramCategory = 'plotting' | 'welding'

export type RobotProgramPreset = {
  id: string
  name: string
  category: RobotProgramCategory
  description: string
  recommendedSpeed: number
  poses: readonly TargetPose[]
}

type Point = readonly [x: number, y: number]
type Segment = readonly [start: Point, end: Point]

const HOME_JOINTS = [0, 0, 0, 0, 0, 0, 0] as const

function round(value: number) {
  return Math.round(value * 10) / 10
}

function timelineTime(index: number, secondsPerSegment: number) {
  const totalTenths = Math.round(index * secondsPerSegment * 10)
  const minutes = Math.floor(totalTenths / 600)
  const seconds = Math.floor((totalTenths % 600) / 10)
  const tenths = totalTenths % 10
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

function plotJoints([x, y]: Point, lift = 0) {
  return [
    round(x * 24),
    round(-24 + y * 10 + lift * 8),
    round(25 - y * 7 - lift * 8),
    round(12 + x * 4),
    round(38 + y * 5),
    round(-x * 8),
    0
  ]
}

function weldJoints([x, y]: Point, lift = 0) {
  return [
    round(x * 20),
    round(-20 + y * 7 + lift * 7),
    round(29 - y * 6 - lift * 7),
    round(18 + x * 2),
    round(48 + y * 3),
    round(-x * 5),
    12
  ]
}

function createPose(
  id: number,
  name: string,
  joints: readonly number[],
  secondsPerSegment: number,
  process: TargetPoseProcess
): TargetPose {
  return {
    id,
    name,
    joints: [...joints],
    time: timelineTime(id - 1, secondsPerSegment),
    process
  }
}

function createPlotPreset({
  id,
  name,
  description,
  points,
  recommendedSpeed = 32
}: {
  id: string
  name: string
  description: string
  points: readonly Point[]
  recommendedSpeed?: number
}): RobotProgramPreset {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last || points.length < 2) throw new RangeError('Plot presets require at least two path points.')

  const secondsPerSegment = 0.8
  const poses: TargetPose[] = []
  const addPose = (poseName: string, joints: readonly number[], process: TargetPoseProcess) => {
    poses.push(createPose(poses.length + 1, poseName, joints, secondsPerSegment, process))
  }

  addPose('Home', HOME_JOINTS, 'travel')
  addPose('Approach', plotJoints(first, 1), 'travel')
  points.forEach((point, index) => {
    const pointName = index === 0 ? 'Pen down' : index === points.length - 1 ? 'Plot end' : `Plot ${index + 1}`
    addPose(pointName, plotJoints(point), 'plot')
  })
  addPose('Pen up', plotJoints(last, 1), 'travel')
  addPose('Home', HOME_JOINTS, 'travel')

  return { id, name, category: 'plotting', description, recommendedSpeed, poses }
}

function createWeldPreset({
  id,
  name,
  description,
  points,
  recommendedSpeed = 20
}: {
  id: string
  name: string
  description: string
  points: readonly Point[]
  recommendedSpeed?: number
}): RobotProgramPreset {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last || points.length < 2) throw new RangeError('Weld presets require at least two path points.')

  const secondsPerSegment = 1
  const poses: TargetPose[] = []
  const addPose = (poseName: string, joints: readonly number[], process: TargetPoseProcess) => {
    poses.push(createPose(poses.length + 1, poseName, joints, secondsPerSegment, process))
  }

  addPose('Home', HOME_JOINTS, 'travel')
  addPose('Safe approach', weldJoints(first, 1), 'travel')
  points.forEach((point, index) => {
    const pointName = index === 0 ? 'Arc start' : index === points.length - 1 ? 'Arc end' : `Bead ${index + 1}`
    addPose(pointName, weldJoints(point), 'weld')
  })
  addPose('Torch clear', weldJoints(last, 1), 'travel')
  addPose('Home', HOME_JOINTS, 'travel')

  return { id, name, category: 'welding', description, recommendedSpeed, poses }
}

function createInterruptedWeldPreset({
  id,
  name,
  description,
  segments,
  segmentLabel,
  recommendedSpeed = 18
}: {
  id: string
  name: string
  description: string
  segments: readonly Segment[]
  segmentLabel: string
  recommendedSpeed?: number
}): RobotProgramPreset {
  const first = segments[0]?.[0]
  if (!first || segments.length === 0) throw new RangeError('Interrupted weld presets require at least one segment.')

  const secondsPerSegment = 0.9
  const poses: TargetPose[] = []
  const addPose = (poseName: string, joints: readonly number[], process: TargetPoseProcess) => {
    poses.push(createPose(poses.length + 1, poseName, joints, secondsPerSegment, process))
  }

  addPose('Home', HOME_JOINTS, 'travel')
  addPose('Safe approach', weldJoints(first, 1), 'travel')
  segments.forEach(([start, end], index) => {
    const sequence = index + 1
    addPose(`${segmentLabel} ${sequence} start`, weldJoints(start), 'weld')
    addPose(`${segmentLabel} ${sequence} end`, weldJoints(end), 'weld')
    addPose(`${segmentLabel} ${sequence} clear`, weldJoints(end, 0.65), 'travel')
  })
  addPose('Home', HOME_JOINTS, 'travel')

  return { id, name, category: 'welding', description, recommendedSpeed, poses }
}

function regularPolygon(sides: number, radius = 0.82, rotation = -Math.PI / 2): Point[] {
  return Array.from({ length: sides + 1 }, (_, index) => {
    const angle = rotation + (Math.PI * 2 * (index % sides)) / sides
    return [round(Math.cos(angle) * radius), round(Math.sin(angle) * radius)]
  })
}

function starPoints(points = 5): Point[] {
  return Array.from({ length: points * 2 + 1 }, (_, index) => {
    const normalizedIndex = index % (points * 2)
    const radius = normalizedIndex % 2 === 0 ? 0.9 : 0.4
    const angle = -Math.PI / 2 + (Math.PI * normalizedIndex) / points
    return [round(Math.cos(angle) * radius), round(Math.sin(angle) * radius)]
  })
}

function linePoints(count: number, y: (progress: number, index: number) => number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0 : index / (count - 1)
    return [round(-0.9 + progress * 1.8), round(y(progress, index))]
  })
}

function spiralPoints(count = 22): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1)
    const radius = 0.08 + progress * 0.82
    const angle = -Math.PI / 2 + progress * Math.PI * 5
    return [round(Math.cos(angle) * radius), round(Math.sin(angle) * radius)]
  })
}

const plottingPresets: RobotProgramPreset[] = [
  createPlotPreset({
    id: 'plot-line',
    name: 'Straight Line',
    description: 'A single controlled marker stroke with approach and retract moves.',
    points: [[-0.9, 0], [0.9, 0]],
    recommendedSpeed: 38
  }),
  createPlotPreset({
    id: 'plot-square',
    name: 'Square',
    description: 'A closed four-sided plotting path with equal side lengths.',
    points: [[-0.78, -0.78], [0.78, -0.78], [0.78, 0.78], [-0.78, 0.78], [-0.78, -0.78]]
  }),
  createPlotPreset({
    id: 'plot-triangle',
    name: 'Triangle',
    description: 'A closed triangular path for corner and direction-change testing.',
    points: [[0, -0.9], [0.86, 0.68], [-0.86, 0.68], [0, -0.9]]
  }),
  createPlotPreset({
    id: 'plot-circle',
    name: 'Circle',
    description: 'A 20-segment circular approximation for smooth coordinated motion.',
    points: regularPolygon(20),
    recommendedSpeed: 28
  }),
  createPlotPreset({
    id: 'plot-hexagon',
    name: 'Hexagon',
    description: 'A closed six-sided path with repeated 60-degree direction changes.',
    points: regularPolygon(6)
  }),
  createPlotPreset({
    id: 'plot-star',
    name: 'Five-point Star',
    description: 'Alternating outer and inner vertices for sharp coordinated turns.',
    points: starPoints(),
    recommendedSpeed: 24
  }),
  createPlotPreset({
    id: 'plot-spiral',
    name: 'Spiral',
    description: 'An expanding 2.5-turn spiral with gradually increasing joint travel.',
    points: spiralPoints(),
    recommendedSpeed: 24
  }),
  createPlotPreset({
    id: 'plot-sine-wave',
    name: 'Sine Wave',
    description: 'A sampled wave path for continuous reversals and blend inspection.',
    points: linePoints(19, (progress) => Math.sin(progress * Math.PI * 4) * 0.55),
    recommendedSpeed: 28
  })
]

const weldingPresets: RobotProgramPreset[] = [
  createWeldPreset({
    id: 'weld-straight-bead',
    name: 'Straight Bead',
    description: 'Basic linear bead example with a safe approach and torch-clear retract.',
    points: [[-0.9, 0], [0.9, 0]],
    recommendedSpeed: 22
  }),
  createWeldPreset({
    id: 'weld-butt-seam',
    name: 'Butt Joint Seam',
    description: 'A sampled straight seam for a centered butt-joint training pass.',
    points: linePoints(8, () => 0),
    recommendedSpeed: 20
  }),
  createWeldPreset({
    id: 'weld-lap-seam',
    name: 'Lap Joint Seam',
    description: 'A diagonal seam example representing an offset lap-joint edge.',
    points: linePoints(8, (progress) => -0.35 + progress * 0.7),
    recommendedSpeed: 18
  }),
  createWeldPreset({
    id: 'weld-fillet-corner',
    name: 'Fillet Corner',
    description: 'An L-shaped fillet example with a controlled corner transition.',
    points: [[-0.82, 0.72], [-0.82, -0.55], [0.82, -0.55]],
    recommendedSpeed: 16
  }),
  createInterruptedWeldPreset({
    id: 'weld-stitch',
    name: 'Stitch Weld',
    description: 'Four separated stitch examples with a clearance move between beads.',
    segmentLabel: 'Stitch',
    segments: [
      [[-0.9, 0], [-0.62, 0]],
      [[-0.38, 0], [-0.1, 0]],
      [[0.14, 0], [0.42, 0]],
      [[0.66, 0], [0.9, 0]]
    ],
    recommendedSpeed: 18
  }),
  createWeldPreset({
    id: 'weld-weave',
    name: 'Weave Bead',
    description: 'A 14-point transverse weave pattern for oscillation training.',
    points: linePoints(14, (_progress, index) => (index % 2 === 0 ? -0.3 : 0.3)),
    recommendedSpeed: 14
  }),
  createWeldPreset({
    id: 'weld-circular-seam',
    name: 'Circular Seam',
    description: 'A closed 20-segment circular seam with constant simulated torch state.',
    points: regularPolygon(20, 0.72),
    recommendedSpeed: 14
  }),
  createInterruptedWeldPreset({
    id: 'weld-multipass-groove',
    name: 'Three-pass Groove',
    description: 'Three parallel groove passes, each separated by a safe retract move.',
    segmentLabel: 'Pass',
    segments: [
      [[-0.88, -0.26], [0.88, -0.26]],
      [[0.88, 0], [-0.88, 0]],
      [[-0.88, 0.26], [0.88, 0.26]]
    ],
    recommendedSpeed: 12
  })
]

export const ROBOT_PROGRAM_PRESETS: readonly RobotProgramPreset[] = [...plottingPresets, ...weldingPresets]

const presetById = new Map(ROBOT_PROGRAM_PRESETS.map((preset) => [preset.id, preset]))

export function getRobotProgramPreset(id: string) {
  return presetById.get(id) ?? null
}

export function materializeRobotProgramPreset(preset: RobotProgramPreset): TargetPose[] {
  return preset.poses.map((pose) => ({ ...pose, joints: [...pose.joints] }))
}
