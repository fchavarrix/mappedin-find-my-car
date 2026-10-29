import {
  getMapData,
  show3dMap,
  type Coordinate,
  type Directions,
  type MapData,
  type MapView,
  type TDirectionInstruction,
} from '@mappedin/mappedin-js';
import { BlueDot } from '@mappedin/blue-dot';
import '@mappedin/mappedin-js/lib/index.css';
import './style.css';
import { lang, placeName, switchLang, t } from './i18n';

// Public demo credentials from Mappedin's developer docs (they only work with demo maps).
// Default map: Mappedin's "Parking Demo". Any other demo map can be loaded with ?map=<mapId>.
const MAP_OPTIONS = {
  key: import.meta.env.VITE_MAPPEDIN_KEY ?? 'mik_yeBk0Vf0nNJtpesfu560e07e5',
  secret: import.meta.env.VITE_MAPPEDIN_SECRET ?? 'mis_2g9ST8ZcSFb5R9fPnsvYhrX3RyRwPtDGbMGweCYKEq385431022',
  mapId: new URLSearchParams(location.search).get('map') ?? import.meta.env.VITE_MAPPEDIN_MAP_ID ?? '69ba04dae81536000cf38a5c',
};

const STORAGE_KEY = 'find-my-car:parking';
// Simulated walking speed in metres per second (about 3x a normal pace, so the demo is short).
const WALK_SPEED = 4.5;
const FLOOR_CHANGE_PAUSE_MS = 1200;

const CAR_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-4a2 2 0 0 1 2-2zm2.1 0h9.8l-1.2-3.6a.5.5 0 0 0-.5-.4H8.8a.5.5 0 0 0-.5.4L7.1 11zM7 15.5A1.5 1.5 0 1 0 7 12.5a1.5 1.5 0 0 0 0 3zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>';

type Mode = 'park' | 'start' | 'ready' | 'walking' | 'arrived';
type SavedSpot = { latitude: number; longitude: number; floorId: string };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const ui = {
  title: $('title'),
  message: $('message'),
  actions: $('actions'),
  steps: $('steps'),
  instructions: $<HTMLOListElement>('instructions'),
  floor: $<HTMLSelectElement>('floor'),
};

let mapData: MapData;
let mapView: MapView;
let blueDot: BlueDot;
let mode: Mode = 'park';
let car: Coordinate | undefined;
let carMarker: ReturnType<MapView['Markers']['add']> | undefined;
let start: Coordinate | undefined;
let directions: Directions | undefined;
let walkToken = 0;

function loadSpot(): SavedSpot | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSpot) : undefined;
  } catch {
    return undefined;
  }
}

function saveSpot(spot: SavedSpot | undefined) {
  try {
    if (spot) localStorage.setItem(STORAGE_KEY, JSON.stringify(spot));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode); the demo still works for this visit.
  }
}

function floorName(floorId: string | undefined) {
  const floor = mapData.getByType('floor').find((f) => f.id === floorId);
  if (!floor) return t.thisFloor;
  return floor.floorStack.type === 'Outdoor' ? t.outdoor : `${placeName(floor.floorStack.name)} · ${placeName(floor.name)}`;
}

function setCar(coordinate: Coordinate | undefined) {
  if (carMarker) mapView.Markers.remove(carMarker);
  carMarker = undefined;
  car = coordinate;
  if (coordinate) {
    carMarker = mapView.Markers.add(coordinate, `<div class="car-marker">${CAR_ICON}</div>`, {
      rank: 'always-visible',
    });
    saveSpot({ latitude: coordinate.latitude, longitude: coordinate.longitude, floorId: coordinate.floorId! });
  } else {
    saveSpot(undefined);
  }
}

function placeBlueDot(coordinate: Coordinate) {
  const floor = mapData.getByType('floor').find((f) => f.id === coordinate.floorId);
  // `update` sets the position directly. In production this would come from an IPS
  // (Wi-Fi/BLE, VPS) through `reportPosition`, blended with the device sensors.
  // The walk already interpolates between points, so the SDK animation is turned off.
  blueDot.update(
    { latitude: coordinate.latitude, longitude: coordinate.longitude, accuracy: 2, floorOrFloorId: floor },
    { animate: false },
  );
}

function button(label: string, onClick: () => void, primary = false) {
  const b = document.createElement('button');
  b.textContent = label;
  if (primary) b.className = 'primary';
  b.addEventListener('click', onClick);
  return b;
}

