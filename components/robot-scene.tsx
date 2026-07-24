'use client'

import type { SceneBackground } from '@/types'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type JointValue = { value: number; home?: number }

type RobotSceneProps = {
  background: SceneBackground
  laserEnabled: boolean
  joints: JointValue[]
  view: string
  activeJoint: number
}

type RigBinding = {
  jointIndex: number
  bone: THREE.Object3D
  base: THREE.Quaternion
  axis: THREE.Vector3
}

const MODEL_URL = '/api/robot-model?v=6a583198fedf'
// The terminal node is an authored bone-tail marker beyond the visible tool.
// Emit from the final tool bone and use its child only to derive forward.
const TOOL_EMITTER_NODE = 'ArmShortest_09'
const TOOL_DIRECTION_NODE = 'ArmShortest_end_010'
const LASER_MAX_DISTANCE = 7.5
// These are the seven bones with non-static quaternion tracks in the supplied
// GLB. The intervening Core.001_03, Motor_04, and ArmLong_2_06 nodes are spacer
// bones, not independent controls. Fallback axes were extracted from the same
// animation and are only used if a quaternion track cannot be found.
const JOINT_SPECS = [
  { name: 'Base_00', fallbackAxis: new THREE.Vector3(0, 1, 0) },
  { name: 'Shoulder_01', fallbackAxis: new THREE.Vector3(-0.205, -0.978, 0.043) },
  { name: 'Core_02', fallbackAxis: new THREE.Vector3(-0.008, -1, 0.021) },
  { name: 'ArmLong_05', fallbackAxis: new THREE.Vector3(-0.004, -1, 0.001) },
  { name: 'ArmShort_07', fallbackAxis: new THREE.Vector3(0.994, -0.078, -0.075) },
  { name: 'ArmShorter_08', fallbackAxis: new THREE.Vector3(-1, 0, 0) },
  { name: 'ArmShortest_09', fallbackAxis: new THREE.Vector3(-1, 0, 0) }
] as const

const VIEW_POSITIONS: Record<string, THREE.Vector3> = {
  Orbit: new THREE.Vector3(6.6, 4.4, 7.3),
  Front: new THREE.Vector3(0, 3.4, 9.6),
  Top: new THREE.Vector3(0.01, 10.5, 0.01)
}

const SCENE_THEMES = {
  dark: {
    background: 0x222524,
    exposure: 1.15,
    fillIntensity: 35,
    floor: 0x242725,
    fogDensity: 0.055,
    gridOpacity: 0.38,
    hemisphereGround: 0x1c201d,
    hemisphereIntensity: 2.1,
    hemisphereSky: 0xe9eee7
  },
  light: {
    background: 0xe9ebe8,
    exposure: 1.05,
    fillIntensity: 24,
    floor: 0xdde0db,
    fogDensity: 0.045,
    gridOpacity: 0.3,
    hemisphereGround: 0x929a93,
    hemisphereIntensity: 2,
    hemisphereSky: 0xffffff
  }
} as const satisfies Record<SceneBackground, Record<string, number>>

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose()
  }
  material.dispose()
}

function applyJointValues(rig: RigBinding[], joints: JointValue[]) {
  const offset = new THREE.Quaternion()
  rig.forEach((binding) => {
    const joint = joints[binding.jointIndex]
    const angle = THREE.MathUtils.degToRad((joint?.value ?? 0) - (joint?.home ?? 0))
    offset.setFromAxisAngle(binding.axis, angle)
    binding.bone.quaternion.copy(binding.base).multiply(offset)
  })
}

function deriveAuthoredAxis(bone: THREE.Object3D, animations: THREE.AnimationClip[], fallbackAxis: THREE.Vector3) {
  const quaternionTrack = animations
    .flatMap((clip) => clip.tracks)
    .find((track) => track.name.includes(bone.name) && track.name.endsWith('.quaternion'))

  if (!quaternionTrack) return fallbackAxis.clone().normalize()

  const base = bone.quaternion.clone().normalize()
  const inverseBase = base.clone().invert()
  const sample = new THREE.Quaternion()
  const delta = new THREE.Quaternion()
  const bestAxis = fallbackAxis.clone().normalize()
  let bestAngle = 0

  for (let offset = 0; offset < quaternionTrack.values.length; offset += 4) {
    sample.fromArray(quaternionTrack.values, offset).normalize()
    if (sample.dot(base) < 0) sample.set(-sample.x, -sample.y, -sample.z, -sample.w)
    delta.copy(inverseBase).multiply(sample).normalize()
    const angle = 2 * Math.acos(THREE.MathUtils.clamp(delta.w, -1, 1))
    const sinHalfAngle = Math.sqrt(Math.max(0, 1 - delta.w * delta.w))
    if (angle > bestAngle && sinHalfAngle > 0.0001) {
      bestAngle = angle
      bestAxis.set(delta.x / sinHalfAngle, delta.y / sinHalfAngle, delta.z / sinHalfAngle).normalize()
    }
  }

  return bestAxis
}

