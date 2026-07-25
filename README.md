# 3D Solar System Simulation

An interactive Windows 11-friendly Three.js simulation of the solar system. It includes the Sun, eight planets, five officially recognized dwarf planets, 24 selectable moons, three large main-belt asteroids (Vesta, Pallas, Hygiea), ring systems, the main asteroid belt, the Kuiper Belt, the Oort Cloud, and three comets (1P/Halley, 2P/Encke, 67P/Churyumov-Gerasimenko).

The app is designed as a local static browser experience: no build step, no npm install, and no internet connection required after cloning because Three.js is vendored in `vendor/`.

![Desktop view of the 3D solar system simulator](qa-desktop.png)

## Features

- Interactive 3D scene with orbit controls, zoom, pan, object labels, and a simulation clock.
- Selectable bodies and regions with explanations, source links, and physical/orbital stats.
- Elliptical orbits solved from Kepler's equation using semimajor axis, eccentricity, inclination, node, argument of perihelion, and sidereal period, so each ellipse is oriented in space rather than sharing one axis with every other orbit.
- Tilted planetary spin axes, tidally locked moons that keep one face toward their planet, visible ring systems, and expanded moon systems for major satellites.
- Searchable object list covering 54 selectable items, including small moons of Pluto, Eris, Haumea, and Makemake.
- Detailed procedural textures with recognizable landmarks: Earth's continents and rotating cloud deck, Jupiter's Great Red Spot, Mars's Valles Marineris and Tharsis volcanoes, Pluto's heart, Iapetus's two-tone surface, Enceladus's tiger stripes, and more.
- Bump-mapped cratered terrain, lumpy irregular meshes for small moons, asteroids, and comet nuclei, and atmospheres that glow along the sunlit limb and flare when a world is backlit.
- Rings lit by their own sun angle, with the planet's shadow falling across them and dimmer light transmitted through the unlit face. Saturn's rings include the Cassini Division, Encke gap, and F ring, with distinct styles for Jupiter, Uranus, Neptune, and Haumea.
- Tumbling 3D debris fields in the asteroid belt and Kuiper Belt, a Milky Way band in a starfield that stays fixed at infinity, and a pulsing solar corona sized to stay clear of Mercury.
- Comets with distance-dependent activity: a two-part coma, a narrow ion tail locked to the anti-solar direction, and a broader dust tail that curves back along the comet's track. All of it grows toward perihelion and fades to a bare nucleus in the outer system.
- Orbit paths tinted per body that brighten just behind their body, so direction of travel is readable at a glance, and a camera-facing reticle marking the current selection.
- Logarithmic speed slider from about 15 simulated minutes per second up to 400 days per second, with one-click presets (1 hr/s to 1 yr/s). The default pace is 1 day per second.
- Selecting an object frames it from its sunlit side, close enough to see surface detail, with ringed planets approached from above their ring plane.
- Responsive layout verified at desktop and mobile-sized viewports.

## Run on Windows 11

Double-click `Start-SolarSystem.cmd`.

Or run this from PowerShell:

```powershell
.\Start-SolarSystem.ps1
```

The launcher starts a local server on `http://127.0.0.1:8765/` or the next open port, opens your default browser, and serves the app from this folder. Press `Ctrl+C` in the terminal to stop the server.

## Run from Any Local Web Server

Because the app uses JavaScript modules, open it through a local web server rather than by double-clicking `index.html`.

