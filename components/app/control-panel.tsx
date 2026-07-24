import { JOINT_STEPS } from '@/lib/joint-step'
import type { Joint, JointStep } from '@/types'

interface ControlPanelProps {
  controlMode: 'Joint' | 'Cartesian'
  activeJoint: number
  joints: Joint[]
  jointStep: JointStep
  speed: number
  setJointStep: (step: JointStep) => void
  setSpeed: (speed: number) => void
  setActiveJoint: (index: number) => void
  setControlMode: (mode: 'Joint' | 'Cartesian') => void
  updateJoint: (index: number, value: number) => void
  saveTargetPose: () => void
  tcp: { x: string; y: string; z: string }
}

export const ControlPanel = ({
  controlMode,
  setControlMode,
  activeJoint,
  setActiveJoint,
  joints,
  jointStep,
  speed,
  setJointStep,
  setSpeed,
  updateJoint,
  saveTargetPose,
  tcp
}: ControlPanelProps) => {
  return (
    <aside className='control-panel'>
      <div className='control-header'>
        <div>
          <h2>Pose Controller</h2>
        </div>
        {controlMode === 'Joint' ? (
          <div className='joint-step-selector' role='group' aria-label='Joint angle increment'>
            <span>STEP</span>
            {JOINT_STEPS.map((step) => (
              <button
                key={step}
                type='button'
                className={jointStep === step ? 'active' : ''}
                aria-pressed={jointStep === step}
                title={`${step} degree joint step`}
                onClick={() => setJointStep(step)}>
                {step}°
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className='control-tabs'>
        {(['Joint', 'Cartesian'] as const).map((tab) => (
          <button key={tab} className={controlMode === tab ? 'active' : ''} onClick={() => setControlMode(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {controlMode === 'Joint' ? (
        <div className='joint-list'>
          {joints.map((joint, index) => {
            const position = ((joint.value - joint.min) / (joint.max - joint.min)) * 100
            return (
              <div
                className={`joint-row ${activeJoint === index ? 'active' : ''}`}
                key={joint.id}
                onClick={() => setActiveJoint(index)}>
                <div className='joint-meta'>
                  <span>{joint.id}</span>
                  <div>
                    <b>{joint.name}</b>
                    <small>{joint.type}</small>
                  </div>
                  <label>
                    <input
                      type='number'
                      aria-label={`${joint.name} angle`}
                      min={joint.min}
                      max={joint.max}
                      step={jointStep}
                      value={Number(joint.value.toFixed(2))}
                      onChange={(event) => updateJoint(index, Number(event.target.value))}
                    />
                    <em>°</em>
                  </label>
                </div>
                <div className='range-label'>
                  <span>{joint.min}°</span>
                  <span>{joint.max}°</span>
                </div>
                <input
                  className='joint-slider'
                  style={{ '--value': `${position}%` } as React.CSSProperties}
                  type='range'
                  aria-label={`${joint.name} angle`}
                  min={joint.min}
                  max={joint.max}
                  step={jointStep}
                  value={joint.value}
                  onChange={(event) => updateJoint(index, Number(event.target.value))}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <div className='cartesian-panel'>
          <div className='coordinate-group'>
            <span>POSITION / MM</span>
            {[
              ['X', tcp.x],
              ['Y', tcp.y],
              ['Z', tcp.z]
            ].map(([axis, value]) => (
              <label key={axis}>
                <i>{axis}</i>
                <input value={value} readOnly />
                <em>mm</em>
              </label>
            ))}
          </div>
          <div className='coordinate-group'>
            <span>ORIENTATION / DEG</span>
            {[
              ['RX', '0.0'],
              ['RY', '24.0'],
              ['RZ', '0.0']
            ].map(([axis, value]) => (
              <label key={axis}>
                <i>{axis}</i>
                <input value={value} readOnly />
                <em>°</em>
              </label>
            ))}
          </div>
          <button className='apply-pose'>Apply target pose</button>
        </div>
      )}

      <div className='speed-control'>
        <div>
          <span className='section-label'>MOTION SPEED</span>
          <b>{speed}%</b>
        </div>
        <input
          className='speed-slider'
          style={{ '--value': `${speed}%` } as React.CSSProperties}
          type='range'
          min='1'
          max='100'
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
        />
        <div className='range-label'>
          <span>Precise</span>
          <span>Fast</span>
        </div>
      </div>
      <button className='apply-pose' onClick={saveTargetPose}>Save Target Pose</button>
      <div className='control-footer'>
        <div>
          <span>Payload</span>
          <b>250 g</b>
        </div>
        <div>
          <span>Repeatability</span>
          <b>±0.01 mm</b>
        </div>
        <div>
          <span>Cycle time</span>
          <b>5.8 s</b>
        </div>
      </div>
    </aside>
  )
}