function render() {
  const order = ['park', 'start', 'go'];
  const current = mode === 'park' ? 'park' : mode === 'start' ? 'start' : 'go';
  ui.steps.querySelectorAll('span').forEach((s) => {
    const step = s.dataset.step!;
    s.className = step === current ? 'active' : order.indexOf(step) < order.indexOf(current) ? 'done' : '';
  });

  ui.actions.replaceChildren();
  ui.instructions.hidden = mode !== 'walking';

  switch (mode) {
    case 'park':
      ui.title.textContent = t.parkTitle;
      ui.message.textContent = t.parkMessage;
      break;
    case 'start':
      ui.title.textContent = t.startTitle;
      ui.message.textContent = t.startMessage(floorName(car?.floorId));
      ui.actions.append(button(t.changeSpot, resetAll));
      break;
    case 'ready':
      ui.title.textContent = t.routeTitle;
      ui.message.textContent = directions
        ? t.routeMessage(Math.round(directions.distance), Math.max(1, Math.round(directions.distance / 1.3 / 60)))
        : t.noRoute;
      if (directions) ui.actions.append(button(t.takeMe, walk, true));
      ui.actions.append(button(t.changeStart, () => setMode('start')));
      break;
    case 'walking':
      ui.title.textContent = t.walkingTitle;
      ui.message.textContent = t.walkingMessage;
      ui.actions.append(button(t.stop, () => { walkToken++; setMode('ready'); }));
      break;
    case 'arrived':
      ui.title.textContent = t.arrivedTitle;
      ui.message.textContent = t.arrivedMessage;
      ui.actions.append(button(t.startOver, resetAll, true));
      break;
  }
}

function setMode(next: Mode) {
  mode = next;
  render();
}

function resetAll() {
  walkToken++;
  mapView.Navigation.clear();
  directions = undefined;
  start = undefined;
  setCar(undefined);
  blueDot.update(undefined);
  ui.instructions.replaceChildren();
  setMode('park');
}

function describe(instruction: TDirectionInstruction) {
  const { type, bearing } = instruction.action;
  switch (type) {
    case 'Departure': return t.departure;
    case 'Arrival': return t.arrival;
    case 'TakeConnection': return t.takeConnection;
    case 'ExitConnection': return t.exitConnection;
    default: return bearing === 'Straight' ? t.straight : (t.turn[bearing ?? ''] ?? t.turnFallback);
  }
}

function renderInstructions(active = -1) {
  if (!directions) return ui.instructions.replaceChildren();
  // Show the current step and the next two, like a turn-by-turn card, so the map stays visible.
  const first = Math.max(0, active);
  ui.instructions.replaceChildren(
    ...directions.instructions.slice(first, first + 3).map((ins, offset) => {
      const li = document.createElement('li');
      li.className = first + offset === active ? 'current' : '';
      li.innerHTML = `<span>${describe(ins)}</span><span>${ins.distance > 0 ? Math.round(ins.distance) + ' m' : ''}</span>`;
      return li;
    }),
  );
}

async function route() {
  if (!start || !car) return;
  mapView.Navigation.clear();
  directions = await mapData.getDirections(start, car);
  if (directions) {
    mapView.Navigation.draw(directions, {
      pathOptions: { color: '#2266ff', width: 1.2, displayArrowsOnPath: true },
    });
  }
  renderInstructions();
  setMode('ready');
}

function metres(a: Coordinate, b: Coordinate) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Walks the Blue Dot along the route. Mappedin does not switch the visible floor when the
// position moves to another level, so the app does it: that is the gap this demo closes.
async function walk() {
  if (!directions) return;
  const token = ++walkToken;
  const points = directions.coordinates;
  const stops = directions.instructions.map((ins) => ins.coordinate);
  setMode('walking');
  blueDot.follow('position-only', { zoomLevel: 19 });

  let instructionIndex = 0;
  renderInstructions(0);

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    if (b.floorId && b.floorId !== mapView.currentFloor.id) {
      await sleep(FLOOR_CHANGE_PAUSE_MS);
      if (token !== walkToken) return;
      mapView.setFloor(b.floorId);
      placeBlueDot(b);
      continue;
    }

    const duration = (metres(a, b) / WALK_SPEED) * 1000;
    const t0 = performance.now();
    while (true) {
      if (token !== walkToken) return;
      const t = Math.min(1, (performance.now() - t0) / Math.max(duration, 1));
      placeBlueDot(
        mapView.createCoordinate({
          latitude: a.latitude + (b.latitude - a.latitude) * t,
          longitude: a.longitude + (b.longitude - a.longitude) * t,
          floorId: b.floorId,
        }),
      );
      if (t >= 1) break;
      await sleep(80);
    }

    // Advance the highlighted instruction once we pass its coordinate.
    while (instructionIndex < stops.length - 1 && metres(b, stops[instructionIndex + 1]) < 3) {
      instructionIndex++;
      renderInstructions(instructionIndex);
    }
  }

  if (token !== walkToken) return;
  renderInstructions(directions.instructions.length - 1);
  blueDot.follow(false);
  setMode('arrived');
}

