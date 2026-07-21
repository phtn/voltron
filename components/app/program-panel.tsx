import { Icon } from '@/lib/icons'
import type { TargetPose } from '@/types'

interface ProgramPanelProps {
  activeWaypoint: number
  selectWaypoint: (id: number) => void
  addWaypoint: () => void
  progress: number
  deleteWaypoint: () => void
  waypoints: readonly TargetPose[]
}

export default function ProgramPanel({
  activeWaypoint,
  selectWaypoint,
  waypoints,
  addWaypoint,
  deleteWaypoint,
  progress
}: ProgramPanelProps) {
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
              className={activeWaypoint === point.id ? 'active' : ''}
              title={`${point.name}: ${point.joints.join(', ')}°`}
              onClick={() => selectWaypoint(point.id)}>
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
