'use client'

import { Icon } from '@/lib/icons'
import type { TargetPose } from '@/types'
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'

interface ProgramPanelProps {
  activeWaypoint: number
  selectWaypoint: (id: number) => void
  swapWaypoints: (sourceId: number, targetId: number) => void
  addWaypoint: () => void
  progress: number
  deleteWaypoint: () => void
  waypoints: readonly TargetPose[]
}

export default function ProgramPanel({
  activeWaypoint,
  selectWaypoint,
  swapWaypoints,
  waypoints,
  addWaypoint,
  deleteWaypoint,
  progress
}: ProgramPanelProps) {
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
    <section className='program-panel'>
      <div className='program-head'>
        <div>
          <h2>
            Target Poses <small>LOCAL · v1</small>
          </h2>
        </div>
        <div className='program-actions'>
          <button onClick={addWaypoint}>
            <Icon name='add' />
            Save Pose
          </button>
          <button aria-label='Delete selected waypoint' onClick={deleteWaypoint} disabled={waypoints.length <= 1}>
            <Icon name='trash-delete' />
          </button>
        </div>
      </div>
      <div className='timeline-wrap'>
        <div className='timeline-line'>
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className='timeline'>
          {waypoints.map((point, index) => (
            <button
              key={point.id}
              className={[
                activeWaypoint === point.id ? 'active' : '',
                draggedWaypoint === point.id ? 'dragging' : '',
                dropTarget === point.id ? 'drop-target' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={waypoints.length > 1}
              aria-label={`${point.name}, position ${index + 1} of ${waypoints.length}. Drag to reorder.`}
              aria-pressed={activeWaypoint === point.id}
              aria-keyshortcuts='Alt+ArrowLeft Alt+ArrowRight'
              title={`${point.name}: ${point.joints.join(', ')}°. Drag to swap, or use Option/Alt + arrow keys.`}
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
                <small>{point.time}</small>
              </span>
            </button>
          ))}
          <button className='add-point' onClick={addWaypoint}>
            <span>
              <Icon name='add' size={14} />
            </span>
            <small>SAVE</small>
          </button>
        </div>
      </div>
    </section>
  )
}
