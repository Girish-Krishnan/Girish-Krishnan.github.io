import type { MissionId } from './missions'

export type VehicleId = 'rover' | 'car' | 'quad' | 'auv'
export type ControlMode = 'screen' | 'car' | 'fly' | 'swim'

export interface VehicleDef {
  id: VehicleId
  name: string
  tagline: string
  /** Real experience/project this vehicle nods to (from Girish's own material). */
  story: string
  links: { label: string; href: string }[]
  unlock: MissionId | null
  control: ControlMode
  maxSpeed: number
  controls: string
}

const gh = (r: string) => `https://github.com/Girish-Krishnan/${r}`

export const vehicles: VehicleDef[] = [
  {
    id: 'rover',
    name: 'SLAM Rover',
    tagline: 'LiDAR rover · steady and precise',
    story: 'A nod to my Visual-Inertial SLAM (EKF) and LiDAR SLAM (GTSAM) projects. Turn on SLAM view and it maps the lab as you drive.',
    links: [
      { label: 'Visual-Inertial SLAM', href: gh('Visual-Inertial-SLAM') },
      { label: 'LiDAR SLAM', href: gh('LiDAR-SLAM') },
    ],
    unlock: null,
    control: 'screen',
    maxSpeed: 6.5,
    controls: 'WASD / arrows · joystick',
  },
  {
    id: 'car',
    name: 'F1TENTH Racer',
    tagline: '1/10-scale race car · fast and drifty',
    story: 'At the Existential Robotics Lab I built a MuJoCo car simulator and trained PPO/SAC policies for real-world F1TENTH deployment on a Jetson TX2; at AI Racing Tech I worked on MPC for the Indy Autonomous Challenge. I also received the Most Innovative Award at the IEEE F1TENTH Competition.',
    links: [{ label: 'Experience', href: '#sec-experience' }],
    unlock: 'tour',
    control: 'car',
    maxSpeed: 17,
    controls: 'W/S throttle & brake · A/D steer · Space handbrake',
  },
  {
    id: 'quad',
    name: 'Quadcopter',
    tagline: 'Hover, climb, and fly over walls',
    story: 'Inspired by my quadcopter built from scratch: PCB design, assembly, and embedded C++ for stable flight control.',
    links: [{ label: 'Quadcopter from Scratch', href: gh('Quadcopter') }],
    unlock: 'quad',
    control: 'fly',
    maxSpeed: 8,
    controls: 'WASD move · Space up · Shift down',
  },
  {
    id: 'auv',
    name: 'AUV',
    tagline: 'Dives in the test tank',
    story: 'I led software for an Arctic AUV at Yonder Deep (PID control, Raspberry Pi sensor/motor integration, autonomous diving) and for AUV-mounted oceanographic sensors at Scripps’ Innovative Marine Technology Lab.',
    links: [{ label: 'Experience', href: '#sec-experience' }],
    unlock: 'tank',
    control: 'swim',
    maxSpeed: 4,
    controls: 'WASD move · Space surface · Shift dive',
  },
]

export const vehicleById = (id: VehicleId) => vehicles.find((v) => v.id === id)!

export type PaintId = 'studio' | 'lidar' | 'gold' | 'carbon' | 'holo' | 'spark' | 'abyss'
export interface PaintDef { id: PaintId; name: string; body: string; accent: string; unlock: MissionId | null }
export const paints: PaintDef[] = [
  { id: 'studio', name: 'Studio White', body: '#e8edf3', accent: '#5eead4', unlock: null },
  { id: 'lidar', name: 'LiDAR Teal', body: '#14b8a6', accent: '#ccfbf1', unlock: 'mapper' },
  { id: 'gold', name: 'A* Gold', body: '#eab308', accent: '#fff7cc', unlock: 'planner' },
  { id: 'carbon', name: 'Carbon Livery', body: '#1f2430', accent: '#f43f5e', unlock: 'laptime' },
  { id: 'holo', name: 'Holographic', body: '#a78bfa', accent: '#67e8f9', unlock: 'secret' },
  { id: 'spark', name: 'Weld Spark', body: '#1f2937', accent: '#fb923c', unlock: 'weld' },
  { id: 'abyss', name: 'Abyss', body: '#0c4a6e', accent: '#fde047', unlock: 'survey' },
]
export const paintById = (id: PaintId) => paints.find((p) => p.id === id) ?? paints[0]
