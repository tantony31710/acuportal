import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshWobbleMaterial, Trail } from '@react-three/drei'
import * as THREE from 'three'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrbProps {
  presentCount: number
  absentCount: number
  totalCount: number
}

// ─── Colour helper ────────────────────────────────────────────────────────────
function attendanceColor(pct: number): THREE.Color {
  if (pct >= 75) return new THREE.Color('#22c55e')
  if (pct >= 50) return new THREE.Color('#f59e0b')
  return new THREE.Color('#ef4444')
}

// ─── Central glowing orb ─────────────────────────────────────────────────────
function CentralOrb({ color }: { color: THREE.Color }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const t = useRef(0)

  useFrame((_, delta) => {
    t.current += delta
    if (meshRef.current) {
      const pulse = 1 + 0.08 * Math.sin(t.current * 1.6)
      meshRef.current.scale.setScalar(pulse)
      meshRef.current.rotation.y += delta * 0.35
      meshRef.current.rotation.x += delta * 0.08
    }
    if (innerRef.current) {
      // counter-rotate inner glow for a lensing effect
      innerRef.current.rotation.y -= delta * 0.25
    }
  })

  return (
    <group>
      {/* Inner solid core */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.72, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.1}
          roughness={0.05}
          metalness={0.7}
        />
      </mesh>

      {/* Outer wobble shell */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.08, 64, 64]} />
        {/* @ts-expect-error MeshWobbleMaterial from drei */}
        <MeshWobbleMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.45}
          factor={0.12}
          speed={1.5}
          roughness={0.1}
          metalness={0.25}
          transparent
          opacity={0.82}
        />
      </mesh>
    </group>
  )
}

