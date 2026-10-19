import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Procedural studio lighting environment (soft-box style light panels baked to a PMREM).
 * Replaces drei <Environment>, which drags in HDR/EXR/GainMap loaders we don't need.
 */
export function StudioEnv() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const env = new THREE.Scene()
    env.background = new THREE.Color('#05070b')
    const panel = (color: string, intensity: number, pos: [number, number, number], scale: [number, number], rotY = 0, rotX = 0) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
      )
      m.position.set(...pos)
      m.scale.set(scale[0], scale[1], 1)
      m.rotation.set(rotX, rotY, 0)
      m.lookAt(0, 0, 0)
      env.add(m)
    }
    panel('#cfe3ff', 3, [0, 8, -10], [20, 4])
    panel('#5eead4', 1.5, [-10, 4, 6], [12, 3])
    panel('#f59e0b', 1.2, [10, 4, 6], [12, 3])
    panel('#ffffff', 2, [0, 12, 0], [8, 8])
    const pmrem = new THREE.PMREMGenerator(gl)
    const rt = pmrem.fromScene(env, 0.04)
    scene.environment = rt.texture
    return () => {
      scene.environment = null
      rt.dispose()
      pmrem.dispose()
      env.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() }
      })
    }
  }, [gl, scene])
  return null
}
