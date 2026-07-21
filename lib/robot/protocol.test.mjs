import { describe, expect, test } from 'bun:test'
import {
  ROBOT_PROTOCOL_VERSION,
  createClientHello,
  parseRobotMessage,
  serializeRobotMessage
} from './protocol'

describe('robot serial protocol', () => {
  test('serializes newline-delimited client messages', () => {
    const serialized = serializeRobotMessage(createClientHello())

    expect(serialized.endsWith('\n')).toBe(true)
    expect(JSON.parse(serialized)).toEqual({
      version: ROBOT_PROTOCOL_VERSION,
      type: 'hello',
      client: 'voltron-i',
      jointCount: 7
    })
  })

  test('parses a compatible device handshake', () => {
    const result = parseRobotMessage(
      JSON.stringify({
        version: 1,
        type: 'hello',
        device: 'voltron-esp32',
        firmware: '0.1.0',
        jointCount: 7,
        capabilities: ['telemetry']
      })
    )

    expect(result).toEqual({
      ok: true,
      message: {
        version: 1,
        type: 'hello',
        device: 'voltron-esp32',
        firmware: '0.1.0',
        jointCount: 7,
        capabilities: ['telemetry']
      }
    })
  })

  test('normalizes optional telemetry fields', () => {
    const result = parseRobotMessage(JSON.stringify({ version: 1, type: 'telemetry', joints: [0, 1, 2] }))

    expect(result).toEqual({
      ok: true,
      message: {
        version: 1,
        type: 'telemetry',
        sequence: null,
        joints: [0, 1, 2],
        voltage: null,
        temperatures: [],
        estopped: false,
        faults: []
      }
    })
  })

  test('rejects malformed, unknown, and incompatible messages', () => {
    expect(parseRobotMessage('booting...').ok).toBe(false)
    expect(parseRobotMessage(JSON.stringify({ version: 2, type: 'hello' })).ok).toBe(false)
    expect(parseRobotMessage(JSON.stringify({ version: 1, type: 'mystery' })).ok).toBe(false)
  })

  test('rejects non-finite telemetry values', () => {
    const result = parseRobotMessage(
      JSON.stringify({ version: 1, type: 'telemetry', joints: [0, 'not-a-number', 2] })
    )

    expect(result.ok).toBe(false)
  })
})
