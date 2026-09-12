import type { RepairCategory } from '../types'

export interface FollowUpQuestion {
  id: string
  label: string
  placeholder: string
}

export const followUpQuestions: Record<RepairCategory, FollowUpQuestion[]> = {
  plumbing: [
    { id: 'location', label: 'Where is the water or problem showing?', placeholder: 'Under sink, behind toilet, ceiling below…' },
    { id: 'timing', label: 'When does it happen?', placeholder: 'Constantly, only when running, after draining…' },
  ],
  electrical: [
    { id: 'symptom', label: 'What can you observe without opening anything?', placeholder: 'Outlet is warm, breaker trips, lights flicker…' },
    { id: 'extent', label: 'What areas are affected?', placeholder: 'One outlet, one room, several rooms…' },
  ],
  gas: [
    { id: 'symptom', label: 'What did you notice from a safe location?', placeholder: 'Odor, alarm, appliance stopped working…' },
    { id: 'location', label: 'Where is the concern?', placeholder: 'Furnace room, stove, outside meter…' },
  ],
  hvac: [
    { id: 'system', label: 'What equipment is affected?', placeholder: 'Central AC, heat pump, furnace, mini-split…' },
    { id: 'behavior', label: 'What is the system doing?', placeholder: 'Runs but does not cool, makes noise, leaks…' },
  ],
  roofing: [
    { id: 'location', label: 'Where is the damage visible from the ground or indoors?', placeholder: 'Ceiling near chimney, missing shingles…' },
    { id: 'weather', label: 'When does it appear?', placeholder: 'Heavy rain, wind, snow melt, constantly…' },
  ],
  flooring: [
    { id: 'material', label: 'What kind of flooring is it?', placeholder: 'Hardwood, vinyl plank, tile, carpet…' },
    { id: 'area', label: 'About how large is the affected area?', placeholder: 'Two boards, 4 × 6 ft area, whole room…' },
  ],
  painting: [
    { id: 'surface', label: 'What surface needs work?', placeholder: 'Interior wall, trim, ceiling, exterior siding…' },
    { id: 'area', label: 'About how much area is involved?', placeholder: 'One wall, 12 × 12 room, front elevation…' },
  ],
  carpentry: [
    { id: 'item', label: 'What wood item is affected?', placeholder: 'Door frame, cabinet, stair, deck board…' },
    { id: 'damage', label: 'What kind of damage do you see?', placeholder: 'Loose, split, sagging, soft wood, missing trim…' },
  ],
  drywall: [
    { id: 'damage', label: 'What does the damage look like?', placeholder: 'Hole, crack, stain, bubbling, loose tape…' },
    { id: 'size', label: 'About how large is it?', placeholder: 'Coin-size, 8 inches, floor-to-ceiling crack…' },
  ],
  general: [
    { id: 'location', label: 'Where is the problem?', placeholder: 'Room, wall, fixture, exterior area…' },
    { id: 'change', label: 'What changed recently?', placeholder: 'Started after rain, became loose, stopped working…' },
  ],
}
