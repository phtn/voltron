'use client'

import {
  ROBOT_JOINT_COUNT,
  createClientHello,
  createPing,
  parseRobotMessage,
  type RobotDeviceInfo,
  type RobotTelemetry
} from '@/lib/robot/protocol'
import {
  WebSerialTransport,
  isWebSerialSupported,
  type SerialDeviceIdentity
} from '@/lib/robot/web-serial-transport'
import { useCallback, useEffect, useRef, useState } from 'react'

const HANDSHAKE_TIMEOUT_MS = 4_000
const HEARTBEAT_INTERVAL_MS = 1_000
const HEARTBEAT_TIMEOUT_MS = 4_500

export type RobotConnectionStatus =
  | 'unsupported'
  | 'disconnected'
  | 'requesting'
  | 'handshaking'
  | 'ready'
  | 'error'

export type RobotConnectResult =
  | { ok: true; device: RobotDeviceInfo; serial: SerialDeviceIdentity }
  | { ok: false; cancelled: boolean; error: string }

type PendingHandshake = {
  resolve: (device: RobotDeviceInfo) => void
  reject: (error: Error) => void
}

type RobotConnectionOptions = {
  onTelemetry?: (telemetry: RobotTelemetry) => void
}

function asError(value: unknown) {
  return value instanceof Error ? value : new Error(String(value))
}

