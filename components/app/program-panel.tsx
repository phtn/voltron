import { Icon } from '@/lib/icons'

interface ProgramPanelProps {
  activeWaypoint: number
  setActiveWaypoint: (id: number) => void
  addWaypoint: () => void
  progress: number
  deleteWaypoint: () => void
  waypoints: { id: number; name: string; time: string; pose: string }[]
}

export default function ProgramPanel({
  activeWaypoint,
  setActiveWaypoint,
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
            Pick &amp; Inspect <small>v0.3</small>
          </h2>
        </div>
        <div className='program-actions'>
          <button onClick={addWaypoint}>
            <Icon name='add' />
            Add Waypoint
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
              onClick={() => setActiveWaypoint(point.id)}>
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
            <small>ADD</small>
          </button>
        </div>
      </div>
    </section>
  )
}
