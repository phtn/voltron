# ESP32 serial protocol

The first hardware transport is USB serial at **115200 baud, 8 data bits, no parity, and 1 stop bit**. A classic ESP32 development board appears to the browser through its USB-to-UART bridge.

The browser and ESP32 exchange newline-delimited JSON. Every object must fit on one line and use protocol version `1`. The app rejects lines larger than 64 KiB and ignores boot logs or malformed lines.

## Connection sequence

1. The user clicks **Connect ESP32** and grants serial-port access.
2. The browser opens the selected port and sends:

```json
{"version":1,"type":"hello","client":"voltron-i","jointCount":7}
```

3. Within four seconds, the ESP32 responds:

```json
{"version":1,"type":"hello","device":"voltron-esp32","firmware":"0.1.0","jointCount":7,"capabilities":["telemetry"]}
```

The app marks the controller online only after this response. A mismatched protocol or joint count fails the handshake.

## Heartbeat

Once connected, the browser sends one ping per second:

```json
{"version":1,"type":"ping","sequence":12,"sentAt":1730000000000}
```

The ESP32 should respond promptly:

```json
{"version":1,"type":"pong","sequence":12}
```

If no valid message arrives for 4.5 seconds, the app marks the connection unhealthy and disables future motion commands.

## Telemetry

The ESP32 may publish telemetry up to 20 times per second:

```json
{"version":1,"type":"telemetry","sequence":42,"joints":[0,0,0,0,0,0,0],"voltage":24.1,"temperatures":[31.2,32.0,31.8,30.5,29.9,29.7,29.4],"estopped":false,"faults":[]}
```

Joint angles use degrees. Voltage and temperatures are optional. Telemetry must always contain seven finite joint values.

## Reserved motion messages

The protocol reserves `set_pose`, `estop`, `ack`, and `fault` messages. The current app does not emit motor commands yet. They will be enabled only after the firmware implements validation, acknowledgements, joint limits, a communications watchdog, and a hardware-backed emergency-stop path.

The browser emergency-stop control is not a substitute for a physical, hardwired emergency stop.