Example with Python:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8765/
```

## Controls

- Object list: choose any body, moon, comet, or region.
- Search: filter selectable objects.
- Pause/Play: stop or resume the simulation clock. Pausing freezes orbits, spin, and belt tumble together.
- Speed: logarithmic slider for simulated time per real second, plus preset buttons (1 hr/s, 6 hr/s, 1 day/s, 1 wk/s, 1 yr/s). At speeds below 3 days per second the date chip also shows the simulated time of day.
- Track: keep the camera target on the selected object.
- Labels: show or hide scene labels.
- Orbits: show or hide orbital paths without hiding planetary rings or the asteroid/comet populations.
- Reset: return to the default date and camera view.
- Mouse/touch: drag to orbit, scroll/pinch to zoom, and pan with standard browser gestures.
- Keyboard: Space toggles play/pause, L toggles labels, O toggles orbits, T toggles tracking, and R resets the view.

## Scientific Scope

The simulation data was reviewed in June 2026. It uses real-world orbital and physical metadata where practical:

- Radius
- Semimajor axis
- Eccentricity
- Inclination
- Longitude of the ascending node and argument of perihelion, for heliocentric orbits
- Sidereal orbital period
- Rotation period and retrograde direction where applicable
- Axial tilt where known
- Current moon counts
- Major ring systems

Orbit orientations use approximate J2000 elements. The eight planets, Pluto, and the three comets also carry a mean anomaly at the J2000 epoch, which is propagated with Kepler's equation, so their positions roughly track the simulated date; expect degree-level agreement for the planets and rougher agreement for the comets. Remaining small bodies keep an arbitrary starting angle that only spreads them apart. This is a teaching model, not an ephemeris.

The rendered scene uses visual compression. True solar-system distances and true body sizes cannot both be shown in a practical interactive view because the Sun, planets, moons, dwarf planets, and outer reservoirs differ by many orders of magnitude. The details panel preserves real values while the 3D scene keeps objects visible and selectable.

Axial spin has a display ceiling. Earth turns once per simulated day, so at 1 day per second an uncorrected planet would spin a full turn every real second and strobe into a grey blur. Each body spins at its true rate until it reaches that ceiling and then saturates instead of aliasing: for Earth's 24-hour day that happens above about 0.17 days per second, and sooner for faster rotators such as Jupiter. Orbital motion and the clock stay exact at every speed; only spin becomes indicative once the ceiling is reached.

## Current Moon Counts

- Mercury: 0
- Venus: 0
- Earth: 1
- Mars: 2
- Jupiter: 101 IAU-recognized moons, following NASA's April 2026 Jupiter moon page and the IAU/MPC March 2026 announcement.
- Saturn: 285 known moons, following the IAU/MPC March 2026 announcement. NASA's Saturn moon page still describes the March 2025 count of 274.
- Uranus: 29 known moons, following NASA's August 2025 Webb discovery report for S/2025 U1.
- Neptune: 16 known moons, following NASA.

## Project Structure

```text
.
├── index.html                 # App shell and import map
├── styles.css                 # Responsive interface styling
├── Start-SolarSystem.cmd      # Double-click Windows launcher
├── Start-SolarSystem.ps1      # PowerShell local server
├── js/
│   ├── main.js                # Three.js rendering, animation, selection, UI wiring
│   ├── textures.js            # Procedural texture painters, ring/glow textures
│   └── solarData.js           # Solar-system data, descriptions, and source metadata
├── vendor/
│   ├── three.module.js        # Vendored Three.js 0.184.0 module
│   ├── three.core.js          # Three.js core module dependency
│   ├── OrbitControls.js       # Three.js orbit controls
│   └── THREE-LICENSE.txt      # Three.js MIT license
├── qa-desktop.png             # Desktop QA screenshot
└── qa-mobile.png              # Mobile viewport QA screenshot
```

## Validation

The app was checked locally before publication:

- JavaScript syntax checks passed for `js/main.js` and `js/solarData.js`.
- `Start-SolarSystem.ps1` parsed successfully.
- The app served successfully from `http://127.0.0.1:8765/`.
- Headless Chromium QA passed at desktop and mobile viewport sizes: the app reached its `ready` boot phase with no boot error, no animation-frame error, and no uncaught window errors.
- WebGL canvas rendered nonblank pixels in automated sampling.
- Object selection updated the details panel, including S/2025 U1.
- Kepler propagation was spot-checked against the data: advancing the clock 240 days puts 2P/Encke at 0.34 AU, matching its 0.336 AU perihelion.
- No horizontal overflow or panel overlap was detected in QA.

![Mobile view of the 3D solar system simulator](qa-mobile.png)

## Primary Sources

- NASA Solar System Exploration: https://science.nasa.gov/solar-system/
- NASA About the Planets: https://science.nasa.gov/solar-system/planets/
- NASA GSFC NSSDCA Planetary Fact Sheets: https://science.gsfc.nasa.gov/solarsystem/dataarchives/projects/629/
- NASA Jupiter Moons: https://science.nasa.gov/jupiter/jupiter-moons/
- IAU/MPC March 2026 moon announcement: https://www.iau.org/IAU/IAU/News/Ann2026/MPC-New-Moons-Saturn-Jupiter.aspx
- NASA Saturn Moons: https://science.nasa.gov/saturn/moons/
- NASA Uranus Moons: https://science.nasa.gov/uranus/moons/
- NASA Webb discovery of Uranus moon S/2025 U1: https://science.nasa.gov/blogs/webb/2025/08/19/new-moon-discovered-orbiting-uranus-using-nasas-webb-telescope/
- NASA Neptune Moons: https://science.nasa.gov/neptune/moons/
- NASA Kuiper Belt: https://science.nasa.gov/solar-system/kuiper-belt/
- NASA Oort Cloud: https://science.nasa.gov/solar-system/oort-cloud/
- NASA 1P/Halley: https://science.nasa.gov/solar-system/comets/1p-halley/

## Notes

This is an educational simulation, not a precision ephemeris. Orbital periods, relative ordering, eccentricities, inclinations, and science metadata are grounded in current references, while rendered sizes, distances, moon orbit radii, the Oort Cloud, and visual textures are intentionally adjusted for legibility and interaction.
