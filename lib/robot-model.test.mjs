import { describe, expect, test } from 'bun:test'

const MODEL_URL = new URL('../components/models/kuma_heavy_robot_r-9000s.glb', import.meta.url)
const REQUIRED_RIG_NODES = [
  'Base_00',
  'Shoulder_01',
  'Core_02',
  'ArmLong_05',
  'ArmShort_07',
  'ArmShorter_08',
  'ArmShortest_09',
  'ArmShortest_end_010'
]

async function readGlb() {
  const buffer = await Bun.file(MODEL_URL).arrayBuffer()
  const view = new DataView(buffer)
  expect(view.getUint32(0, true)).toBe(0x46546c67)
  expect(view.getUint32(4, true)).toBe(2)

  const jsonLength = view.getUint32(12, true)
  expect(view.getUint32(16, true)).toBe(0x4e4f534a)
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)))
  return { buffer, json }
}

describe('optimized robot model', () => {
  test('stays below the transfer-size budget', async () => {
    const { buffer, json } = await readGlb()
    const imageBytes = json.images.reduce(
      (total, image) => total + json.bufferViews[image.bufferView].byteLength,
      0
    )

    expect(buffer.byteLength).toBeLessThan(5_000_000)
    expect(imageBytes).toBeLessThan(3_000_000)
    expect(json.images).toHaveLength(5)
  })

  test('preserves the animated seven-axis rig', async () => {
    const { json } = await readGlb()
    const nodeNames = new Set(json.nodes.map((node) => node.name))

    for (const nodeName of REQUIRED_RIG_NODES) expect(nodeNames.has(nodeName)).toBe(true)
    const toolTipIndex = json.nodes.findIndex((node) => node.name === 'ArmShortest_end_010')
    const toolJoint = json.nodes.find((node) => node.name === 'ArmShortest_09')
    expect(toolJoint.children).toContain(toolTipIndex)
    expect(json.nodes[toolTipIndex].translation[1]).toBeGreaterThan(0)
    expect(json.meshes).toHaveLength(2)
    expect(json.animations).toHaveLength(1)
  })
})
