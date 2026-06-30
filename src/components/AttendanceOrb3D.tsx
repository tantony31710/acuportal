import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshWobbleMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrbProps {
  presentCount: number
  absentCount: number
  totalCount: number
}

// ─── Colour helper ────────────────────────────────────────────────────────────

function attendanceColor(pct: number): THREE.Color {
  // green ≥ 75 %  /  amber 50–74 %  /  red < 50 %
  if (pct >= 75) return new THREE.Color('#22c55e')   // emerald-500
  if (pct >= 50) return new THREE.Color('#f59e0b')   // amber-500
  return new THREE.Color('#ef4444')                  // red-500
}

// ─── Central glowing orb ─────────────────────────────────────────────────────

function CentralOrb({ color }: { color: THREE.Color }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const t = useRef(0)

  useFrame((_, delta) => {
    t.current += delta
    if (meshRef.current) {
      // Subtle pulsing scale: oscillates between 0.93 and 1.07
      const pulse = 1 + 0.07 * Math.sin(t.current * 1.8)
      meshRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.1, 64, 64]} />
      {/* @ts-expect-error MeshWobbleMaterial is from drei */}
      <MeshWobbleMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.55}
        factor={0.08}
        speed={1.2}
        roughness={0.15}
        metalness={0.3}
      />
    </mesh>
  )
}

// ─── Particle system ─────────────────────────────────────────────────────────

interface Particle {
  position: THREE.Vector3
  phase: number        // random phase offset for orbit
  radius: number       // orbit radius
  speed: number        // orbit speed multiplier
  isAbsent: boolean
  driftSpeed: number   // for absent particles drifting outward
  driftPhase: number
}

function Particles({ presentCount, absentCount }: { presentCount: number; absentCount: number }) {
  const groupRef = useRef<THREE.Group>(null)

  // Build particles once from counts (cap for perf)
  const particles = useMemo<Particle[]>(() => {
    const cap = 80
    const pCap = Math.min(presentCount, Math.round(cap * 0.75))
    const aCap = Math.min(absentCount,  Math.round(cap * 0.25))
    const list: Particle[] = []

    for (let i = 0; i < pCap; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 1.7 + Math.random() * 0.9
      list.push({
        position: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ),
        phase:      Math.random() * Math.PI * 2,
        radius:     r,
        speed:      0.35 + Math.random() * 0.25,
        isAbsent:   false,
        driftSpeed: 0,
        driftPhase: 0,
      })
    }

    for (let i = 0; i < aCap; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 1.9 + Math.random() * 1.2
      list.push({
        position: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ),
        phase:      Math.random() * Math.PI * 2,
        radius:     r,
        speed:      0.1 + Math.random() * 0.1,
        isAbsent:   true,
        driftSpeed: 0.04 + Math.random() * 0.03,
        driftPhase: Math.random() * Math.PI * 2,
      })
    }

    return list
  }, [presentCount, absentCount])

  // Separate mesh refs for present & absent for instanced rendering
  const presentMeshRef = useRef<THREE.InstancedMesh>(null)
  const absentMeshRef  = useRef<THREE.InstancedMesh>(null)

  const presentParticles = useMemo(() => particles.filter(p => !p.isAbsent), [particles])
  const absentParticles  = useMemo(() => particles.filter(p =>  p.isAbsent), [particles])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const t = useRef(0)

  useFrame((_, delta) => {
    t.current += delta

    if (presentMeshRef.current) {
      presentParticles.forEach((p, i) => {
        const angle = t.current * p.speed + p.phase
        dummy.position.set(
          p.radius * Math.cos(angle),
          p.position.y + 0.2 * Math.sin(t.current * 0.7 + p.phase),
          p.radius * Math.sin(angle),
        )
        dummy.updateMatrix()
        presentMeshRef.current!.setMatrixAt(i, dummy.matrix)
      })
      presentMeshRef.current.instanceMatrix.needsUpdate = true
    }

    if (absentMeshRef.current) {
      absentParticles.forEach((p, i) => {
        // Absent particles drift slowly outward
        const drift = 1 + 0.3 * Math.sin(t.current * p.driftSpeed + p.driftPhase)
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
    <group ref={groupRef}>
      {/* Present: bright white-blue dots */}
      {presentParticles.length > 0 && (
        <instancedMesh ref={presentMeshRef} args={[undefined, undefined, presentParticles.length]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#e0f2fe" emissive="#7dd3fc" emissiveIntensity={0.8} />
        </instancedMesh>
      )}
      {/* Absent: dim red dots */}
      {absentParticles.length > 0 && (
        <instancedMesh ref={absentMeshRef} args={[undefined, undefined, absentParticles.length]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#7f1d1d" emissive="#ef4444" emissiveIntensity={0.2} transparent opacity={0.55} />
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
      sceneRef.current.rotation.y += delta * 0.22
    }
  })

  return (
    <group ref={sceneRef}>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      <CentralOrb color={color} />

      <Particles presentCount={presentCount} absentCount={absentCount} />
    </group>
  )
}

// ─── WebGL availability check ─────────────────────────────────────────────────

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
        style={{ background: color, boxShadow: `0 0 40px 8px ${color}55` }}
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
    <div style={{ height: 300 }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 4]} intensity={1.2} />
        <pointLight position={[-4, -2, -4]} intensity={0.4} color="#60a5fa" />
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
