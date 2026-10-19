export type MissionId =
  | 'tour' | 'tank' | 'quad' | 'mapper' | 'planner' | 'balancer'
  | 'laptime' | 'secret' | 'liftoff' | 'weld' | 'konami' | 'loop' | 'survey' | 'acoustic'

export interface MissionDef {
  id: MissionId
  title: string
  desc: string
  hint: string
  reward: string
  hidden?: boolean
  /** shown instead of the real hint while a hidden mission is still locked */
  lockedHint?: string
}

export const missions: MissionDef[] = [
  { id: 'tour', title: 'Lab tour', desc: 'Visit all six stations.', hint: 'Open each station: drive up and press E, or use the menu.', reward: 'F1TENTH Racer' },
  { id: 'tank', title: 'Make a splash', desc: 'Find the test tank.', hint: 'Head out through the west gate of the lab.', reward: 'AUV' },
  { id: 'survey', title: 'Tank survey', desc: 'Ping sonar and scan all 5 beacons on the tank floor.', hint: 'In the AUV, press Q (or Sonar) to reveal beacons, then swim close to each one.', reward: 'Abyss paint' },
  { id: 'acoustic', title: 'Acoustic profile', desc: 'Hold depth at 1 m, 2 m and 3 m to record acoustic samples.', hint: 'Set a depth (`depth 2` or the preset buttons) and let the PID settle for a few seconds.', reward: 'Deep-sea bragging rights' },
  { id: 'quad', title: 'Lost drone', desc: 'Find the hidden quadcopter.', hint: 'Something small is parked out past the test tank, behind the pump house.', reward: 'Quadcopter' },
  { id: 'mapper', title: 'Cartographer', desc: 'Map 80% of the lab with SLAM view on.', hint: 'Toggle SLAM view (HUD button or `slam`) and drive around the lab.', reward: 'LiDAR Teal paint' },
  { id: 'planner', title: 'Path finder', desc: 'On the planning pad, run both A* and RRT and follow a path to the goal.', hint: 'The planning pad is between the Projects and Research stations.', reward: 'A* Gold paint' },
  { id: 'balancer', title: 'Steady hands', desc: 'Push the cart-pole 5 times while LQR keeps it upright.', hint: 'The control demo is between Research and TA Experience.', reward: '`pid` terminal command' },
  { id: 'laptime', title: 'Beat the dev ghost', desc: 'Beat the dev ghost’s lap time on the track.', hint: 'Exit through the east gate. The F1TENTH Racer helps.', reward: 'Carbon Livery paint' },
  { id: 'secret', title: 'Behind the glass', desc: 'Find the secret room.', hint: 'One wall panel behind the weld cell flickers. Glitches are sometimes doors.', reward: 'Holographic paint + `matrix` command' },
  { id: 'liftoff', title: 'Liftoff', desc: 'Launch the rocket.', hint: 'The launch pad sign tells you what to type in the terminal.', reward: 'Bragging rights' },
  { id: 'weld', title: 'Lay a clean weld', desc: 'Weld a seam with bead quality of 85 or better.', hint: 'At the weld cell by the northwest wall: draw a smooth seam (or pick a preset), Detect seam, then Weld. Shaky seams make shaky beads.', reward: 'Weld Spark paint + `xarm` command' },
  { id: 'loop', title: 'Loop closure', desc: 'Return to the center pad after mapping 30% of the lab.', hint: 'SLAM folks love coming back to where they started.', reward: 'A tidier map', hidden: true, lockedHint: 'Every good map ends where it began.' },
  { id: 'konami', title: '↑↑↓↓←→←→BA', desc: 'Enter the classic code.', hint: 'Old games had a famous cheat code.', reward: 'Low-gravity toggle + `gravity <g>` command', hidden: true, lockedHint: 'Someone left a note on the wall.' },
]
export const missionById = (id: MissionId) => missions.find((m) => m.id === id)!
