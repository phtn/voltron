type IconName =
  | 'arm'
  | 'chevron'
  | 'command'
  | 'cube'
  | 'expand'
  | 'grid'
  | 'help'
  | 'home'
  | 'layers'
  | 'more'
  | 'pause'
  | 'play'
  | 'plus'
  | 'rotate'
  | 'settings'
  | 'stop'
  | 'terminal'
  | 'trash'
  | 'user'
  | 'wifi'

const iconPaths: Record<IconName, React.ReactNode> = {
  arm: (
    <>
      <circle cx='6' cy='18' r='2' />
      <circle cx='10' cy='11' r='2' />
      <circle cx='17' cy='7' r='2' />
      <path d='m7.2 16.4 1.7-3.5m2.8-2.9 3.6-2.1M18.8 8.3l1.7 2.2m-3.6 5.2 2-5.2M14 17.5l3-1.8' />
    </>
  ),
  chevron: <path d='m9 18 6-6-6-6' />,
  command: (
    <>
      <path d='M18 9V5a2 2 0 0 0-2-2h-1a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4H6v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H8a2 2 0 0 0-2 2v4Z' />
    </>
  ),
  cube: (
    <>
      <path d='m12 3 8 4.5v9L12 21l-8-4.5v-9Z' />
      <path d='m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9' />
    </>
  ),
  expand: <path d='M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5' />,
  grid: (
    <>
      <rect x='3' y='3' width='7' height='7' rx='1' />
      <rect x='14' y='3' width='7' height='7' rx='1' />
      <rect x='3' y='14' width='7' height='7' rx='1' />
      <rect x='14' y='14' width='7' height='7' rx='1' />
    </>
  ),
  help: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M9.7 9a2.4 2.4 0 1 1 3.5 2.2c-.8.4-1.2.9-1.2 1.8m0 3.5h.01' />
    </>
  ),
  home: (
    <>
      <path d='m3 11 9-8 9 8' />
      <path d='M5 10v10h14V10M9 20v-6h6v6' />
    </>
  ),
  layers: (
    <>
      <path d='m12 2 9 5-9 5-9-5Z' />
      <path d='m3 12 9 5 9-5M3 17l9 5 9-5' />
    </>
  ),
  more: (
    <>
      <circle cx='5' cy='12' r='1' fill='currentColor' />
      <circle cx='12' cy='12' r='1' fill='currentColor' />
      <circle cx='19' cy='12' r='1' fill='currentColor' />
    </>
  ),
  pause: (
    <>
      <path d='M9 6v12M15 6v12' />
    </>
  ),
  play: <path d='m8 5 11 7-11 7Z' />,
  plus: <path d='M12 5v14M5 12h14' />,
  rotate: (
    <>
      <path d='M20 7v5h-5' />
      <path d='M19 12a7 7 0 1 1-2-5' />
    </>
  ),
  settings: (
    <>
      <circle cx='12' cy='12' r='3' />
      <path d='M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z' />
    </>
  ),
  stop: <rect x='6' y='6' width='12' height='12' rx='1' />,
  terminal: (
    <>
      <path d='m5 7 4 4-4 4m6 0h7' />
      <rect x='2.5' y='3' width='19' height='18' rx='2' />
    </>
  ),
  trash: (
    <>
      <path d='M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6' />
    </>
  ),
  user: (
    <>
      <circle cx='12' cy='8' r='4' />
      <path d='M4 21a8 8 0 0 1 16 0' />
    </>
  ),
  wifi: (
    <>
      <path d='M5 12.5a10 10 0 0 1 14 0M8 16a6 6 0 0 1 8 0' />
      <circle cx='12' cy='19' r='1' fill='currentColor' />
    </>
  )
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.7'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'>
      {iconPaths[name]}
    </svg>
  )
}
