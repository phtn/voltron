import { Joint } from '@/types'

export function RobotScenePreview({ joints, view }: { joints: Joint[]; view: string }) {
  const shoulderTilt = (joints[1].value - joints[1].home) * -0.16
  const elbowTilt = (joints[2].value - joints[2].home) * 0.12
  const wristTilt = (joints[4].value - joints[4].home) * 0.12

  return (
    <div className={`scene-canvas view-${view.toLowerCase()}`}>
      <div className='scene-glow' />
      <svg className='work-grid' viewBox='0 0 900 450' preserveAspectRatio='none' aria-hidden='true'>
        <defs>
          <pattern id='fineGrid' width='40' height='40' patternUnits='userSpaceOnUse'>
            <path d='M40 0H0V40' fill='none' stroke='rgba(255,255,255,.055)' strokeWidth='1' />
          </pattern>
          <linearGradient id='gridFade' x1='0' y1='0' x2='0' y2='1'>
            <stop stopColor='white' stopOpacity='0' />
            <stop offset='1' stopColor='white' stopOpacity='1' />
          </linearGradient>
          <mask id='gridMask'>
            <rect width='900' height='450' fill='url(#gridFade)' />
          </mask>
        </defs>
        <g mask='url(#gridMask)' transform='translate(0 15) skewX(-30)'>
          <rect width='900' height='450' fill='url(#fineGrid)' />
        </g>
      </svg>
      <div className='axis axis-x'>X</div>
      <div className='axis axis-y'>Y</div>
      <div className='axis axis-z'>Z</div>

      <svg
        className='robot-model'
        viewBox='0 0 760 600'
        role='img'
        aria-label='Loading preview of the Voltron robot arm visualization'>
        <defs>
          <linearGradient id='metal' x1='0' y1='0' x2='1' y2='1'>
            <stop stopColor='#d8d9d5' />
            <stop offset='.24' stopColor='#787d7c' />
            <stop offset='.55' stopColor='#e1e2dd' />
            <stop offset='1' stopColor='#4b4f50' />
          </linearGradient>
          <linearGradient id='darkMetal' x1='0' y1='0' x2='1' y2='1'>
            <stop stopColor='#373a39' />
            <stop offset='.5' stopColor='#111311' />
            <stop offset='1' stopColor='#464a47' />
          </linearGradient>
          <linearGradient id='armMetal' x1='0' y1='0' x2='1' y2='.2'>
            <stop stopColor='#a5a9a5' />
            <stop offset='.45' stopColor='#5c605e' />
            <stop offset='.52' stopColor='#babdb8' />
            <stop offset='1' stopColor='#3c403e' />
          </linearGradient>
          <filter id='shadow'>
            <feGaussianBlur stdDeviation='10' />
          </filter>
        </defs>
        <ellipse cx='340' cy='548' rx='176' ry='28' fill='#000' opacity='.48' filter='url(#shadow)' />
        <g className='robot-gimbal' transform={`rotate(${joints[0].value * 0.03} 340 500)`}>
          <path
            d='M230 478 252 447h176l26 31v47c0 17-46 31-108 31s-116-13-116-31Z'
            fill='url(#metal)'
            stroke='#262a28'
            strokeWidth='4'
          />
          <ellipse cx='342' cy='483' rx='112' ry='31' fill='#111311' stroke='#777d78' strokeWidth='5' />
          <ellipse cx='342' cy='477' rx='91' ry='22' fill='#232624' />
          <path
            d='M279 467V361c0-26 19-50 46-57h53c27 7 45 31 45 57v106'
            fill='url(#darkMetal)'
            stroke='#777c78'
            strokeWidth='4'
          />
          <path d='M295 459v-98c0-21 15-37 35-43h25v141' fill='#202321' opacity='.85' />
          <g transform={`rotate(${shoulderTilt} 350 349)`}>
            <circle cx='350' cy='349' r='67' fill='url(#metal)' stroke='#1d201e' strokeWidth='5' />
            <circle cx='350' cy='349' r='47' fill='url(#darkMetal)' stroke='#868b86' strokeWidth='3' />
            <circle cx='350' cy='349' r='28' fill='#121412' stroke='#f15a35' strokeWidth='4' />
            <circle cx='350' cy='349' r='4' fill='#f15a35' />
            <g transform={`rotate(${elbowTilt} 354 349)`}>
              <path
                d='M340 338 385 117c5-27 29-47 57-47h36l12 64-56 17-36 211Z'
                fill='url(#armMetal)'
                stroke='#202321'
                strokeWidth='6'
              />
              <path d='m369 321 41-177c7-28 22-48 48-56' fill='none' stroke='#d5d6d1' strokeWidth='6' opacity='.45' />
              <path d='m391 303 36-155' fill='none' stroke='#171a18' strokeWidth='15' opacity='.75' />
              <circle cx='456' cy='106' r='66' fill='url(#metal)' stroke='#1c1f1d' strokeWidth='5' />
              <circle cx='456' cy='106' r='44' fill='url(#darkMetal)' stroke='#808580' strokeWidth='3' />
              <circle cx='456' cy='106' r='25' fill='#121412' stroke='#f15a35' strokeWidth='4' />
              <g transform={`rotate(${wristTilt} 456 106)`}>
                <path
                  d='M454 88 612 117c26 5 45 27 45 54v18l-68 7-19-27-128-25Z'
                  fill='url(#armMetal)'
                  stroke='#202321'
                  strokeWidth='6'
                />
                <path d='m482 101 112 22' stroke='#d1d2cd' strokeWidth='5' opacity='.4' />
                <ellipse
                  cx='610'
                  cy='156'
                  rx='48'
                  ry='52'
                  fill='url(#metal)'
                  stroke='#1e211f'
                  strokeWidth='5'
                  transform={`rotate(${joints[3].value * 0.05} 610 156)`}
                />
                <ellipse cx='634' cy='166' rx='37' ry='42' fill='url(#darkMetal)' stroke='#898e89' strokeWidth='3' />
                <path
                  d='M651 148h51c14 0 25 11 25 25v16c0 14-11 25-25 25h-51Z'
                  fill='url(#metal)'
                  stroke='#222523'
                  strokeWidth='5'
                />
                <circle cx='663' cy='181' r='23' fill='#151715' stroke='#f15a35' strokeWidth='3' />
                <g transform={`rotate(${joints[5].value * 0.08} 706 181)`}>
                  <rect x='696' y='157' width='34' height='48' rx='7' fill='#383c39' stroke='#9ca19c' strokeWidth='3' />
                  <path d='M727 164h28v10h-25m-3 15h28v10h-25' fill='none' stroke='#aeb2ae' strokeWidth='7' />
                </g>
              </g>
            </g>
          </g>
        </g>
        <g className='target-ring'>
          <ellipse
            cx='691'
            cy='215'
            rx='35'
            ry='13'
            fill='none'
            stroke='#f15a35'
            strokeWidth='2'
            strokeDasharray='6 5'
          />
          <path d='M691 190v50M657 215h68' stroke='#f15a35' strokeWidth='1' opacity='.6' />
        </g>
      </svg>
      <div className='scene-readout'>
        <span>TCP</span>
        <b>X 182.4</b>
        <b>Y −46.8</b>
        <b>Z 214.2</b>
        <em>mm</em>
      </div>
    </div>
  )
}
