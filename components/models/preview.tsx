import { Loader } from '../loader'
export function LoadScene() {
  return (
    <div className={`scene-canvas flex items-center`}>
      {/*<div className='scene-glow' />*/}
      <Loader />
    </div>
  )
}