function cancellationError(message: string) {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

function connectionErrorMessage(error: Error) {
  if (error.name === 'SecurityError') {
    return 'Serial access was blocked. Use desktop Chrome or Edge on localhost or HTTPS.'
  }
  if (error.name === 'InvalidStateError') return 'The selected serial port is already open in another application.'
  return error.message || 'Unable to connect to the ESP32.'
}

export function useRobotConnection({ onTelemetry }: RobotConnectionOptions = {}) {
  const [status, setStatus] = useState<RobotConnectionStatus>('disconnected')
  const [device, setDevice] = useState<RobotDeviceInfo | null>(null)
  const [serialIdentity, setSerialIdentity] = useState<SerialDeviceIdentity | null>(null)
  const [telemetry, setTelemetry] = useState<RobotTelemetry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fault, setFault] = useState<string | null>(null)
  const transportRef = useRef<WebSerialTransport | null>(null)
  const handshakeRef = useRef<PendingHandshake | null>(null)
  const handshakeTimerRef = useRef<number | null>(null)
  const heartbeatTimerRef = useRef<number | null>(null)
  const lastMessageAtRef = useRef(0)
  const pingSequenceRef = useRef(0)
  const manualDisconnectRef = useRef(false)
  const disposedRef = useRef(false)
  const onTelemetryRef = useRef(onTelemetry)

  const clearTimers = useCallback(() => {
    if (handshakeTimerRef.current !== null) window.clearTimeout(handshakeTimerRef.current)
    if (heartbeatTimerRef.current !== null) window.clearInterval(heartbeatTimerRef.current)
    handshakeTimerRef.current = null
    heartbeatTimerRef.current = null
  }, [])

  useEffect(() => {
    onTelemetryRef.current = onTelemetry
  }, [onTelemetry])

  const handleLine = useCallback((line: string) => {
    const parsed = parseRobotMessage(line)
    if (!parsed.ok) return
    lastMessageAtRef.current = Date.now()

    const message = parsed.message
    if (message.type === 'hello') {
      if (message.jointCount !== ROBOT_JOINT_COUNT) {
        handshakeRef.current?.reject(
          new Error(`ESP32 reports ${message.jointCount} joints; this project expects ${ROBOT_JOINT_COUNT}.`)
        )
        handshakeRef.current = null
        return
      }

      const nextDevice = {
        name: message.device,
        firmware: message.firmware,
        jointCount: message.jointCount,
        capabilities: message.capabilities
      }
      setDevice(nextDevice)
      handshakeRef.current?.resolve(nextDevice)
      handshakeRef.current = null
      return
    }

    if (message.type === 'telemetry') {
      if (message.joints.length !== ROBOT_JOINT_COUNT) return
      const nextTelemetry = {
        sequence: message.sequence,
        joints: message.joints,
        voltage: message.voltage,
        temperatures: message.temperatures,
        estopped: message.estopped,
        faults: message.faults,
        receivedAt: Date.now()
      }
      setTelemetry(nextTelemetry)
      onTelemetryRef.current?.(nextTelemetry)
      setFault(message.faults.length > 0 ? message.faults.join(', ') : null)
      return
    }

    if (message.type === 'fault') setFault(`${message.code}: ${message.message}`)
  }, [])

  const handleUnexpectedDisconnect = useCallback(() => {
    clearTimers()
    const transport = transportRef.current
    transportRef.current = null
    handshakeRef.current?.reject(new Error('ESP32 disconnected during handshake.'))
    handshakeRef.current = null
    setDevice(null)
    setSerialIdentity(null)
    setTelemetry(null)
    void transport?.disconnect()
    if (manualDisconnectRef.current) return
    setStatus('error')
    setError('ESP32 disconnected unexpectedly.')
  }, [clearTimers])

  const handleTransportError = useCallback((transportError: Error) => {
    setError(transportError.message)
  }, [])

  const startHeartbeat = useCallback(
    (transport: WebSerialTransport) => {
      heartbeatTimerRef.current = window.setInterval(() => {
        if (Date.now() - lastMessageAtRef.current > HEARTBEAT_TIMEOUT_MS) {
          clearTimers()
          setStatus('error')
          setError('ESP32 heartbeat timed out. Motion commands remain disabled.')
          if (transportRef.current === transport) transportRef.current = null
          setDevice(null)
          setSerialIdentity(null)
          setTelemetry(null)
          void transport.disconnect()
          return
        }

        pingSequenceRef.current += 1
        void transport.send(createPing(pingSequenceRef.current)).catch((sendError: unknown) => {
          setError(connectionErrorMessage(asError(sendError)))
        })
      }, HEARTBEAT_INTERVAL_MS)
    },
    [clearTimers]
  )

  const connect = useCallback(async (): Promise<RobotConnectResult> => {
    if (!isWebSerialSupported()) {
      const unsupportedError = 'Web Serial is unavailable. Use desktop Chrome or Edge for USB connection.'
      setStatus('unsupported')
      setError(unsupportedError)
      return { ok: false, cancelled: false, error: unsupportedError }
    }
    if (transportRef.current) {
      const activeError = 'A robot connection is already active.'
      return { ok: false, cancelled: false, error: activeError }
    }

    clearTimers()
    setStatus('requesting')
    setError(null)
    setFault(null)
    setTelemetry(null)

    let resolveHandshake: PendingHandshake['resolve'] = () => undefined
    let rejectHandshake: PendingHandshake['reject'] = () => undefined
    const handshake = new Promise<RobotDeviceInfo>((resolve, reject) => {
      resolveHandshake = resolve
      rejectHandshake = reject
    })
    handshakeRef.current = { resolve: resolveHandshake, reject: rejectHandshake }

    const transport = new WebSerialTransport({
      onLine: handleLine,
      onDisconnect: handleUnexpectedDisconnect,
      onError: handleTransportError
    })
    transportRef.current = transport

    try {
      const serial = await transport.connect()
      if (disposedRef.current || transportRef.current !== transport) {
        await transport.disconnect()
        throw cancellationError('Connection cancelled.')
      }
      setSerialIdentity(serial)
      setStatus('handshaking')
      lastMessageAtRef.current = Date.now()
      handshakeTimerRef.current = window.setTimeout(() => {
        handshakeRef.current?.reject(
          new Error('The serial port opened, but the ESP32 did not complete the Voltron v1 handshake.')
        )
        handshakeRef.current = null
      }, HANDSHAKE_TIMEOUT_MS)

      await transport.send(createClientHello())
      const connectedDevice = await handshake
      if (disposedRef.current || transportRef.current !== transport) {
        await transport.disconnect()
        throw cancellationError('Connection cancelled.')
      }
      if (handshakeTimerRef.current !== null) window.clearTimeout(handshakeTimerRef.current)
      handshakeTimerRef.current = null
      setStatus('ready')
      setError(null)
      startHeartbeat(transport)
      return { ok: true, device: connectedDevice, serial }
    } catch (connectionError) {
      const normalizedError = asError(connectionError)
      const cancelled = normalizedError.name === 'NotFoundError' || normalizedError.name === 'AbortError'
      const message = cancelled ? 'ESP32 selection was cancelled.' : connectionErrorMessage(normalizedError)
      clearTimers()
      handshakeRef.current = null
      manualDisconnectRef.current = true
      if (transportRef.current === transport) transportRef.current = null
      await transport.disconnect()
      manualDisconnectRef.current = false
      if (!disposedRef.current) {
        setSerialIdentity(null)
        setDevice(null)
        setStatus(cancelled ? 'disconnected' : 'error')
        setError(cancelled ? null : message)
      }
      return { ok: false, cancelled, error: message }
    }
  }, [clearTimers, handleLine, handleTransportError, handleUnexpectedDisconnect, startHeartbeat])

  const disconnect = useCallback(async () => {
    clearTimers()
    handshakeRef.current?.reject(new Error('Connection cancelled.'))
    handshakeRef.current = null
    const transport = transportRef.current
    transportRef.current = null
    manualDisconnectRef.current = true
    await transport?.disconnect()
    manualDisconnectRef.current = false
    setStatus(isWebSerialSupported() ? 'disconnected' : 'unsupported')
    setDevice(null)
    setSerialIdentity(null)
    setTelemetry(null)
    setError(null)
    setFault(null)
  }, [clearTimers])

  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      clearTimers()
      manualDisconnectRef.current = true
      handshakeRef.current?.reject(cancellationError('Connection cancelled.'))
      handshakeRef.current = null
      const transport = transportRef.current
      transportRef.current = null
      void transport?.disconnect()
    }
  }, [clearTimers])

  return {
    status,
    connected: status === 'ready',
    connecting: status === 'requesting' || status === 'handshaking',
    device,
    serialIdentity,
    telemetry,
    error,
    fault,
    connect,
    disconnect
  }
}
