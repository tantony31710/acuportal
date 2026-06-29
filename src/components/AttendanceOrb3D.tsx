import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial, Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrbProps {
  /** 0–100 */
  attendancePercent: number
  /** Total students in this session */
  totalStudents: number
  /** Number of present students */
  presentStudents: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function orbColor(pct: number): THREE.Color {
  if (pct >= 75) return new THREE.Color('#22c55e')   // green-500
  if (pct >= 50) return new THREE.Color('#f59e0b')   // amber-500
  return new THREE.Color('#ef4444')                   // red-500
}

function glowColor(pct: number): string {
  if (pct >= 75) return '#22c55e'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

// ─── Particle system ──────────────────────────────────────────────────────────

interface ParticlesProps {
  total: number
  present: number
}

function Particles({ total, present }: ParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Build initial positions once
  const { positions, colors } = useMemo(() => {
    const count = Math.min(total, 120) // cap for perf
    const positions: THREE.Vector3[] = []
    const colors: THREE.Color[] = []

    for (let i = 0; i < count; i++) {
      const isPresent = i < present

      // Spherical coordinates
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)

      // Present = tight orbit radius 1.6–2.0, absent = drift 2.4–3.4
      const r = isPresent
        ? 1.6 + Math.random() * 0.4
        : 2.4 + Math.random() * 1.0

      positions.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ))

      colors.push(isPresent
        ? new THREE.Color('#ffffff')
        : new THREE.Color('#7f1d1d'),
      )
    }
    return { positions, colors }
  }, [total, present])

  // Per-frame rotation + pulse for present particles
  const angles = useRef(positions.map(() => Math.random() * Math.PI * 2))
  const dummy  = useMemo(() => new THREE.Object3D(), [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    positions.forEach((pos, i) => {
      const isPresent = i < present
      const speed     = isPresent ? 0.3 : 0.05
      angles.current[i] += speed * 0.01

      // Orbit around Y axis
      const radius = Math.sqrt(pos.x * pos.x + pos.z * pos.z)
      const angle  = angles.current[i]

      dummy.position.set(
        radius * Math.cos(angle),
        pos.y + (isPresent ? Math.sin(t * 2 + i) * 0.05 : Math.sin(t * 0.4 + i) * 0.15),
        radius * Math.sin(angle),
      )
      dummy.scale.setScalar(isPresent ? 0.04 : 0.028)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  const count = positions.length

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial vertexColors />
      {/* inject per-instance colors */}
      <instancedMesh
        ref={node => {
          if (!node) return
          const colorArr = new Float32Array(count * 3)
          colors.forEach((c, i) => {
            colorArr[i * 3]     = c.r
            colorArr[i * 3 + 1] = c.g
            colorArr[i * 3 + 2] = c.b
          })
          node.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArr, 3))
        }}
        args={[undefined, undefined, 0]}
      />
    </instancedMesh>
  )
}

// ─── Core orb mesh ────────────────────────────────────────────────────────────

function OrbMesh({ attendancePercent }: { attendancePercent: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color   = orbColor(attendancePercent)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    meshRef.current.rotation.y = t * 0.2
    meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.05
    // subtle scale pulse
    const pulse = 1 + Math.sin(t * 1.5) * 0.015
    meshRef.current.scale.setScalar(pulse)
  })

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <MeshDistortMaterial
        color={color}
        distort={0.12}
        speed={1.5}
        roughness={0.15}
        metalness={0.4}
        emissive={color}
        emissiveIntensity={0.35}
      />
    </Sphere>
  )
}

// ─── Floating percentage label ────────────────────────────────────────────────

function PercentLabel({ pct }: { pct: number }) {
  return (
    <Billboard follow={true} position={[0, -1.8, 0]}>
      <Text
        fontSize={0.32}
        color={glowColor(pct)}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {pct}%
      </Text>
    </Billboard>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function OrbScene({ attendancePercent, totalStudents, presentStudents }: OrbProps) {
  const glow = glowColor(attendancePercent)

  return (
    <>
      {/* Ambient + directional light */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      {/* Colored point light = glow effect */}
      <pointLight color={glow} intensity={3} distance={6} position={[0, 0, 0]} />

      <OrbMesh attendancePercent={attendancePercent} />
      <Particles total={totalStudents} present={presentStudents} />
      <PercentLabel pct={attendancePercent} />
    </>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

/**
 * AttendanceOrb3D
 *
 * Drop this anywhere in the Teacher dashboard. It renders a self-contained
 * WebGL canvas with no extra wrapper needed.
 *
 * Props:
 *   attendancePercent – 0–100, controls orb color
 *   totalStudents     – drives particle count
 *   presentStudents   – how many white particles (present)
 */
export function AttendanceOrb3D({ attendancePercent, totalStudents, presentStudents }: OrbProps) {
  // Respect prefers-reduced-motion: render a static SVG fallback instead
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced) {
    const glow = glowColor(attendancePercent)
    return (
      <div
        aria-label={`Attendance: ${attendancePercent}%`}
        style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `radial-gradient(circle at 40% 35%, ${glow}88, ${glow}22)`,
          border: `2px solid ${glow}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: glow,
          fontWeight: 700,
          fontSize: 28,
        }}
      >
        {attendancePercent}%
      </div>
    )
  }

  return (
    <div
      aria-label={`3D attendance orb: ${attendancePercent}%`}
      style={{ width: 220, height: 220 }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <OrbScene
          attendancePercent={attendancePercent}
          totalStudents={totalStudents}
          presentStudents={presentStudents}
        />
      </Canvas>
    </div>
  )
}
