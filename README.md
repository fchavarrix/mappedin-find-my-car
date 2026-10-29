# Find My Car · Mappedin indoor wayfinding demo

A small web app that solves an everyday problem in malls, campuses and office parks: **finding your car again**.

**▶ Live demo:** [English](https://demo.atlas-lac.com/encuentra-tu-auto/?lang=en) · [Español](https://demo.atlas-lac.com/encuentra-tu-auto/)

1. **Park:** tap the map where you left your car (it is saved in the browser).
2. **You are here:** tap your current location, on any building or floor.
3. **Go:** the app draws the route and walks a simulated Blue Dot to the car, with turn-by-turn steps.

Built on [Mappedin JS v6](https://developer.mappedin.com/web-sdk/getting-started) and [`@mappedin/blue-dot`](https://developer.mappedin.com/web-sdk/blue-dot), using Mappedin's public **Parking Demo** map: a campus with an office building, a residential building and a three-level parking garage.

## What it shows

- **Multi-building, multi-floor routing.** A route from an office on Level 2 to a car on parking level P3 goes down an elevator, outdoors and into the garage, changing floors on the way.
- **Automatic floor switching.** When the Blue Dot's position moves to another level, Mappedin does not change the visible floor on its own. I found this in a real Blue Dot pilot at a mall in Lima. This app watches the route and switches floors when the user takes the elevator or stairs, so the map is always on the floor where the user is.
- **A positioning seam ready for a real IPS.** The simulated position goes through one function (`placeBlueDot`). In production that function would receive positions from Wi-Fi RTT, BLE or VPS through `blueDot.reportPosition`.
- **Spanish and English.** Spanish by default for Latin American venues; `?lang=en` or the language button switches to English.
- **Mobile first.** It is designed for one-hand use on a phone; the floor selector is grouped by building.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. To try another Mappedin demo map, add `?map=<mapId>` to the URL. To use your own map, set `VITE_MAPPEDIN_KEY`, `VITE_MAPPEDIN_SECRET` and `VITE_MAPPEDIN_MAP_ID` in a `.env` file.

## Ideas for a real deployment

- Feed the Blue Dot from the venue's Wi-Fi (802.11mc/az round-trip time), BLE beacons or Mappedin VPS, and use the phone's barometer to confirm the floor.
- Save the spot with a QR code on each parking pillar instead of a tap on the map.
- Plug in the mall's own data: parking rates, EV chargers, the nearest exit to each store.

---

Built by **Felipe Chavarri** (Lima, Peru) · [atlas-lac.com](https://www.atlas-lac.com)
Map data and SDK © Mappedin. The demo credentials are the public ones from Mappedin's developer docs.
