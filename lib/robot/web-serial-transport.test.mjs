import { describe, expect, test } from 'bun:test'
import { SerialLineBuffer } from './web-serial-transport'

describe('SerialLineBuffer', () => {
  test('reassembles fragmented serial messages', () => {
    const buffer = new SerialLineBuffer()

    expect(buffer.push('{"type":"hel').lines).toEqual([])
    expect(buffer.push('lo"}\n').lines).toEqual(['{"type":"hello"}'])
  })

  test('extracts multiple CRLF-delimited messages and ignores blank lines', () => {
    const buffer = new SerialLineBuffer()
    const result = buffer.push('\r\n{"type":"pong"}\r\n{"type":"telemetry"}\n')

    expect(result.lines).toEqual(['{"type":"pong"}', '{"type":"telemetry"}'])
    expect(result.overflowed).toBe(false)
  })

  test('drops an oversized unterminated line and recovers', () => {
    const buffer = new SerialLineBuffer()

    expect(buffer.push('x'.repeat(64 * 1024 + 1)).overflowed).toBe(true)
    expect(buffer.push('{"type":"hello"}\n').lines).toEqual(['{"type":"hello"}'])
  })

  test('accepts a large chunk when each individual line stays bounded', () => {
    const buffer = new SerialLineBuffer()
    const message = '{"type":"pong"}\n'
    const result = buffer.push(message.repeat(5_000))

    expect(result.overflowed).toBe(false)
    expect(result.lines).toHaveLength(5_000)
  })
})
