'use client'

import { Icon } from '@/lib/icons'
import { ROBOT_PROGRAM_PRESETS, getRobotProgramPreset } from '@/lib/robot-program-presets'
import type { TargetPose } from '@/types'
import { memo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent } from 'react'

interface ProgramPanelProps {
  activeWaypoint: number
  selectWaypoint: (id: number) => void
  swapWaypoints: (sourceId: number, targetId: number) => void
  addWaypoint: () => void
  createPoseSet: () => void
  newSetDisabled: boolean
  loadPreset: (presetId: string) => void
  presetLoadDisabled: boolean
  progress: number
  deleteWaypoint: () => void
  waypoints: readonly TargetPose[]
}

type WaypointTimelineProps = Pick<
  ProgramPanelProps,
  'activeWaypoint' | 'selectWaypoint' | 'swapWaypoints' | 'waypoints' | 'addWaypoint'
>

const plottingPresets = ROBOT_PROGRAM_PRESETS.filter((preset) => preset.category === 'plotting')
const weldingPresets = ROBOT_PROGRAM_PRESETS.filter((preset) => preset.category === 'welding')

const PresetPicker = memo(function PresetPicker({
  loadPreset,
  presetLoadDisabled
}: Pick<ProgramPanelProps, 'loadPreset' | 'presetLoadDisabled'>) {
  const [selectedPresetId, setSelectedPresetId] = useState(ROBOT_PROGRAM_PRESETS[0]?.id ?? '')
  const selectedPreset = getRobotProgramPreset(selectedPresetId) ?? ROBOT_PROGRAM_PRESETS[0]

  return (
    <div className='preset-bar'>
      <label className='preset-select'>
        <span>PROGRAM PRESET</span>
        <select value={selectedPresetId} onChange={(event) => setSelectedPresetId(event.target.value)}>
          <optgroup label='Plotting shapes'>
            {plottingPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </optgroup>
          <optgroup label='Example welds'>
            {weldingPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      {selectedPreset ? (
        <div className='preset-summary' title={selectedPreset.description}>
          <span>
            {selectedPreset.poses.length} poses · {selectedPreset.recommendedSpeed}% speed
          </span>
          <small>
            {selectedPreset.category === 'welding'
              ? 'SIMULATION ONLY · ARC OUTPUT OFF'
              : 'JOINT-SPACE DEMO · VERIFY TCP'}
          </small>
        </div>
      ) : null}
      <button
        className='load-preset'
        disabled={presetLoadDisabled || !selectedPreset}
        title={
          presetLoadDisabled
            ? 'Disconnect the ESP32 before replacing the simulated program.'
            : selectedPreset?.description
        }
        onClick={() => {
          if (selectedPreset) loadPreset(selectedPreset.id)
        }}>
        Load preset
      </button>
    </div>
  )
})

const WaypointTimeline = memo(function WaypointTimeline({
  activeWaypoint,
  selectWaypoint,
  swapWaypoints,
  waypoints,
  addWaypoint
}: WaypointTimelineProps) {
  const [draggedWaypoint, setDraggedWaypoint] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const suppressClickRef = useRef(false)

  function handleDragStart(event: DragEvent<HTMLButtonElement>, id: number) {
    suppressClickRef.current = true
    setDraggedWaypoint(id)
    setDropTarget(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id))
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>, id: number) {
    if (draggedWaypoint === null || draggedWaypoint === id) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropTarget !== id) setDropTarget(id)
  }

  function resetDragState() {
    setDraggedWaypoint(null)
    setDropTarget(null)
    window.requestAnimationFrame(() => {
      suppressClickRef.current = false
    })
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>, targetId: number) {
    event.preventDefault()
    const transferredId = Number(event.dataTransfer.getData('text/plain'))
    const sourceId = draggedWaypoint ?? (Number.isSafeInteger(transferredId) ? transferredId : null)
    if (sourceId !== null && sourceId !== targetId) swapWaypoints(sourceId, targetId)
    resetDragState()
  }

  function handleKeyboardSwap(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
    const targetIndex = index + (event.key === 'ArrowLeft' ? -1 : 1)
    const source = waypoints[index]
    const target = waypoints[targetIndex]
    if (!source || !target) return
    event.preventDefault()
    swapWaypoints(source.id, target.id)
  }

  return (
    <div className='timeline'>
      <div className='timeline-line' aria-hidden='true'>
        <i />
      </div>
      {waypoints.map((point, index) => {
        const processLabel = point.process === 'weld' ? 'ARC' : point.process === 'plot' ? 'PEN' : 'MOVE'
        return (
          <button
            key={point.id}
            className={[
              activeWaypoint === point.id ? 'active' : '',
              point.process ? `process-${point.process}` : '',
              draggedWaypoint === point.id ? 'dragging' : '',
              dropTarget === point.id ? 'drop-target' : '',
              'relative z-50'
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={waypoints.length > 1}
            aria-label={`${point.name}, ${processLabel.toLowerCase()} waypoint, position ${index + 1} of ${waypoints.length}. Drag to reorder.`}
            aria-pressed={activeWaypoint === point.id}
            aria-keyshortcuts='Alt+ArrowLeft Alt+ArrowRight'
            title={`${point.name}: ${point.joints.join(', ')}°. ${processLabel} state is illustrative. Drag to swap, or use Option/Alt + arrow keys.`}
            onClick={() => {
              if (!suppressClickRef.current) selectWaypoint(point.id)
            }}
            onDragStart={(event) => handleDragStart(event, point.id)}
            onDragOver={(event) => handleDragOver(event, point.id)}
            onDrop={(event) => handleDrop(event, point.id)}
            onDragEnd={resetDragState}
            onKeyDown={(event) => handleKeyboardSwap(event, index)}>
            <span className='waypoint-marker text-sm'>
              <i>{index + 1}</i>
            </span>
            <span className='waypoint-copy'>
              <b>{point.name}</b>
              <small>
                {processLabel} · {point.time}
              </small>
            </span>
          </button>
        )
      })}
      <button className='add-point bg-card relative z-50' onClick={addWaypoint}>
        <span>
          <Icon name='add' size={14} />
        </span>
        <small>SAVE</small>
      </button>
    </div>
  )
})

export default function ProgramPanel({
  activeWaypoint,
  selectWaypoint,
  swapWaypoints,
  waypoints,
  addWaypoint,
  createPoseSet,
  newSetDisabled,
  loadPreset,
  presetLoadDisabled,
  deleteWaypoint,
  progress
}: ProgramPanelProps) {
  const timelineStyle = { '--timeline-progress': `${progress}%` } as CSSProperties

  return (
    <section className='program-panel'>
      <div className='program-head'>
        <div>
          <h2>
            Program Timeline <small>{waypoints.length} POSES · LOCAL</small>
          </h2>
        </div>
        <div className='program-actions'>
          <button
            disabled={newSetDisabled}
            title={
              newSetDisabled
                ? 'Disconnect the ESP32 before replacing the simulated program.'
                : 'Replace this local timeline with a new set starting at the current pose.'
            }
            onClick={createPoseSet}>
            <Icon name='layers' />
            New Set
          </button>
          <button onClick={addWaypoint}>
            <Icon name='add' />
            Save Pose
          </button>
          <button aria-label='Delete selected waypoint' onClick={deleteWaypoint} disabled={waypoints.length <= 1}>
            <Icon name='trash-delete' />
          </button>
        </div>
      </div>

      <PresetPicker loadPreset={loadPreset} presetLoadDisabled={presetLoadDisabled} />

      <div className='timeline-wrap' style={timelineStyle}>
        <WaypointTimeline
          activeWaypoint={activeWaypoint}
          selectWaypoint={selectWaypoint}
          swapWaypoints={swapWaypoints}
          waypoints={waypoints}
          addWaypoint={addWaypoint}
        />
      </div>
    </section>
  )
}