// ─── Orbit rings ──────────────────────────────────────────────────────────────
function OrbitRings({ color }: { color: THREE.Color }) {
  const ring1 = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const ring3 = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (ring1.current) ring1.current.rotation.z += delta * 0.45
    if (ring2.current) ring2.current.rotation.x += delta * 0.32
    if (ring3.current) { ring3.current.rotation.y += delta * 0.22; ring3.current.rotation.z += delta * 0.15 }
  })

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    [color]
  )

  return (
    <group>
      <mesh ref={ring1} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.012, 12, 100]} />
        <primitive object={ringMat} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[1.78, 0.008, 12, 100]} />
        <primitive object={ringMat} />
      </mesh>
      <mesh ref={ring3} rotation={[Math.PI / 6, Math.PI / 3, Math.PI / 5]}>
        <torusGeometry args={[2.05, 0.005, 8, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

// ─── Particle system ─────────────────────────────────────────────────────────
interface Particle {
  position: THREE.Vector3
  phase: number
  radius: number
  speed: number
  isAbsent: boolean
  driftSpeed: number
  driftPhase: number
  orbitTilt: number
}

function Particles({ presentCount, absentCount }: { presentCount: number; absentCount: number }) {
  const particles = useMemo<Particle[]>(() => {
    const cap = 90
    const pCap = Math.min(presentCount, Math.round(cap * 0.75))
    const aCap = Math.min(absentCount, Math.round(cap * 0.25))
    const list: Particle[] = []

    for (let i = 0; i < pCap; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.65 + Math.random() * 0.75
      list.push({
        position: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ),
        phase: Math.random() * Math.PI * 2,
        radius: r,
        speed: 0.4 + Math.random() * 0.3,
        isAbsent: false,
        driftSpeed: 0,
        driftPhase: 0,
        orbitTilt: (Math.random() - 0.5) * 0.8,
      })
    }

    for (let i = 0; i < aCap; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 2.0 + Math.random() * 1.0
      list.push({
        position: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ),
        phase: Math.random() * Math.PI * 2,
        radius: r,
        speed: 0.08 + Math.random() * 0.1,
        isAbsent: true,
        driftSpeed: 0.04 + Math.random() * 0.035,
        driftPhase: Math.random() * Math.PI * 2,
        orbitTilt: (Math.random() - 0.5) * 1.2,
      })
    }

    return list
  }, [presentCount, absentCount])

  const presentMeshRef = useRef<THREE.InstancedMesh>(null)
  const absentMeshRef = useRef<THREE.InstancedMesh>(null)
  const presentParticles = useMemo(() => particles.filter(p => !p.isAbsent), [particles])
  const absentParticles = useMemo(() => particles.filter(p => p.isAbsent), [particles])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const t = useRef(0)

  useFrame((_, delta) => {
    t.current += delta

    if (presentMeshRef.current) {
      presentParticles.forEach((p, i) => {
        const angle = t.current * p.speed + p.phase
        dummy.position.set(
          p.radius * Math.cos(angle),
          p.position.y * 0.6 + 0.35 * Math.sin(t.current * 0.8 + p.phase + p.orbitTilt),
          p.radius * Math.sin(angle),
        )
        dummy.updateMatrix()
        presentMeshRef.current!.setMatrixAt(i, dummy.matrix)
      })
      presentMeshRef.current.instanceMatrix.needsUpdate = true
    }

    if (absentMeshRef.current) {
      absentParticles.forEach((p, i) => {
        const drift = 1 + 0.28 * Math.sin(t.current * p.driftSpeed + p.driftPhase)
        const angle = t.current * p.speed + p.phase
        dummy.position.set(
          p.radius * drift * Math.cos(angle),
          p.position.y * drift,
          p.radius * drift * Math.sin(angle),
        )
        dummy.updateMatrix()
        absentMeshRef.current!.setMatrixAt(i, dummy.matrix)
      })
      absentMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {presentParticles.length > 0 && (
        <instancedMesh ref={presentMeshRef} args={[undefined, undefined, presentParticles.length]}>
          <sphereGeometry args={[0.048, 8, 8]} />
          <meshStandardMaterial
            color="#e0f2fe"
            emissive="#7dd3fc"
            emissiveIntensity={1.2}
          />
        </instancedMesh>
      )}
      {absentParticles.length > 0 && (
        <instancedMesh ref={absentMeshRef} args={[undefined, undefined, absentParticles.length]}>
          <sphereGeometry args={[0.042, 8, 8]} />
          <meshStandardMaterial
            color="#7f1d1d"
            emissive="#ef4444"
            emissiveIntensity={0.4}
            transparent
            opacity={0.55}
          />
        </instancedMesh>
      )}
    </group>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function OrbScene({ presentCount, absentCount, totalCount }: OrbProps) {
  const sceneRef = useRef<THREE.Group>(null)
  const pct = totalCount > 0 ? (presentCount / totalCount) * 100 : 0
  const color = attendanceColor(pct)

  useFrame((_, delta) => {
    if (sceneRef.current) {
      sceneRef.current.rotation.y += delta * 0.18
    }
  })

  return (
    <group ref={sceneRef}>
      {/* Outer atmosphere halo */}
      <mesh>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>

      {/* Mid glow */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>

      <CentralOrb color={color} />
      <OrbitRings color={color} />
      <Particles presentCount={presentCount} absentCount={absentCount} />
    </group>
  )
}

// ─── WebGL check ─────────────────────────────────────────────────────────────
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

// ─── Fallback ─────────────────────────────────────────────────────────────────
function OrbFallback({ presentCount, totalCount }: { presentCount: number; totalCount: number }) {
  const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex h-[300px] items-center justify-center">
      <div
        className="flex h-28 w-28 items-center justify-center rounded-full text-2xl font-extrabold text-white shadow-lg"
        style={{ background: color, boxShadow: `0 0 50px 12px ${color}55` }}
      >
        {pct}%
      </div>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function AttendanceOrb3D({ presentCount, absentCount, totalCount }: OrbProps) {
  if (typeof window === 'undefined' || !isWebGLAvailable()) {
    return <OrbFallback presentCount={presentCount} totalCount={totalCount} />
  }

  return (
    <div style={{ height: 320 }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 48 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.55} />
        <pointLight position={[5, 5, 5]} intensity={1.4} />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color="#60a5fa" />
        <pointLight position={[0, 6, -3]} intensity={0.3} color="#34d399" />
        <Suspense fallback={null}>
          <OrbScene
            presentCount={presentCount}
            absentCount={absentCount}
            totalCount={totalCount}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
