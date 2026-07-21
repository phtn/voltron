import { serializeRobotMessage, type RobotClientMessage } from './protocol'

const MAX_LINE_BUFFER_LENGTH = 64 * 1024

export class SerialLineBuffer {
  private value = ''

  push(chunk: string) {
    this.value += chunk
    const lines: string[] = []
    let overflowed = false
    let consumedLength = 0
    let newlineIndex = this.value.indexOf('\n', consumedLength)
    while (newlineIndex >= 0) {
      const rawLine = this.value.slice(consumedLength, newlineIndex)
      consumedLength = newlineIndex + 1
      if (rawLine.length > MAX_LINE_BUFFER_LENGTH) {
        overflowed = true
      } else {
        const line = rawLine.trim()
        if (line) lines.push(line)
      }
      newlineIndex = this.value.indexOf('\n', consumedLength)
    }

    if (consumedLength > 0) this.value = this.value.slice(consumedLength)
    if (this.value.length > MAX_LINE_BUFFER_LENGTH) {
      this.value = ''
      overflowed = true
    }
    return { lines, overflowed }
  }

  clear() {
    this.value = ''
  }
}

type WebSerialPortInfo = {
  usbVendorId?: number
  usbProductId?: number
}

type WebSerialPort = {
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  open: (options: { baudRate: number; bufferSize?: number }) => Promise<void>
  close: () => Promise<void>
  getInfo: () => WebSerialPortInfo
}

type WebSerialApi = {
  requestPort: () => Promise<WebSerialPort>
}

type SerialNavigator = Navigator & {
  serial?: WebSerialApi
}

export type SerialDeviceIdentity = {
  usbVendorId: number | null
  usbProductId: number | null
}

type WebSerialTransportCallbacks = {
  onLine: (line: string) => void
  onDisconnect: () => void
  onError: (error: Error) => void
}

function serialApi() {
  if (typeof navigator === 'undefined') return null
  return (navigator as SerialNavigator).serial ?? null
}

function asError(value: unknown) {
  return value instanceof Error ? value : new Error(String(value))
}

export function isWebSerialSupported() {
  return serialApi() !== null
}

export class WebSerialTransport {
  private port: WebSerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private readTask: Promise<void> | null = null
  private writeQueue: Promise<void> = Promise.resolve()
  private closing = false
  private readonly decoder = new TextDecoder()
  private readonly encoder = new TextEncoder()
  private readonly lineBuffer = new SerialLineBuffer()

  constructor(private readonly callbacks: WebSerialTransportCallbacks) {}

  async connect(baudRate = 115_200): Promise<SerialDeviceIdentity> {
    const serial = serialApi()
    if (!serial) throw new Error('Web Serial is not supported by this browser.')
    if (this.port) throw new Error('A serial device is already connected.')

    const port = await serial.requestPort()
    await port.open({ baudRate, bufferSize: 64 * 1024 })
    if (!port.readable || !port.writable) {
      await port.close()
      throw new Error('The selected serial port did not expose readable and writable streams.')
    }

    this.port = port
    this.closing = false
    this.writer = port.writable.getWriter()
    this.readTask = this.readLoop(port.readable)

    const info = port.getInfo()
    return {
      usbVendorId: info.usbVendorId ?? null,
      usbProductId: info.usbProductId ?? null
    }
  }

  async send(message: RobotClientMessage) {
    const writer = this.writer
    if (!writer || !this.port) throw new Error('The ESP32 serial port is not connected.')
    const payload = this.encoder.encode(serializeRobotMessage(message))
    const write = this.writeQueue.catch(() => undefined).then(() => writer.write(payload))
    this.writeQueue = write
    await write
  }

  async disconnect() {
    if (!this.port && !this.readTask) return
    this.closing = true

    try {
      await this.reader?.cancel()
    } catch {
      // A removed USB device may reject cancellation; cleanup still continues.
    }

    try {
      await this.readTask
    } catch {
      // The read loop reports unexpected errors through the callback.
    }

    try {
      this.writer?.releaseLock()
    } catch {
      // The stream may already be detached after a physical disconnect.
    }

    try {
      await this.port?.close()
    } catch {
      // Closing an unplugged device can reject on some platforms.
    }

    this.reader = null
    this.writer = null
    this.port = null
    this.readTask = null
    this.lineBuffer.clear()
    this.closing = false
  }

  private async readLoop(readable: ReadableStream<Uint8Array>) {
    const reader = readable.getReader()
    this.reader = reader

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) this.consumeChunk(this.decoder.decode(value, { stream: true }))
      }
    } catch (error) {
      if (!this.closing) this.callbacks.onError(asError(error))
    } finally {
      try {
        reader.releaseLock()
      } catch {
        // The reader may already be released after device removal.
      }
      if (this.reader === reader) this.reader = null
      if (!this.closing) this.callbacks.onDisconnect()
    }
  }

  private consumeChunk(chunk: string) {
    const { lines, overflowed } = this.lineBuffer.push(chunk)
    if (overflowed) {
      this.callbacks.onError(new Error('ESP32 sent a serial line larger than 64 KiB.'))
      return
    }
    for (const line of lines) this.callbacks.onLine(line)
  }
}
