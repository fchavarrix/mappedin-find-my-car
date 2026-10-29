export type Lang = 'es' | 'en';

const LANG_KEY = 'find-my-car:lang';

const strings = {
  es: {
    appName: 'Encuentra tu auto',
    subtitle: 'Demo de navegación en interiores · Mappedin JS',
    floor: 'Piso',
    stepPark: '1 · Estaciona',
    stepStart: '2 · Estás aquí',
    stepGo: '3 · Ve',
    loading: 'Cargando mapa…',
    parkTitle: '¿Dónde estacionaste?',
    parkMessage: 'Toca el mapa donde dejaste tu auto. Usa el selector de piso para cambiar de nivel.',
    startTitle: '¿Dónde estás ahora?',
    startMessage: (place: string) => `Auto guardado en ${place}. Ahora toca tu ubicación actual, en cualquier piso.`,
    changeSpot: 'Cambiar lugar',
    routeTitle: 'Ruta a tu auto',
    routeMessage: (m: number, min: number) => `${m} m · unos ${min} min caminando`,
    noRoute: 'No hay ruta entre estos dos puntos. Prueba con otro lugar.',
    takeMe: 'Llévame a mi auto',
    changeStart: 'Cambiar inicio',
    walkingTitle: 'Caminando a tu auto…',
    walkingMessage: 'Punto azul simulado. El mapa cambia de piso solo cuando tomas el ascensor o las escaleras.',
    stop: 'Detener',
    arrivedTitle: 'Encontraste tu auto',
    arrivedMessage: 'Buen viaje de regreso.',
    startOver: 'Empezar de nuevo',
    departure: 'Empieza a caminar',
    arrival: 'Llegaste a tu auto',
    takeConnection: 'Toma el ascensor o las escaleras',
    exitConnection: 'Sal en el nuevo piso',
    straight: 'Sigue derecho',
    turn: {
      Right: 'Gira a la derecha',
      SlightRight: 'Gira levemente a la derecha',
      Left: 'Gira a la izquierda',
      SlightLeft: 'Gira levemente a la izquierda',
      Back: 'Da la vuelta',
    } as Record<string, string>,
    turnFallback: 'Gira',
    thisFloor: 'este piso',
    outdoor: 'el exterior',
    loadErrorTitle: 'No se pudo cargar el mapa',
    loadErrorMessage: 'Revisa tu conexión y vuelve a cargar la página.',
    credit: 'Mapa demo y SDK de Mappedin · hecho por Felipe Chavarri',
    switchTo: 'EN',
  },
  en: {
    appName: 'Find My Car',
    subtitle: 'Indoor wayfinding demo · Mappedin JS',
    floor: 'Floor',
    stepPark: '1 · Park',
    stepStart: '2 · You are here',
    stepGo: '3 · Go',
    loading: 'Loading map…',
    parkTitle: 'Where did you park?',
    parkMessage: 'Tap the map where you left your car. Use the floor selector to change levels.',
    startTitle: 'Where are you now?',
    startMessage: (place: string) => `Car saved on ${place}. Now tap your current location, on any floor.`,
    changeSpot: 'Change parking spot',
    routeTitle: 'Route to your car',
    routeMessage: (m: number, min: number) => `${m} m · about ${min} min walking`,
    noRoute: 'No route found between these two points. Try another spot.',
    takeMe: 'Take me to my car',
    changeStart: 'Change start',
    walkingTitle: 'Walking to your car…',
    walkingMessage: 'Simulated Blue Dot. The map switches floors on its own when you take the elevator or stairs.',
    stop: 'Stop',
    arrivedTitle: 'You found your car',
    arrivedMessage: 'Have a safe drive home.',
    startOver: 'Start over',
    departure: 'Start walking',
    arrival: 'Arrive at your car',
    takeConnection: 'Take the elevator or stairs',
    exitConnection: 'Exit on the new floor',
    straight: 'Continue straight',
    turn: {
      Right: 'Turn right',
      SlightRight: 'Turn slight right',
      Left: 'Turn left',
      SlightLeft: 'Turn slight left',
      Back: 'Turn around',
    } as Record<string, string>,
    turnFallback: 'Turn',
    thisFloor: 'this floor',
    outdoor: 'the outdoor area',
    loadErrorTitle: 'The map could not load',
    loadErrorMessage: 'Check your connection and reload the page.',
    credit: 'Demo map and SDK by Mappedin · built by Felipe Chavarri',
    switchTo: 'ES',
  },
};

// Names in the Mappedin demo map are in English; these cover the ones it uses.
const placeNames: Record<string, string> = {
  'Parking Garage': 'Estacionamiento',
  'Office Parking': 'Estacionamiento de oficinas',
  'Multifamily Parking': 'Estacionamiento residencial',
  Office: 'Oficinas',
  Multifamily: 'Residencial',
  Outdoor: 'Exterior',
  Overview: 'Vista general',
  'Ground Floor': 'Planta baja',
};

// Spanish by default; ?lang=en or a saved choice switch to English.
function detect(): Lang {
  const param = new URLSearchParams(location.search).get('lang');
  if (param === 'es' || param === 'en') return param;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // Storage can be blocked; Spanish is the default.
  }
  return 'es';
}

export const lang: Lang = detect();
export const t = strings[lang];

export function placeName(name: string) {
  if (lang === 'en') return name;
  return placeNames[name] ?? name.replace(/^Level (\d+)$/, 'Nivel $1');
}

export function switchLang() {
  const next: Lang = lang === 'es' ? 'en' : 'es';
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    // Without storage the URL parameter below still carries the choice.
  }
  const url = new URL(location.href);
  url.searchParams.set('lang', next);
  location.href = url.toString();
}