export default function RobotScene({ background, laserEnabled, joints, view, activeJoint }: RobotSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<RigBinding[]>([])
  const jointsRef = useRef(joints)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const activeJointRef = useRef(activeJoint)
  const backgroundRef = useRef(background)
  const laserEnabledRef = useRef(laserEnabled)
  const applyBackgroundRef = useRef<((background: SceneBackground) => void) | null>(null)
  const renderRef = useRef<(() => void) | null>(null)
  const [loadProgress, setLoadProgress] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let disposed = false
    const initialTheme = SCENE_THEMES[backgroundRef.current]
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(initialTheme.background)
    scene.fog = new THREE.FogExp2(initialTheme.background, initialTheme.fogDensity)

    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100)
    camera.position.copy(VIEW_POSITIONS.Orbit)
    cameraRef.current = camera

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      window.queueMicrotask(() => setStatus('error'))
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = initialTheme.exposure
    renderer.domElement.className = 'three-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    mount.prepend(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false
    controls.enablePan = false
    controls.minDistance = 5.2
    controls.maxDistance = 14
    controls.minPolarAngle = 0.08
    controls.maxPolarAngle = Math.PI / 2.04
    controls.target.set(0, 2.15, 0)
    controls.update()
    controlsRef.current = controls

    const hemisphere = new THREE.HemisphereLight(
      initialTheme.hemisphereSky,
      initialTheme.hemisphereGround,
      initialTheme.hemisphereIntensity
    )
    scene.add(hemisphere)

    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2)
    keyLight.position.set(5, 8, 6)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.left = -5
    keyLight.shadow.camera.right = 5
    keyLight.shadow.camera.top = 7
    keyLight.shadow.camera.bottom = -2
    keyLight.shadow.bias = -0.0004
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0xef5a34, 2.4)
    rimLight.position.set(-5, 4, -4)
    scene.add(rimLight)

    const fillLight = new THREE.PointLight(0x9fb7c0, initialTheme.fillIntensity, 12)
    fillLight.position.set(2, 2.5, 4)
    scene.add(fillLight)

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: initialTheme.floor,
      metalness: 0.15,
      roughness: 0.86
    })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.015
    floor.receiveShadow = true
    scene.add(floor)

    const laserVisual = new THREE.Group()
    laserVisual.visible = false
    const laserBeam = new THREE.Group()
    const laserCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 1, 8),
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: 0xff241a,
        depthTest: false,
        depthWrite: false,
        opacity: 0.95,
        toneMapped: false,
        transparent: true
      })
    )
    laserCore.position.y = 0.5
    laserCore.renderOrder = 8
    laserBeam.add(laserCore)
    const laserGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 1, 8),
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: 0xff0000,
        depthTest: false,
        depthWrite: false,
        opacity: 0.16,
        toneMapped: false,
        transparent: true
      })
    )
    laserGlow.position.y = 0.5
    laserGlow.renderOrder = 7
    laserBeam.add(laserGlow)
    laserVisual.add(laserBeam)
    const laserDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 12, 8),
      new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: 0xff2018,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      })
    )
    laserDot.renderOrder = 9
    laserVisual.add(laserDot)
    scene.add(laserVisual)

    const grid = new THREE.GridHelper(18, 36, 0x646a66, 0x393d3a)
    grid.position.y = 0.004
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    for (const material of gridMaterials) {
      material.transparent = true
      material.opacity = initialTheme.gridOpacity
    }
    scene.add(grid)

    const target = new THREE.Group()
    const targetMaterial = new THREE.MeshBasicMaterial({ color: 0xef5a34, transparent: true, opacity: 0.75 })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 8, 32), targetMaterial)
    ring.rotation.x = Math.PI / 2
    target.add(ring)
    const crossGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.45, 0, 0),
      new THREE.Vector3(0.45, 0, 0),
      new THREE.Vector3(0, 0, -0.45),
      new THREE.Vector3(0, 0, 0.45)
    ])
    target.add(
      new THREE.LineSegments(
        crossGeometry,
        new THREE.LineBasicMaterial({ color: 0xef5a34, transparent: true, opacity: 0.5 })
      )
    )
    target.position.set(2.1, 0.025, 0.7)
    scene.add(target)

    const jointMarker = new THREE.Group()
    const jointMarkerMaterial = new THREE.MeshBasicMaterial({
      color: 0xef5a34,
      depthTest: false,
      transparent: true,
      opacity: 0.9
    })
    const jointRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.014, 8, 32), jointMarkerMaterial)
    jointRing.renderOrder = 10
    jointMarker.add(jointRing)
    const jointAxis = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.36), new THREE.Vector3(0, 0, 0.36)]),
      new THREE.LineBasicMaterial({ color: 0xef5a34, depthTest: false, transparent: true, opacity: 0.8 })
    )
    jointAxis.renderOrder = 10
    jointMarker.add(jointAxis)
    jointMarker.visible = false
    scene.add(jointMarker)

    const loader = new GLTFLoader()
    let toolEmitter: THREE.Object3D | null = null
    let toolDirectionMarker: THREE.Object3D | null = null
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return
        const modelRoot = gltf.scene
        modelRoot.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        modelRoot.updateMatrixWorld(true)
        const initialBounds = new THREE.Box3().setFromObject(modelRoot)
        const initialSize = initialBounds.getSize(new THREE.Vector3())
        const scale = 4.8 / Math.max(initialSize.x, initialSize.y, initialSize.z)
        modelRoot.scale.setScalar(scale)
        modelRoot.updateMatrixWorld(true)

        const bounds = new THREE.Box3().setFromObject(modelRoot)
        const center = bounds.getCenter(new THREE.Vector3())
        modelRoot.position.x -= center.x
        modelRoot.position.y -= bounds.min.y
        modelRoot.position.z -= center.z
        scene.add(modelRoot)
        modelRoot.updateMatrixWorld(true)

        rigRef.current = JOINT_SPECS.reduce<RigBinding[]>((bindings, spec, jointIndex) => {
          const bone = modelRoot.getObjectByName(spec.name)
          if (!bone) return bindings
          bindings.push({
            jointIndex,
            bone,
            base: bone.quaternion.clone(),
            axis: deriveAuthoredAxis(bone, gltf.animations, spec.fallbackAxis)
          })
          return bindings
        }, [])
        toolEmitter = modelRoot.getObjectByName(TOOL_EMITTER_NODE) ?? null
        toolDirectionMarker = modelRoot.getObjectByName(TOOL_DIRECTION_NODE) ?? null
        applyJointValues(rigRef.current, jointsRef.current)
        setLoadProgress(100)
        setStatus('ready')
        renderRef.current?.()
      },
      (event) => {
        if (!disposed && event.total > 0) setLoadProgress(Math.round((event.loaded / event.total) * 100))
      },
      () => {
        if (!disposed) setStatus('error')
      }
    )

    const LASER_EMITTER_OFFSET = new THREE.Vector3(4.5, 2.75, -0.1)
    const jointPosition = new THREE.Vector3()
    const jointWorldRotation = new THREE.Quaternion()
    const jointWorldAxis = new THREE.Vector3()
    const markerRotation = new THREE.Quaternion()
    const markerNormal = new THREE.Vector3(0, 0, 1)
    const laserOrigin = new THREE.Vector3()
    const laserDirection = new THREE.Vector3()
    const laserDirectionTarget = new THREE.Vector3()
    const laserUp = new THREE.Vector3(0, 1, 0)
    const laserRaycaster = new THREE.Raycaster()
    const laserIntersections: THREE.Intersection[] = []
    const renderScene = () => {
      if (disposed) return
      const selectedJoint = rigRef.current.find((binding) => binding.jointIndex === activeJointRef.current)
      if (selectedJoint) {
        selectedJoint.bone.getWorldPosition(jointPosition)
        selectedJoint.bone.getWorldQuaternion(jointWorldRotation)
        jointWorldAxis.copy(selectedJoint.axis).applyQuaternion(jointWorldRotation).normalize()
        markerRotation.setFromUnitVectors(markerNormal, jointWorldAxis)
        jointMarker.position.copy(jointPosition)
        jointMarker.quaternion.copy(markerRotation)
        jointMarker.visible = true
      } else {
        jointMarker.visible = false
      }

      laserVisual.visible = laserEnabledRef.current && toolEmitter !== null && toolDirectionMarker !== null
      if (laserVisual.visible && toolEmitter && toolDirectionMarker) {
        toolEmitter.getWorldPosition(laserOrigin)
        toolDirectionMarker.getWorldPosition(laserDirectionTarget)
        laserDirection.subVectors(laserDirectionTarget, laserOrigin).normalize()

        laserOrigin.copy(LASER_EMITTER_OFFSET)
        toolEmitter.localToWorld(laserOrigin)

        laserRaycaster.set(laserOrigin, laserDirection)
        laserRaycaster.far = LASER_MAX_DISTANCE
        laserIntersections.length = 0
        laserRaycaster.intersectObject(floor, false, laserIntersections)
        const floorHit = laserIntersections[0]
        const beamLength = floorHit?.distance ?? LASER_MAX_DISTANCE

        laserBeam.position.copy(laserOrigin)
        laserBeam.quaternion.setFromUnitVectors(laserUp, laserDirection)
        laserBeam.scale.set(1, beamLength, 1)
        laserDot.visible = Boolean(floorHit)
        if (floorHit) laserDot.position.copy(floorHit.point)
      }
      renderer.render(scene, camera)
    }

    applyBackgroundRef.current = (nextBackground) => {
      const theme = SCENE_THEMES[nextBackground]
      if (scene.background instanceof THREE.Color) scene.background.setHex(theme.background)
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(theme.background)
        scene.fog.density = theme.fogDensity
      }
      floorMaterial.color.setHex(theme.floor)
      hemisphere.color.setHex(theme.hemisphereSky)
      hemisphere.groundColor.setHex(theme.hemisphereGround)
      hemisphere.intensity = theme.hemisphereIntensity
      fillLight.intensity = theme.fillIntensity
      renderer.toneMappingExposure = theme.exposure
      for (const material of gridMaterials) material.opacity = theme.gridOpacity
      renderScene()
    }
    renderRef.current = renderScene
    controls.addEventListener('change', renderScene)

    const resize = () => {
      const { clientWidth, clientHeight } = mount
      if (!clientWidth || !clientHeight) return
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderScene()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    return () => {
      disposed = true
      resizeObserver.disconnect()
      controls.removeEventListener('change', renderScene)
      controls.dispose()
      rigRef.current = []
      cameraRef.current = null
      controlsRef.current = null
      applyBackgroundRef.current = null
      renderRef.current = null
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose()
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(disposeMaterial)
        }
      })
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    backgroundRef.current = background
    applyBackgroundRef.current?.(background)
  }, [background])

  useEffect(() => {
    laserEnabledRef.current = laserEnabled
    renderRef.current?.()
  }, [laserEnabled])

  useEffect(() => {
    jointsRef.current = joints
    applyJointValues(rigRef.current, joints)
    renderRef.current?.()
  }, [joints])

  useEffect(() => {
    activeJointRef.current = activeJoint
    renderRef.current?.()
  }, [activeJoint])

  useEffect(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    const position = VIEW_POSITIONS[view]
    if (!camera || !controls || !position) return
    camera.up.set(0, 1, 0)
    camera.position.copy(position)
    controls.target.set(0, 2.15, 0)
    controls.update()
    renderRef.current?.()
  }, [view])

  return (
    <div
      ref={mountRef}
      className={`scene-canvas three-scene scene-${background} ${laserEnabled ? 'laser-on' : ''}`}
      role='img'
      aria-label={`Interactive 3D model of the KUMA seven-articulation robot rig${laserEnabled ? ' with the simulated laser enabled' : ''}`}>
      <div className='scene-readout space-x-4'>
        <span>LIVE 3D</span>
        <a
          className='scene-credit-link whitespace-nowrap'
          href='https://sketchfab.com/3d-models/kuma-heavy-robot-r-9000s-8b77bdbe705f4e9697790fd404da49a9'
          target='_blank'
          rel='noreferrer'>
          KUMA R-9000S · Heinrich · CC BY-NC 4.0
        </a>
        <div className='scale'>
          <span>0</span>
          <i />
          <span>100 mm</span>
        </div>
      </div>
      <div></div>

      {status !== 'ready' ? (
        <div className={`model-loader ${status === 'error' ? 'error' : ''}`}>
          <span>{status === 'error' ? '3D model unavailable' : 'Loading digital twin'}</span>
          {status === 'loading' ? (
            <>
              <i>
                <b style={{ width: `${loadProgress}%` }} />
              </i>
              <small>{loadProgress}% · 4.8 MB</small>
            </>
          ) : (
            <small>Check WebGL and the model endpoint.</small>
          )}
        </div>
      ) : null}
    </div>
  )
}
