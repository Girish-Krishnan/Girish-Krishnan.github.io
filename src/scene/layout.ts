import { stations, type StationId } from '../data/content'
import * as THREE from 'three'

export const ARENA_RADIUS = 24
export const WALL_SEGMENTS = 24 // 15° each; segment i is centered at angle i*15°
export const STATION_RADIUS = 12
export const NEAR_DIST = 4.0

export const GATE_EAST = 0 // segment index → racetrack
export const GATE_WEST = 12 // → test tank
export const SECRET_SEG = 16 // 240°: the glitchy fake wall

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, rotY: Math.atan2(-Math.cos(a), -Math.sin(a)) }
}

/** Feature pads, placed in the gaps between stations. */
export const PADS = {
  planning: { ...polar(60, 17.2), size: 8 },
  cartpole: { ...polar(120, 17), size: 7 },
  launch: { ...polar(-60, 17), size: 5 },
  weld: { ...polar(240, 17), size: 6 },
}

export const TANK = { x0: -52, x1: -32, z0: -10, z1: 10, floorY: -4, waterY: -0.3 }
export const inTank = (x: number, z: number, pad = 0) =>
  x > TANK.x0 - pad && x < TANK.x1 + pad && z > TANK.z0 - pad && z < TANK.z1 + pad
export const TANK_DOCK = { x: -28, z: 0, heading: -Math.PI / 2 }

export const SECRET_ROOM = { ...polar(240, 30), w: 10, d: 8 }
export const HIDDEN_QUAD = { x: -57, z: 15 }
export const WORLD = { x0: -72, x1: 120, z0: -62, z1: 62 }

export const stationLayout = stations.map((s, i) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / stations.length
  const x = Math.cos(a) * STATION_RADIUS
  const z = Math.sin(a) * STATION_RADIUS
  return { ...s, x, z, rotY: Math.atan2(-x, -z) }
})

export function stationPos(id: StationId) {
  return stationLayout.find((s) => s.id === id)!
}

/** Spot in front of a station (between it and the center) where the robot parks. */
export function approachPoint(id: StationId) {
  const s = stationPos(id)
  const k = (STATION_RADIUS - 3.4) / STATION_RADIUS
  return { x: s.x * k, z: s.z * k, heading: Math.atan2(s.x, s.z) }
}

export type Zone = 'planning' | 'cartpole' | 'launch' | 'weld' | 'track' | 'tank' | 'secret' | null

/** Shared, mutable vehicle state (read every frame by camera, HUD, features; not React state). */
export const robotState = {
  pos: new THREE.Vector3(0, 0.4, 0),
  vel: new THREE.Vector2(0, 0), // planar velocity (x, z)
  heading: Math.PI, // facing -z (toward the About station)
  speed: 0,
  autopilot: null as null | { x: number; z: number; open?: StationId },
  path: [] as { x: number; z: number }[], // waypoint queue (planning pad "follow path")
  offTrack: false,
  teleportedAt: 0,
}

const toward = (p: { x: number; z: number }, r: number) => {
  const d = Math.hypot(p.x, p.z) || 1
  return { x: (p.x / d) * r, z: (p.z / d) * r, heading: Math.atan2(p.x, p.z) }
}
/** Where `goto <zone>` drops you. */
export const ZONE_SPOTS: Record<string, { x: number; z: number; heading: number }> = {
  home: { x: 0, z: 0, heading: Math.PI },
  tank: TANK_DOCK,
  track: { x: 34, z: 5, heading: Math.PI }, // just behind the start line, facing down the main straight
  planning: toward(PADS.planning, 11.5),
  cartpole: toward(PADS.cartpole, 12.6),
  launch: toward(PADS.launch, 12.4),
  weld: toward(PADS.weld, 11.8),
}