// Static labels; the sheet's dynamic text comes from render().
function applyStaticText() {
  document.documentElement.lang = lang;
  $('subtitle').textContent = t.subtitle;
  ui.floor.setAttribute('aria-label', t.floor);
  const labels: Record<string, string> = { park: t.stepPark, start: t.stepStart, go: t.stepGo };
  ui.steps.querySelectorAll('span').forEach((s) => (s.textContent = labels[s.dataset.step!]));
  ui.title.textContent = t.loading;
  $('credit').textContent = t.credit;
  const langButton = $<HTMLButtonElement>('lang');
  langButton.textContent = t.switchTo;
  langButton.addEventListener('click', switchLang);
}

async function init() {
  mapData = await getMapData(MAP_OPTIONS);
  // Open on the parking garage when the map has one; otherwise use the map's default floor.
  const stacks = mapData.getByType('floor-stack');
  const garage = stacks.find((s) => /parking|garage|estacionamiento/i.test(s.name)) ?? stacks.find((s) => s.type === 'Building');
  mapView = await show3dMap($('map') as HTMLDivElement, mapData, {
    outdoorView: { enabled: false },
    initialFloor: garage?.defaultFloor ?? garage?.floors[0],
  });
  blueDot = new BlueDot(mapView);
  if (import.meta.env.DEV) Object.assign(window, { mapData, mapView, blueDot });
  blueDot.enable({ watchDevicePosition: false, color: '#2266ff', timeout: 600000 });

  // Floor selector grouped by building (floor stack), lowest floor first.
  const floors = mapData.getByType('floor');
  // Floors without spaces have no geometry to show, so they stay out of the selector.
  const hasGeometry = (f: (typeof floors)[number]) => f.floorStack.type === 'Outdoor' || f.spaces.length > 0;
  ui.floor.replaceChildren(
    ...stacks
      .filter((stack) => stack.floors.some(hasGeometry))
      .map((stack) => {
        const group = document.createElement('optgroup');
        group.label = placeName(stack.name);
        const sorted = stack.floors.filter(hasGeometry).sort((a, b) => a.elevation - b.elevation);
        group.append(...sorted.map((f) => new Option(placeName(f.name), f.id)));
        return group;
      }),
  );
  ui.floor.value = mapView.currentFloor.id;
  // Buildings sit in different places on the campus, so move the camera along with the floor.
  ui.floor.addEventListener('change', () => {
    const floor = floors.find((f) => f.id === ui.floor.value);
    if (!floor) return;
    mapView.setFloor(floor);
    mapView.Camera.focusOn(floor);
  });
  mapView.on('floor-change', (e) => {
    ui.floor.value = e.floor.id;
  });

  mapView.on('click', async (e) => {
    const coordinate = mapView.createCoordinate({
      latitude: e.coordinate.latitude,
      longitude: e.coordinate.longitude,
      floorId: e.floors?.[0]?.id ?? mapView.currentFloor.id,
    });
    if (mode === 'park') {
      setCar(coordinate);
      setMode('start');
    } else if (mode === 'start' || mode === 'ready') {
      start = coordinate;
      placeBlueDot(coordinate);
      await route();
    }
  });

  const saved = loadSpot();
  if (saved && floors.some((f) => f.id === saved.floorId)) {
    setCar(mapView.createCoordinate(saved));
    mode = 'start';
  }
  render();
}

applyStaticText();
init().catch((err) => {
  console.error(err);
  ui.title.textContent = t.loadErrorTitle;
  ui.message.textContent = t.loadErrorMessage;
});
