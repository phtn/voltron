export const ROBOT_PROTOCOL_VERSION = 1 as const
export const ROBOT_JOINT_COUNT = 7

export type RobotDeviceInfo = {
  name: string
  firmware: string
  jointCount: number
  capabilities: string[]
}

export type RobotTelemetry = {
  sequence: number | null
  joints: number[]
  voltage: number | null
  temperatures: number[]
  estopped: boolean
  faults: string[]
  receivedAt: number
}

export type RobotClientMessage =
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'hello'
      client: 'voltron-i'
      jointCount: typeof ROBOT_JOINT_COUNT
    }
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'ping'
      sequence: number
      sentAt: number
    }
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'set_pose'
      commandId: string
      joints: number[]
      durationMs: number
    }
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'estop'
      commandId: string
      engaged: boolean
    }

export type RobotDeviceMessage =
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'hello'
      device: string
      firmware: string
      jointCount: number
      capabilities: string[]
    }
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'pong'
      sequence: number
    }
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'telemetry'
      sequence: number | null
      joints: number[]
      voltage: number | null
      temperatures: number[]
      estopped: boolean
      faults: string[]
    }
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'ack'
      commandId: string
      accepted: boolean
      error: string | null
    }
  | {
      version: typeof ROBOT_PROTOCOL_VERSION
      type: 'fault'
      code: string
      message: string
      recoverable: boolean
    }

export type RobotParseResult =
  | { ok: true; message: RobotDeviceMessage }
  | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isFiniteNumberArray(value: unknown, maximumLength = 32): value is number[] {
  return Array.isArray(value) && value.length <= maximumLength && value.every(isFiniteNumber)
}

function isStringArray(value: unknown, maximumLength = 32): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maximumLength &&
    value.every((item) => typeof item === 'string' && item.length <= 120)
  )
}

function optionalStringArray(value: unknown) {
  return value === undefined || isStringArray(value)
}

function parseHello(value: Record<string, unknown>): RobotParseResult {
  if (
    typeof value.device !== 'string' ||
    value.device.length === 0 ||
    value.device.length > 80 ||
    typeof value.firmware !== 'string' ||
    value.firmware.length === 0 ||
    value.firmware.length > 80 ||
    !Number.isSafeInteger(value.jointCount) ||
    (value.jointCount as number) < 1 ||
    (value.jointCount as number) > 32 ||
    !optionalStringArray(value.capabilities)
  ) {
    return { ok: false, error: 'Invalid robot hello message.' }
  }

  return {
    ok: true,
    message: {
      version: ROBOT_PROTOCOL_VERSION,
      type: 'hello',
      device: value.device,
      firmware: value.firmware,
      jointCount: value.jointCount as number,
      capabilities: value.capabilities ?? []
    }
  }
}

function parseTelemetry(value: Record<string, unknown>): RobotParseResult {
  if (
    !isFiniteNumberArray(value.joints) ||
    (value.sequence !== undefined && !Number.isSafeInteger(value.sequence)) ||
    (value.voltage !== undefined && !isFiniteNumber(value.voltage)) ||
    (value.temperatures !== undefined && !isFiniteNumberArray(value.temperatures)) ||
    (value.estopped !== undefined && typeof value.estopped !== 'boolean') ||
    (value.faults !== undefined && !isStringArray(value.faults))
  ) {
    return { ok: false, error: 'Invalid robot telemetry message.' }
  }

  return {
    ok: true,
    message: {
      version: ROBOT_PROTOCOL_VERSION,
      type: 'telemetry',
      sequence: (value.sequence as number | undefined) ?? null,
      joints: value.joints,
      voltage: (value.voltage as number | undefined) ?? null,
      temperatures: (value.temperatures as number[] | undefined) ?? [],
      estopped: (value.estopped as boolean | undefined) ?? false,
      faults: (value.faults as string[] | undefined) ?? []
    }
  }
}

function parseAcknowledgement(value: Record<string, unknown>): RobotParseResult {
  if (
    typeof value.commandId !== 'string' ||
    value.commandId.length === 0 ||
    value.commandId.length > 120 ||
    typeof value.accepted !== 'boolean' ||
    (value.error !== undefined && value.error !== null && typeof value.error !== 'string')
  ) {
    return { ok: false, error: 'Invalid robot acknowledgement.' }
  }

  return {
    ok: true,
    message: {
      version: ROBOT_PROTOCOL_VERSION,
      type: 'ack',
      commandId: value.commandId,
      accepted: value.accepted,
      error: (value.error as string | null | undefined) ?? null
    }
  }
}

function parseFault(value: Record<string, unknown>): RobotParseResult {
  if (
    typeof value.code !== 'string' ||
    value.code.length === 0 ||
    value.code.length > 80 ||
    typeof value.message !== 'string' ||
    value.message.length > 240 ||
    typeof value.recoverable !== 'boolean'
  ) {
    return { ok: false, error: 'Invalid robot fault message.' }
  }

  return {
    ok: true,
    message: {
      version: ROBOT_PROTOCOL_VERSION,
      type: 'fault',
      code: value.code,
      message: value.message,
      recoverable: value.recoverable
    }
  }
}

export function parseRobotMessage(line: string): RobotParseResult {
  let value: unknown
  try {
    value = JSON.parse(line)
  } catch {
    return { ok: false, error: 'Robot message is not valid JSON.' }
  }

  if (!isRecord(value)) return { ok: false, error: 'Robot message must be an object.' }
  if (value.version !== ROBOT_PROTOCOL_VERSION) {
    return { ok: false, error: `Unsupported robot protocol version: ${String(value.version)}.` }
  }

  switch (value.type) {
    case 'hello':
      return parseHello(value)
    case 'telemetry':
      return parseTelemetry(value)
    case 'pong':
      return Number.isSafeInteger(value.sequence)
        ? {
            ok: true,
            message: { version: ROBOT_PROTOCOL_VERSION, type: 'pong', sequence: value.sequence as number }
          }
        : { ok: false, error: 'Invalid robot pong message.' }
    case 'ack':
      return parseAcknowledgement(value)
    case 'fault':
      return parseFault(value)
    default:
      return { ok: false, error: `Unknown robot message type: ${String(value.type)}.` }
  }
}

export function serializeRobotMessage(message: RobotClientMessage) {
  return `${JSON.stringify(message)}\n`
}

export function createClientHello(): RobotClientMessage {
  return {
    version: ROBOT_PROTOCOL_VERSION,
    type: 'hello',
    client: 'voltron-i',
    jointCount: ROBOT_JOINT_COUNT
  }
}

export function createPing(sequence: number): RobotClientMessage {
  return {
    version: ROBOT_PROTOCOL_VERSION,
    type: 'ping',
    sequence,
    sentAt: Date.now()
  }
}
