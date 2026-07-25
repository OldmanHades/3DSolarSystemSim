export const REVIEWED_AT = "June 2026";

/*
 * Orbit orientation fields, where present, are approximate J2000 osculating
 * elements (JPL "Keplerian elements for approximate positions" style):
 *
 *   nodeDeg        - longitude of the ascending node, measured in the ecliptic
 *   argPeriDeg     - argument of perihelion, measured from the ascending node
 *   meanAnomalyDeg - mean anomaly at the J2000 epoch (2000-01-01 12:00 TT)
 *
 * They orient each ellipse in space so perihelia no longer all line up along a
 * single axis. Objects without meanAnomalyDeg fall back to `phase`, an
 * arbitrary starting angle in radians used only to spread bodies apart.
 * This is a teaching model, not an ephemeris: expect degree-level agreement
 * for the planets and rougher agreement for small bodies.
 */

export const SCIENCE_SOURCES = {
  nasaFactSheets: {
    label: "NASA GSFC NSSDCA Planetary Fact Sheets",
    url: "https://science.gsfc.nasa.gov/solarsystem/dataarchives/projects/629/"
  },
  nasaSolarSystem: {
    label: "NASA Solar System Exploration",
    url: "https://science.nasa.gov/solar-system/"
  },
  nasaPlanets: {
    label: "NASA About the Planets",
    url: "https://science.nasa.gov/solar-system/planets/"
  },
  nasaJupiterMoons: {
    label: "NASA Jupiter Moons, updated Apr. 14, 2026",
    url: "https://science.nasa.gov/jupiter/jupiter-moons/"
  },
  iauMpc2026: {
    label: "IAU/MPC new Jupiter and Saturn moons, Mar. 26, 2026",
    url: "https://www.iau.org/IAU/IAU/News/Ann2026/MPC-New-Moons-Saturn-Jupiter.aspx"
  },
  nasaSaturnMoons: {
    label: "NASA Saturn Moons",
    url: "https://science.nasa.gov/saturn/moons/"
  },
  nasaUranusMoons: {
    label: "NASA Uranus Moons",
    url: "https://science.nasa.gov/uranus/moons/"
  },
  nasaUranusWebb2025: {
    label: "NASA Webb discovery of Uranus moon S/2025 U1, Aug. 19, 2025",
    url: "https://science.nasa.gov/blogs/webb/2025/08/19/new-moon-discovered-orbiting-uranus-using-nasas-webb-telescope/"
  },
  nasaNeptuneMoons: {
    label: "NASA Neptune Moons",
    url: "https://science.nasa.gov/neptune/moons/"
  },
  nasaKuiper: {
    label: "NASA Kuiper Belt",
    url: "https://science.nasa.gov/solar-system/kuiper-belt/"
  },
  nasaOort: {
    label: "NASA Oort Cloud",
    url: "https://science.nasa.gov/solar-system/oort-cloud/"
  },
  nasaHalley: {
    label: "NASA 1P/Halley",
    url: "https://science.nasa.gov/solar-system/comets/1p-halley/"
  },
  nasaAsteroids: {
    label: "NASA Asteroids",
    url: "https://science.nasa.gov/solar-system/asteroids/"
  },
  nasaComets: {
    label: "NASA Comets",
    url: "https://science.nasa.gov/solar-system/comets/"
  },
  jplSmallBody: {
    label: "JPL Solar System Dynamics / Small-Body Database",
    url: "https://ssd.jpl.nasa.gov/"
  }
};

const planetSources = ["nasaFactSheets", "nasaSolarSystem", "nasaPlanets"];

export const BODIES = [
  {
    id: "sun",
    name: "Sun",
    category: "Star",
    className: "G-type main-sequence star",
    radiusKm: 695700,
    rotationHours: 648,
    axialTiltDeg: 7.25,
    color: "#ffd06b",
    texture: "sun",
    sourceIds: ["nasaSolarSystem", "nasaFactSheets"],
    summary: "The Sun contains almost all of the solar system's mass and supplies the gravity, light, solar wind, and energy that shape every other object here.",
    details: [
      "The simulation keeps the Sun visually smaller than a true scale model would require so the inner planets remain usable.",
      "Solar rotation is differential. The app uses an approximate 27-day equatorial rotation period for animation.",
      "The visible corona and glow are illustrative; the orbital motion is driven by each object's sidereal period around the Sun."
    ]
  },
  {
    id: "mercury",
    name: "Mercury",
    category: "Planet",
    className: "Terrestrial planet",
    radiusKm: 2439.7,
    semiMajorAU: 0.3871,
    eccentricity: 0.2056,
    inclinationDeg: 7.005,
    nodeDeg: 48.331,
    argPeriDeg: 29.125,
    meanAnomalyDeg: 174.795,
    orbitalPeriodDays: 87.969,
    rotationHours: 1407.6,
    axialTiltDeg: 0.034,
    meanTempC: 167,
    moons: 0,
    color: "#9c9287",
    texture: "mercury",
    phase: 0.1,
    sourceIds: planetSources,
    summary: "Mercury is the smallest planet and the nearest to the Sun, with the most eccentric orbit of the eight planets.",
    details: [
      "Its 3:2 spin-orbit resonance means it rotates three times for every two trips around the Sun.",
      "The large eccentricity is represented in the orbit line, so the Sun is visibly off-center in Mercury's path.",
      "Mercury has no confirmed natural moons and almost no atmosphere to spread heat around the planet."
    ]
  },
  {
    id: "venus",
    name: "Venus",
    category: "Planet",
    className: "Terrestrial planet",
    radiusKm: 6051.8,
    semiMajorAU: 0.7233,
    eccentricity: 0.0068,
    inclinationDeg: 3.394,
    nodeDeg: 76.68,
    argPeriDeg: 54.884,
    meanAnomalyDeg: 50.416,
    orbitalPeriodDays: 224.701,
    rotationHours: -5832.5,
    axialTiltDeg: 177.36,
    meanTempC: 464,
    moons: 0,
    color: "#d8b26e",
    texture: "venus",
    atmosphere: { color: "#e8c87a", intensity: 0.5 },
    phase: 1.2,
    sourceIds: planetSources,
    summary: "Venus is nearly Earth-sized but rotates backward under a dense carbon dioxide atmosphere with runaway greenhouse heating.",
    details: [
      "The negative rotation period is used to animate retrograde spin.",
      "Its orbit is close to circular compared with Mercury and Mars.",
      "The cloud texture represents a permanent sulfuric-acid cloud deck rather than a visible solid surface."
    ]
  },
  {
    id: "earth",
    name: "Earth",
    category: "Planet",
    className: "Terrestrial planet",
    radiusKm: 6371,
    semiMajorAU: 1,
    eccentricity: 0.0167,
    inclinationDeg: 0,
    nodeDeg: 348.739,
    argPeriDeg: 114.208,
    meanAnomalyDeg: 357.517,
    orbitalPeriodDays: 365.256,
    rotationHours: 23.934,
    axialTiltDeg: 23.44,
    meanTempC: 15,
    moons: 1,
    color: "#4e8fdc",
    texture: "earth",
    atmosphere: { color: "#6ab6ff", intensity: 0.6 },
    phase: 2.3,
    sourceIds: planetSources,
    summary: "Earth is the reference plane for this model and the only known world with life.",
    details: [
      "Earth's axial tilt is shown by the tilted spin axis and is the main reason for seasonal sunlight patterns.",
      "The Moon is modeled as a selectable satellite in orbit around Earth.",
      "The blue, green, and cloud bands are a procedural visual texture, not a live satellite image."
    ],
    satellites: [
      {
        id: "moon",
        name: "Moon",
        category: "Moon",
        className: "Earth's natural satellite",
        radiusKm: 1737.4,
        orbitKm: 384400,
        orbitalPeriodDays: 27.3217,
        rotationHours: 655.7,
        axialTiltDeg: 6.68,
        color: "#c9c4b7",
        texture: "moon",
        phase: 0,
        sourceIds: ["nasaFactSheets", "nasaSolarSystem"],
        summary: "The Moon stabilizes Earth's axial wobble, drives ocean tides, and keeps the same hemisphere facing Earth through synchronous rotation.",
        details: [
          "The Moon's orbit is expanded visually so it can be selected and inspected.",
          "Its sidereal orbital period is about 27.3 Earth days.",
          "The Moon is large relative to Earth compared with most planet-moon systems."
        ]
      }
    ]
  },
  {
    id: "mars",
    name: "Mars",
    category: "Planet",
    className: "Terrestrial planet",
    radiusKm: 3389.5,
    semiMajorAU: 1.5237,
    eccentricity: 0.0934,
    inclinationDeg: 1.85,
    nodeDeg: 49.558,
    argPeriDeg: 286.483,
    meanAnomalyDeg: 19.412,
    orbitalPeriodDays: 686.98,
    rotationHours: 24.623,
    axialTiltDeg: 25.19,
    meanTempC: -65,
    moons: 2,
    color: "#c8643f",
    texture: "mars",
    atmosphere: { color: "#d8956a", intensity: 0.2 },
    phase: 3.1,
    sourceIds: planetSources,
    summary: "Mars is a cold desert world with polar caps, dust storms, extinct volcanoes, and two small captured-looking moons.",
    details: [
      "Mars has a noticeably eccentric orbit, shown as an ellipse in the scene.",
      "Its day is only slightly longer than Earth's, while its year is almost twice as long.",
      "Phobos and Deimos are included as selectable small moons with enlarged display sizes."
    ],
    satellites: [
      {
        id: "phobos",
        name: "Phobos",
        category: "Moon",
        className: "Inner Martian moon",
        radiusKm: 11.1,
        orbitKm: 9376,
        orbitalPeriodDays: 0.3189,
        rotationHours: 7.65,
        color: "#8f8075",
        texture: "rocky",
        phase: 0.5,
        sourceIds: ["nasaFactSheets"],
        summary: "Phobos orbits Mars faster than Mars rotates, so it rises in the west and sets in the east from the Martian surface.",
        details: [
          "It is much too small to render at true scale in this view, so its display size is exaggerated.",
          "Phobos is slowly spiraling inward and will eventually break apart or impact Mars.",
          "Its lumpy shape is represented with a slightly irregular mesh."
        ]
      },
      {
        id: "deimos",
        name: "Deimos",
        category: "Moon",
        className: "Outer Martian moon",
        radiusKm: 6.2,
        orbitKm: 23463,
        orbitalPeriodDays: 1.262,
        rotationHours: 30.3,
        color: "#a19386",
        texture: "rocky",
        phase: 2.1,
        sourceIds: ["nasaFactSheets"],
        summary: "Deimos is the smaller, more distant moon of Mars and appears more asteroid-like than planet-like.",
        details: [
          "Its orbit is shown wider than Phobos, matching the real orbital order.",
          "The orbital period is about 30 hours.",
          "Like Phobos, Deimos is displayed larger than scale for visibility."
        ]
      }
    ]
  },
  {
    id: "jupiter",
    name: "Jupiter",
    category: "Planet",
    className: "Gas giant",
    radiusKm: 69911,
    semiMajorAU: 5.2028,
    eccentricity: 0.0489,
    inclinationDeg: 1.304,
    nodeDeg: 100.464,
    argPeriDeg: 274.289,
    meanAnomalyDeg: 19.651,
    orbitalPeriodDays: 4332.589,
    rotationHours: 9.925,
    axialTiltDeg: 3.13,
    meanTempC: -110,
    moons: 101,
    rings: { inner: 1.28, outer: 2.25, color: "#a89470", opacity: 0.18, style: "jupiter" },
    color: "#d5aa79",
    texture: "jupiter",
    atmosphere: { color: "#e3c79c", intensity: 0.26 },
    phase: 0.65,
    sourceIds: ["nasaFactSheets", "nasaJupiterMoons", "iauMpc2026"],
    summary: "Jupiter is the largest planet, a fast-spinning gas giant with faint rings, powerful magnetism, and 101 IAU-recognized moons as of March 2026.",
    details: [
      "The four Galilean moons are modeled and selectable because they dominate the mass of Jupiter's satellite system.",
      "Jupiter's rapid rotation flattens the planet slightly and drives visible atmospheric bands.",
      "The current moon count follows NASA's April 2026 Jupiter page and the IAU/MPC March 2026 announcement."
    ],
    satellites: [
      {
        id: "amalthea",
        name: "Amalthea",
        category: "Moon",
        className: "Inner Jovian moon",
        radiusKm: 83.5,
        orbitKm: 181366,
        orbitalPeriodDays: 0.498,
        rotationHours: 11.95,
        color: "#b0705a",
        texture: "rocky",
        phase: 5.1,
        sourceIds: ["nasaJupiterMoons", "nasaFactSheets"],
        summary: "Amalthea is a small, reddish, irregularly shaped moon orbiting inside Io, one of the reddest objects in the solar system.",
        details: [
          "It circles Jupiter in about 12 hours, closer than any of the Galilean moons.",
          "Its red color likely comes from sulfur swept off Io.",
          "The lumpy display mesh reflects its irregular potato-like shape."
        ]
      },
      {
        id: "io",
        name: "Io",
        category: "Moon",
        className: "Galilean moon",
        radiusKm: 1821.6,
        orbitKm: 421800,
        orbitalPeriodDays: 1.769,
        rotationHours: 42.46,
        color: "#e6c568",
        texture: "io",
        phase: 0.2,
        sourceIds: ["nasaJupiterMoons", "nasaFactSheets"],
        summary: "Io is the most volcanically active world in the solar system, heated by tidal flexing from Jupiter and neighboring moons.",
        details: [
          "It is the innermost of the four Galilean moons.",
          "The yellow-orange texture hints at sulfur-rich volcanic deposits.",
          "Its orbit is enlarged but keeps the correct order relative to Europa, Ganymede, and Callisto."
        ]
      },
      {
        id: "europa",
        name: "Europa",
        category: "Moon",
        className: "Galilean moon",
        radiusKm: 1560.8,
        orbitKm: 671100,
        orbitalPeriodDays: 3.551,
        rotationHours: 85.23,
        color: "#d8d5c7",
        texture: "europa",
        phase: 1.4,
        sourceIds: ["nasaJupiterMoons", "nasaFactSheets"],
        summary: "Europa is an icy moon with strong evidence for a global subsurface ocean, making it a major astrobiology target.",
        details: [
          "The light cracked texture represents an ice shell, not a rocky surface.",
          "Europa orbits between Io and Ganymede.",
          "NASA's Europa Clipper mission is focused on studying Europa's habitability."
        ]
      },
      {
        id: "ganymede",
        name: "Ganymede",
        category: "Moon",
        className: "Galilean moon",
        radiusKm: 2634.1,
        orbitKm: 1070400,
        orbitalPeriodDays: 7.155,
        rotationHours: 171.7,
        color: "#a8a19a",
        texture: "ganymede",
        phase: 2.7,
        sourceIds: ["nasaJupiterMoons", "nasaFactSheets"],
        summary: "Ganymede is the largest moon in the solar system, larger than Mercury, and the only moon known to have its own magnetic field.",
        details: [
          "Its display size is intentionally prominent because it is physically planet-scale.",
          "Ganymede is third in orbital order among the Galilean moons.",
          "It likely contains internal layers of ice, liquid water, and rock."
        ]
      },
      {
        id: "callisto",
        name: "Callisto",
        category: "Moon",
        className: "Galilean moon",
        radiusKm: 2410.3,
        orbitKm: 1882700,
        orbitalPeriodDays: 16.689,
        rotationHours: 400.5,
        color: "#766c63",
        texture: "callisto",
        phase: 4.4,
        sourceIds: ["nasaJupiterMoons", "nasaFactSheets"],
        summary: "Callisto is heavily cratered and orbits farthest out among the four Galilean moons.",
        details: [
          "Its ancient surface preserves a long impact history.",
          "The app shows it as the outermost Galilean satellite.",
          "Callisto is less strongly tidally heated than Io, Europa, and Ganymede."
        ]
      }
    ]
  },
  {
    id: "saturn",
    name: "Saturn",
    category: "Planet",
    className: "Gas giant",
    radiusKm: 58232,
    semiMajorAU: 9.5367,
    eccentricity: 0.0565,
    inclinationDeg: 2.485,
    nodeDeg: 113.666,
    argPeriDeg: 338.766,
    meanAnomalyDeg: 317.512,
    orbitalPeriodDays: 10759.22,
    rotationHours: 10.656,
    axialTiltDeg: 26.73,
    meanTempC: -140,
    moons: 285,
    rings: { inner: 1.24, outer: 2.28, color: "#d8c394", opacity: 0.58, style: "saturn" },
    color: "#d7bd82",
    texture: "saturn",
    atmosphere: { color: "#e8d6a8", intensity: 0.24 },
    phase: 1.7,
    sourceIds: ["nasaFactSheets", "nasaSaturnMoons", "iauMpc2026"],
    summary: "Saturn is the ringed gas giant. The app uses the IAU/MPC March 2026 count of 285 known Saturnian moons.",
    details: [
      "NASA's Saturn page still lists 274 moons from March 2025; the IAU/MPC announced 11 more in March 2026.",
      "The rings are shown in Saturn's equatorial plane, so their apparent tilt follows Saturn's axial tilt.",
      "Titan and Enceladus are highlighted because they are major destinations in planetary science."
    ],
    satellites: [
      {
        id: "mimas",
        name: "Mimas",
        category: "Moon",
        className: "Inner major Saturn moon",
        radiusKm: 198.2,
        orbitKm: 185539,
        orbitalPeriodDays: 0.942,
        rotationHours: 22.6,
        color: "#b8b0a0",
        texture: "cratered",
        phase: 0.7,
        sourceIds: ["nasaSaturnMoons", "nasaFactSheets"],
        summary: "Mimas is a small icy moon best known for its enormous Herschel crater.",
        details: [
          "It is represented as one of the inner major moons of Saturn.",
          "The surface is far too small for true scale in this scene, so display size is boosted.",
          "Its short orbital period places it close to Saturn."
        ]
      },
      {
        id: "enceladus",
        name: "Enceladus",
        category: "Moon",
        className: "Ocean world",
        radiusKm: 252.1,
        orbitKm: 238020,
        orbitalPeriodDays: 1.37,
        rotationHours: 32.9,
        color: "#e8f2ff",
        texture: "enceladus",
        phase: 1.6,
        sourceIds: ["nasaSaturnMoons", "nasaFactSheets"],
        summary: "Enceladus is a bright icy moon with a global ocean beneath its shell and active plumes near its south pole.",
        details: [
          "The bright color reflects Enceladus's high-albedo icy surface.",
          "Its plume activity is a major reason it is considered a high-priority science destination.",
          "The orbit keeps its order outside Mimas and inside Titan."
        ]
      },
      {
        id: "tethys",
        name: "Tethys",
        category: "Moon",
        className: "Icy Saturn moon",
        radiusKm: 531.1,
        orbitKm: 294660,
        orbitalPeriodDays: 1.888,
        rotationHours: 45.3,
        color: "#cfc9bd",
        texture: "ice",
        phase: 2.3,
        sourceIds: ["nasaSaturnMoons", "nasaFactSheets"],
        summary: "Tethys is a bright, icy Saturn moon marked by the huge Odysseus crater and the vast Ithaca Chasma canyon.",
        details: [
          "Its density is so low that it is likely almost pure water ice.",
          "Ithaca Chasma stretches about three quarters of the way around the moon.",
          "Tethys orbits between Enceladus and Dione."
        ]
      },
      {
        id: "dione",
        name: "Dione",
        category: "Moon",
        className: "Icy Saturn moon",
        radiusKm: 561.4,
        orbitKm: 377400,
        orbitalPeriodDays: 2.737,
        rotationHours: 65.7,
        color: "#c4bfb4",
        texture: "ice",
        phase: 3.8,
        sourceIds: ["nasaSaturnMoons", "nasaFactSheets"],
        summary: "Dione is an icy moon with bright wispy ice-cliff streaks crossing its trailing hemisphere.",
        details: [
          "The wispy terrain is a network of bright tectonic ice cliffs.",
          "Dione shares its orbit with two small Trojan moons, Helene and Polydeuces.",
          "It orbits between Tethys and Rhea."
        ]
      },
      {
        id: "titan",
        name: "Titan",
        category: "Moon",
        className: "Large moon with atmosphere",
        radiusKm: 2574.7,
        orbitKm: 1221870,
        orbitalPeriodDays: 15.945,
        rotationHours: 382.7,
        color: "#c9924c",
        texture: "titan",
        atmosphere: { color: "#e8a34d", intensity: 0.5 },
        phase: 3.1,
        sourceIds: ["nasaSaturnMoons", "nasaFactSheets"],
        summary: "Titan is larger than Mercury and has a thick nitrogen atmosphere plus methane and ethane lakes.",
        details: [
          "The orange haze visual marks Titan's dense atmosphere.",
          "Titan is one of the largest moons in the solar system.",
          "NASA selected Titan as the destination for the Dragonfly rotorcraft mission."
        ]
      },
      {
        id: "rhea",
        name: "Rhea",
        category: "Moon",
        className: "Icy Saturn moon",
        radiusKm: 763.8,
        orbitKm: 527108,
        orbitalPeriodDays: 4.518,
        rotationHours: 108.4,
        color: "#c7c1b5",
        texture: "cratered",
        phase: 4.2,
        sourceIds: ["nasaSaturnMoons", "nasaFactSheets"],
        summary: "Rhea is Saturn's second-largest moon and a cratered icy body.",
        details: [
          "It is included to give Saturn's system a broader major-moon structure.",
          "Rhea orbits between Dione and Titan in the real Saturn system.",
          "The app uses a simplified circular satellite orbit around Saturn."
        ]
      },
      {
        id: "iapetus",
        name: "Iapetus",
        category: "Moon",
        className: "Outer major Saturn moon",
        radiusKm: 734.5,
        orbitKm: 3560820,
        orbitalPeriodDays: 79.321,
        rotationHours: 1903.7,
        color: "#9f9588",
        texture: "iapetus",
        phase: 5.5,
        sourceIds: ["nasaSaturnMoons", "nasaFactSheets"],
        summary: "Iapetus is famous for its stark two-tone surface and distant, inclined orbit around Saturn.",
        details: [
          "Its orbit is shown wide relative to Titan to preserve the real outer order.",
          "The surface shader gives it a darker leading hemisphere and lighter trailing regions.",
          "Iapetus rotates synchronously with its long orbital period."
        ]
      }
    ]
  },
  {
    id: "uranus",
    name: "Uranus",
    category: "Planet",
    className: "Ice giant",
    radiusKm: 25362,
    semiMajorAU: 19.191,
    eccentricity: 0.0472,
    inclinationDeg: 0.773,
    nodeDeg: 74.006,
    argPeriDeg: 96.958,
    meanAnomalyDeg: 142.268,
    orbitalPeriodDays: 30685,
    rotationHours: -17.24,
    axialTiltDeg: 97.77,
    meanTempC: -195,
    moons: 29,
    rings: { inner: 1.55, outer: 2.05, color: "#8db7c2", opacity: 0.28, style: "uranus" },
    color: "#8ed6d7",
    texture: "uranus",
    atmosphere: { color: "#9fe0e4", intensity: 0.28 },
    phase: 2.5,
    sourceIds: ["nasaFactSheets", "nasaUranusMoons", "nasaUranusWebb2025"],
    summary: "Uranus is an ice giant with a sideways axial tilt, retrograde rotation, rings, and 29 known moons.",
    details: [
      "Its 97.77-degree axial tilt makes the rings and moon system appear tipped onto their side.",
      "The negative rotation period animates Uranus's retrograde spin.",
      "NASA/Webb reporting in August 2025 added the provisional moon S/2025 U1 to the Uranian system."
    ],
    satellites: [
      {
        id: "s2025u1",
        name: "S/2025 U1",
        category: "Moon",
        className: "Tiny inner Uranian moon",
        radiusKm: 5,
        orbitKm: 56000,
        orbitalPeriodDays: 0.402,
        color: "#9fb0b6",
        texture: "rocky",
        phase: 0.9,
        sourceIds: ["nasaUranusWebb2025"],
        summary: "S/2025 U1 is a tiny provisional Uranian moon discovered in Webb images taken in February 2025 and announced by NASA in August 2025.",
        details: [
          "NASA describes it as a newly discovered moon seen by Webb's NIRCam instrument.",
          "It is only about 10 kilometers across, so it is shown much larger than scale in the app.",
          "The discovery brought Uranus's known satellite family to 29 moons."
        ]
      },
      {
        id: "miranda",
        name: "Miranda",
        category: "Moon",
        className: "Major Uranian moon",
        radiusKm: 235.8,
        orbitKm: 129900,
        orbitalPeriodDays: 1.413,
        rotationHours: 33.9,
        color: "#bec3c4",
        texture: "ice",
        phase: 0.4,
        sourceIds: ["nasaUranusMoons", "nasaFactSheets"],
        summary: "Miranda is the smallest and innermost of Uranus's five major moons, with a strangely disrupted surface.",
        details: [
          "The orbit is tilted with Uranus's equatorial plane.",
          "Its surface is represented with pale icy terrain.",
          "Voyager 2 supplied the best close views of Miranda."
        ]
      },
      {
        id: "ariel",
        name: "Ariel",
        category: "Moon",
        className: "Major Uranian moon",
        radiusKm: 578.9,
        orbitKm: 191020,
        orbitalPeriodDays: 2.52,
        rotationHours: 60.5,
        color: "#cad0cf",
        texture: "ice",
        phase: 1.2,
        sourceIds: ["nasaUranusMoons", "nasaFactSheets"],
        summary: "Ariel is a bright Uranian moon with canyons and fault scarps crossing its icy terrain.",
        details: [
          "It is the second major moon outward from Uranus.",
          "The simplified orbit preserves relative order rather than exact inclination details.",
          "Ariel is one of the most geologically varied Uranian moons seen by Voyager 2."
        ]
      },
      {
        id: "umbriel",
        name: "Umbriel",
        category: "Moon",
        className: "Major Uranian moon",
        radiusKm: 584.7,
        orbitKm: 266000,
        orbitalPeriodDays: 4.144,
        rotationHours: 99.5,
        color: "#7d8587",
        texture: "cratered",
        phase: 2.6,
        sourceIds: ["nasaUranusMoons", "nasaFactSheets"],
        summary: "Umbriel is a dark, heavily cratered moon of Uranus.",
        details: [
          "Its darker tone distinguishes it from Ariel and Titania.",
          "Umbriel is the third of the five major Uranian moons outward from the planet.",
          "The surface record suggests an old icy crust."
        ]
      },
      {
        id: "titania",
        name: "Titania",
        category: "Moon",
        className: "Major Uranian moon",
        radiusKm: 788.9,
        orbitKm: 436300,
        orbitalPeriodDays: 8.706,
        rotationHours: 208.9,
        color: "#aeb5b5",
        texture: "ice",
        phase: 3.5,
        sourceIds: ["nasaUranusMoons", "nasaFactSheets"],
        summary: "Titania is the largest moon of Uranus.",
        details: [
          "It is represented with a larger radius than the other Uranian moons in the scene.",
          "Its orbit is fourth outward among the five major Uranian moons.",
          "Voyager 2 images show fault valleys that imply past internal activity."
        ]
      },
      {
        id: "oberon",
        name: "Oberon",
        category: "Moon",
        className: "Major Uranian moon",
        radiusKm: 761.4,
        orbitKm: 583500,
        orbitalPeriodDays: 13.463,
        rotationHours: 323.1,
        color: "#9fa5a7",
        texture: "cratered",
        phase: 4.7,
        sourceIds: ["nasaUranusMoons", "nasaFactSheets"],
        summary: "Oberon is the outermost of Uranus's five major moons.",
        details: [
          "Its wide orbit around Uranus is exaggerated for selection.",
          "The cratered texture reflects an old icy surface.",
          "Oberon is close in size to Titania but slightly smaller."
        ]
      }
    ]
  },
  {
    id: "neptune",
    name: "Neptune",
    category: "Planet",
    className: "Ice giant",
    radiusKm: 24622,
    semiMajorAU: 30.07,
    eccentricity: 0.0086,
    inclinationDeg: 1.77,
    nodeDeg: 131.784,
    argPeriDeg: 273.187,
    meanAnomalyDeg: 259.909,
    orbitalPeriodDays: 60190,
    rotationHours: 16.11,
    axialTiltDeg: 28.32,
    meanTempC: -200,
    moons: 16,
    rings: { inner: 1.7, outer: 2.15, color: "#5378b8", opacity: 0.24, style: "neptune" },
    color: "#3b6bdc",
    texture: "neptune",
    atmosphere: { color: "#5d86e8", intensity: 0.32 },
    phase: 3.2,
    sourceIds: ["nasaFactSheets", "nasaNeptuneMoons"],
    summary: "Neptune is the outermost planet, an ice giant with supersonic winds, faint rings, and 16 known moons.",
    details: [
      "Neptune's orbit is almost circular compared with many dwarf-planet and comet orbits.",
      "Triton is included because it dominates Neptune's moon system and has a retrograde orbit.",
      "Neptune completed its first observed orbit since discovery in 2011."
    ],
    satellites: [
      {
        id: "proteus",
        name: "Proteus",
        category: "Moon",
        className: "Irregular inner Neptune moon",
        radiusKm: 210,
        orbitKm: 117646,
        orbitalPeriodDays: 1.122,
        rotationHours: 26.9,
        color: "#6f6a66",
        texture: "rocky",
        phase: 4.4,
        sourceIds: ["nasaNeptuneMoons", "nasaFactSheets"],
        summary: "Proteus is Neptune's second-largest moon, a dark, boxy body about as large as an object can be without becoming round.",
        details: [
          "It was discovered by Voyager 2 in 1989 despite being larger than Nereid, because it orbits so close to Neptune's glare.",
          "Its albedo is among the lowest of any moon in the solar system.",
          "The lumpy display mesh reflects its distinctly non-spherical shape."
        ]
      },
      {
        id: "triton",
        name: "Triton",
        category: "Moon",
        className: "Captured moon",
        radiusKm: 1353.4,
        orbitKm: 354759,
        orbitalPeriodDays: -5.877,
        rotationHours: -141,
        color: "#d7d0be",
        texture: "triton",
        atmosphere: { color: "#bcd8e8", intensity: 0.15 },
        phase: 0.2,
        sourceIds: ["nasaNeptuneMoons", "nasaFactSheets"],
        summary: "Triton is Neptune's largest moon and orbits backward, strong evidence that it was captured from the Kuiper Belt.",
        details: [
          "The negative orbital period animates the moon retrograde around Neptune.",
          "Triton is large enough to be rounded by gravity.",
          "Voyager 2 observed nitrogen geyser-like plumes on Triton."
        ]
      },
      {
        id: "nereid",
        name: "Nereid",
        category: "Moon",
        className: "Irregular Neptune moon",
        radiusKm: 170,
        orbitKm: 5513818,
        orbitalPeriodDays: 360.13,
        rotationHours: 277,
        color: "#a5a8ad",
        texture: "rocky",
        phase: 2.8,
        sourceIds: ["nasaNeptuneMoons", "nasaFactSheets"],
        summary: "Nereid is an irregular outer moon of Neptune with a highly eccentric orbit.",
        details: [
          "The app shows Nereid on a wide simplified orbit to distinguish it from Triton.",
          "Its real orbit is dynamically more complex than this circular satellite path.",
          "Nereid was discovered in 1949, decades before Voyager 2 revealed many inner moons."
        ]
      }
    ]
  },
  {
    id: "ceres",
    name: "Ceres",
    category: "Dwarf planet",
    className: "Asteroid-belt dwarf planet",
    radiusKm: 469.7,
    semiMajorAU: 2.767,
    eccentricity: 0.0758,
    inclinationDeg: 10.59,
    nodeDeg: 80.3,
    argPeriDeg: 73.6,
    orbitalPeriodDays: 1680.5,
    rotationHours: 9.074,
    axialTiltDeg: 4,
    moons: 0,
    color: "#8f8880",
    texture: "ceres",
    phase: 1.9,
    sourceIds: ["nasaPlanets", "nasaFactSheets"],
    summary: "Ceres is the largest object in the main asteroid belt and the only officially recognized dwarf planet in the inner solar system.",
    details: [
      "It is placed within the asteroid belt between Mars and Jupiter.",
      "Ceres is much smaller than the Moon but large enough to be nearly round.",
      "NASA's Dawn mission found bright salt-rich deposits on Ceres."
    ]
  },
  {
    id: "pluto",
    name: "Pluto",
    category: "Dwarf planet",
    className: "Kuiper Belt dwarf planet",
    radiusKm: 1188.3,
    semiMajorAU: 39.482,
    eccentricity: 0.2488,
    inclinationDeg: 17.16,
    nodeDeg: 110.299,
    argPeriDeg: 113.776,
    meanAnomalyDeg: 14.855,
    orbitalPeriodDays: 90560,
    rotationHours: -153.3,
    axialTiltDeg: 122.53,
    moons: 5,
    color: "#b98c6d",
    texture: "pluto",
    atmosphere: { color: "#9fc4e8", intensity: 0.16 },
    phase: 2.9,
    sourceIds: ["nasaPlanets", "nasaKuiper", "nasaFactSheets"],
    summary: "Pluto is a complex Kuiper Belt dwarf planet with a tilted, eccentric orbit and five known moons.",
    details: [
      "Pluto's eccentric orbit can bring it closer to the Sun than Neptune during part of its path, though their orbital resonance prevents collisions.",
      "The app includes Charon because Pluto and Charon form a notable binary-like system.",
      "The brown and pale texture nods to Pluto's nitrogen ice plains and darker terrains seen by New Horizons."
    ],
    satellites: [
      {
        id: "charon",
        name: "Charon",
        category: "Moon",
        className: "Large Pluto moon",
        radiusKm: 606,
        orbitKm: 19596,
        orbitalPeriodDays: 6.387,
        rotationHours: 153.3,
        color: "#a49487",
        texture: "charon",
        phase: 0.3,
        sourceIds: ["nasaPlanets", "nasaFactSheets"],
        summary: "Charon is so large compared with Pluto that the pair orbit a barycenter outside Pluto's surface.",
        details: [
          "Its orbit is enlarged visually for selection.",
          "Charon is tidally locked to Pluto.",
          "New Horizons revealed canyons, plains, and a dark polar region on Charon."
        ]
      },
      {
        id: "nix",
        name: "Nix",
        category: "Moon",
        className: "Small Pluto moon",
        radiusKm: 19.5,
        orbitKm: 48694,
        orbitalPeriodDays: 24.85,
        rotationHours: 43.9,
        color: "#cfc8c0",
        texture: "rocky",
        phase: 1.8,
        sourceIds: ["nasaPlanets", "jplSmallBody"],
        summary: "Nix is a small, elongated Pluto moon that tumbles chaotically because of the shifting gravity of the Pluto-Charon pair.",
        details: [
          "New Horizons imaged Nix in 2015, revealing a bright icy surface with a reddish region.",
          "Its rotation is chaotic rather than tidally locked; the displayed spin rate is an approximation.",
          "It is far too small for true scale here, so its display size is exaggerated."
        ]
      },
      {
        id: "hydra",
        name: "Hydra",
        category: "Moon",
        className: "Small outer Pluto moon",
        radiusKm: 20,
        orbitKm: 64738,
        orbitalPeriodDays: 38.2,
        rotationHours: 10.3,
        color: "#d2ccc4",
        texture: "rocky",
        phase: 4.9,
        sourceIds: ["nasaPlanets", "jplSmallBody"],
        summary: "Hydra is the outermost known moon of Pluto, an irregular icy body discovered with Charon's smaller siblings in 2005.",
        details: [
          "Hydra spins very fast and chaotically compared with a normal tidally locked moon.",
          "Its surface is dominated by relatively clean water ice.",
          "Like Nix, its display size is exaggerated for visibility."
        ]
      }
    ]
  },
  {
    id: "haumea",
    name: "Haumea",
    category: "Dwarf planet",
    className: "Fast-rotating Kuiper Belt dwarf planet",
    radiusKm: 816,
    semiMajorAU: 43.13,
    eccentricity: 0.1887,
    inclinationDeg: 28.21,
    nodeDeg: 122.17,
    argPeriDeg: 239.0,
    orbitalPeriodDays: 103410,
    rotationHours: 3.915,
    axialTiltDeg: null,
    moons: 2,
    rings: { inner: 1.7, outer: 2.05, color: "#bfc6cc", opacity: 0.22, style: "haumea" },
    color: "#c8cdd1",
    texture: "haumea",
    phase: 4.1,
    stretch: [1.35, 0.78, 0.92],
    sourceIds: ["nasaPlanets", "nasaKuiper", "nasaFactSheets"],
    summary: "Haumea is an elongated, very fast-spinning dwarf planet in the Kuiper Belt with two moons and a ring.",
    details: [
      "Its non-spherical shape is represented by stretching the mesh.",
      "Haumea's exact pole orientation remains less familiar to non-specialists than those of the major planets, so the app does not claim a precise axial tilt.",
      "The four-hour rotation is one of the fastest known for a large solar-system body."
    ],
    satellites: [
      {
        id: "hiiaka",
        name: "Hi'iaka",
        category: "Moon",
        className: "Outer Haumea moon",
        radiusKm: 160,
        orbitKm: 49880,
        orbitalPeriodDays: 49.12,
        rotationHours: 9.8,
        color: "#d8dce0",
        texture: "ice",
        phase: 1.1,
        sourceIds: ["nasaKuiper", "jplSmallBody"],
        summary: "Hi'iaka is the larger, outer moon of Haumea, coated in crystalline water ice like its parent.",
        details: [
          "It was likely blasted off Haumea in the giant impact that also spun the dwarf planet up.",
          "Its orbital period around Haumea is about 49 days.",
          "Size and orbit values carry more uncertainty than those of planetary moons."
        ]
      },
      {
        id: "namaka",
        name: "Namaka",
        category: "Moon",
        className: "Inner Haumea moon",
        radiusKm: 85,
        orbitKm: 25657,
        orbitalPeriodDays: 18.28,
        color: "#c8ccd2",
        texture: "ice",
        phase: 3.9,
        sourceIds: ["nasaKuiper", "jplSmallBody"],
        summary: "Namaka is the smaller, inner moon of Haumea on a noticeably eccentric, tilted orbit.",
        details: [
          "Its real orbit is elliptical and precessing; the app shows a simplified circular path.",
          "Namaka is roughly a tenth the mass of Hi'iaka.",
          "Both moons are named for Hawaiian deities, matching Haumea itself."
        ]
      }
    ]
  },
  {
    id: "makemake",
    name: "Makemake",
    category: "Dwarf planet",
    className: "Kuiper Belt dwarf planet",
    radiusKm: 715,
    semiMajorAU: 45.79,
    eccentricity: 0.159,
    inclinationDeg: 29.0,
    nodeDeg: 79.62,
    argPeriDeg: 296.0,
    orbitalPeriodDays: 111867,
    rotationHours: 22.83,
    axialTiltDeg: null,
    moons: 1,
    color: "#b77755",
    texture: "makemake",
    phase: 5.0,
    sourceIds: ["nasaPlanets", "nasaKuiper", "nasaFactSheets"],
    summary: "Makemake is a reddish Kuiper Belt dwarf planet, slightly smaller than Pluto and one of the brighter trans-Neptunian objects.",
    details: [
      "It is placed beyond Pluto's average distance in the Kuiper Belt region.",
      "Its orbit is tilted substantially relative to Earth's orbital plane.",
      "Its small dark moon MK2 is rendered as a selectable satellite with an exaggerated display size."
    ],
    satellites: [
      {
        id: "mk2",
        name: "MK2",
        category: "Moon",
        className: "Provisional Makemake moon",
        radiusKm: 87,
        orbitKm: 21000,
        orbitalPeriodDays: 12.4,
        color: "#4a4642",
        texture: "rocky",
        phase: 2.2,
        sourceIds: ["nasaKuiper", "jplSmallBody"],
        summary: "MK2 (S/2015 (136472) 1) is Makemake's charcoal-dark moon, spotted by Hubble in 2015.",
        details: [
          "Its surface is far darker than bright, frosty Makemake, which helped it hide for years.",
          "Orbit and size estimates remain provisional.",
          "The app shows a simplified circular orbit."
        ]
      }
    ]
  },
  {
    id: "eris",
    name: "Eris",
    category: "Dwarf planet",
    className: "Scattered-disk dwarf planet",
    radiusKm: 1163,
    semiMajorAU: 67.78,
    eccentricity: 0.441,
    inclinationDeg: 44.04,
    nodeDeg: 35.95,
    argPeriDeg: 151.4,
    orbitalPeriodDays: 203830,
    rotationHours: 25.9,
    axialTiltDeg: null,
    moons: 1,
    color: "#d7d2c4",
    texture: "eris",
    phase: 0.4,
    sourceIds: ["nasaPlanets", "nasaKuiper", "nasaFactSheets"],
    summary: "Eris is a distant dwarf planet whose discovery helped trigger the modern IAU planet definition debate.",
    details: [
      "Its orbit is highly inclined and eccentric compared with the eight planets.",
      "The app shows Eris farther out than the classical Kuiper Belt to emphasize its scattered-disk style orbit.",
      "Eris has one known moon, Dysnomia."
    ],
    satellites: [
      {
        id: "dysnomia",
        name: "Dysnomia",
        category: "Moon",
        className: "Eris's moon",
        radiusKm: 308,
        orbitKm: 37300,
        orbitalPeriodDays: 15.786,
        color: "#8d8781",
        texture: "cratered",
        phase: 0.9,
        sourceIds: ["nasaKuiper", "jplSmallBody"],
        summary: "Dysnomia is Eris's only known moon, dark and roughly 700 kilometers across.",
        details: [
          "Tracking Dysnomia's orbit is how astronomers weighed Eris and found it more massive than Pluto.",
          "It is much darker than its bright, icy parent.",
          "Size estimates carry significant uncertainty."
        ]
      }
    ]
  },
  {
    id: "vesta",
    name: "Vesta",
    category: "Asteroid",
    className: "Large main-belt asteroid",
    radiusKm: 262.7,
    semiMajorAU: 2.362,
    eccentricity: 0.0886,
    inclinationDeg: 7.142,
    nodeDeg: 103.81,
    argPeriDeg: 151.2,
    orbitalPeriodDays: 1325.9,
    rotationHours: 5.342,
    moons: 0,
    color: "#a89e8e",
    texture: "cratered",
    phase: 0.8,
    sourceIds: ["nasaAsteroids", "jplSmallBody"],
    summary: "Vesta is the second-most-massive body in the asteroid belt and the brightest asteroid visible from Earth.",
    details: [
      "NASA's Dawn spacecraft orbited Vesta in 2011-2012 and mapped its huge Rheasilvia impact basin.",
      "Vesta is differentiated like a small planet, with a crust, mantle, and iron core.",
      "Meteorites from Vesta (the HED family) have landed on Earth."
    ]
  },
  {
    id: "pallas",
    name: "Pallas",
    category: "Asteroid",
    className: "Large main-belt asteroid",
    radiusKm: 256,
    semiMajorAU: 2.771,
    eccentricity: 0.2299,
    inclinationDeg: 34.93,
    nodeDeg: 173.08,
    argPeriDeg: 310.05,
    orbitalPeriodDays: 1686,
    rotationHours: 7.813,
    moons: 0,
    color: "#8e8e94",
    texture: "cratered",
    phase: 2.4,
    sourceIds: ["nasaAsteroids", "jplSmallBody"],
    summary: "Pallas is the third-most-massive asteroid, on an unusually steep orbit tilted almost 35 degrees from the ecliptic.",
    details: [
      "Its extreme inclination is clearly visible in the rendered orbit line.",
      "Pallas was the second asteroid ever discovered, in 1802.",
      "Its heavily battered surface has been compared to a golf ball."
    ]
  },
  {
    id: "hygiea",
    name: "Hygiea",
    category: "Asteroid",
    className: "Outer main-belt asteroid",
    radiusKm: 217,
    semiMajorAU: 3.142,
    eccentricity: 0.112,
    inclinationDeg: 3.83,
    nodeDeg: 283.2,
    argPeriDeg: 312.32,
    orbitalPeriodDays: 2033,
    rotationHours: 13.83,
    moons: 0,
    color: "#7b7672",
    texture: "cratered",
    phase: 4.6,
    sourceIds: ["nasaAsteroids", "jplSmallBody"],
    summary: "Hygiea is the fourth-largest object in the asteroid belt, a dark carbonaceous body in the outer belt.",
    details: [
      "Observations suggest Hygiea is nearly spherical, prompting debate about dwarf-planet status.",
      "It is the largest member of one of the biggest asteroid families.",
      "Its dark surface reflects only about 7 percent of incoming sunlight."
    ]
  }
];

export const REGIONS = [
  {
    id: "asteroid-belt",
    name: "Main Asteroid Belt",
    category: "Region",
    className: "Rocky small-body reservoir",
    innerAU: 2.06,
    outerAU: 3.27,
    color: "#9a8772",
    sourceIds: ["nasaSolarSystem", "nasaPlanets"],
    summary: "The main asteroid belt lies between Mars and Jupiter and contains Ceres plus millions of smaller rocky bodies.",
    details: [
      "The belt is not crowded in real space; objects are separated by vast distances.",
      "Jupiter's gravity helped prevent this region from forming into a planet.",
      "Ceres is the largest body in the belt and is selectable as a dwarf planet."
    ]
  },
  {
    id: "kuiper-belt",
    name: "Kuiper Belt",
    category: "Region",
    className: "Icy trans-Neptunian belt",
    innerAU: 30,
    outerAU: 50,
    color: "#6f9ed6",
    sourceIds: ["nasaKuiper", "nasaSolarSystem"],
    summary: "The Kuiper Belt is a doughnut-shaped region of icy objects beyond Neptune and is home to Pluto and many other dwarf planets.",
    details: [
      "NASA describes it as a large doughnut-shaped region of icy bodies extending beyond Neptune.",
      "The app renders it as a broad translucent band because individual Kuiper Belt objects are far too small and sparse at this scale.",
      "New Horizons visited Pluto in 2015 and Arrokoth in 2019, providing the only spacecraft close-ups from this region."
    ]
  },
  {
    id: "oort-cloud",
    name: "Oort Cloud",
    category: "Region",
    className: "Hypothetical spherical comet reservoir",
    innerAU: 2000,
    outerAU: 100000,
    color: "#b7d9ff",
    sourceIds: ["nasaOort", "nasaSolarSystem"],
    summary: "The Oort Cloud is thought to be a giant spherical shell of icy, comet-like objects surrounding the Sun, planets, and Kuiper Belt.",
    details: [
      "NASA notes that we do not have direct images of the Oort Cloud; it is inferred from long-period comet behavior.",
      "It is shown as a distant translucent shell rather than true scale, because true Oort Cloud distances would dwarf the whole app.",
      "Long-period comets may be perturbed inward from this distant reservoir."
    ]
  }
];

export const COMETS = [
  {
    id: "halley",
    name: "1P/Halley",
    category: "Comet",
    className: "Short-period comet",
    radiusKm: 5.5,
    semiMajorAU: 17.93,
    eccentricity: 0.967,
    inclinationDeg: 162,
    nodeDeg: 58.42,
    argPeriDeg: 111.33,
    meanAnomalyDeg: 65.8,
    orbitalPeriodDays: 27758,
    rotationHours: 52.8,
    perihelionAU: 0.5871,
    aphelionAU: 35.25,
    color: "#dfefff",
    texture: "comet",
    phase: 5.2,
    sourceIds: ["nasaHalley"],
    summary: "Halley's Comet is the famous repeat visitor that returns to the inner solar system about every 76 years.",
    details: [
      "NASA reports a 76-year average period and a retrograde orbit tilted opposite the planets.",
      "Its nucleus is only about 15 by 8 kilometers, so the visible coma and tail are illustrative.",
      "The next return to Earth's skies is expected in 2061."
    ]
  },
  {
    id: "encke",
    name: "2P/Encke",
    category: "Comet",
    className: "Short-period comet",
    radiusKm: 2.4,
    semiMajorAU: 2.215,
    eccentricity: 0.848,
    inclinationDeg: 11.78,
    nodeDeg: 334.57,
    argPeriDeg: 186.55,
    meanAnomalyDeg: 280.15,
    orbitalPeriodDays: 1204,
    rotationHours: 11.1,
    perihelionAU: 0.336,
    aphelionAU: 4.09,
    color: "#d8e4ee",
    texture: "comet",
    phase: 3.7,
    sourceIds: ["nasaComets", "jplSmallBody"],
    summary: "Encke's Comet has the shortest orbital period of any known bright comet, returning to perihelion about every 3.3 years.",
    details: [
      "Its perihelion dives inside Mercury's orbit before it swings back out past the asteroid belt.",
      "Debris from Encke feeds the Taurid meteor showers.",
      "It was the second comet, after Halley, recognized as periodic."
    ]
  },
  {
    id: "67p",
    name: "67P/Churyumov-Gerasimenko",
    category: "Comet",
    className: "Jupiter-family comet",
    radiusKm: 2,
    semiMajorAU: 3.463,
    eccentricity: 0.641,
    inclinationDeg: 7.04,
    nodeDeg: 50.15,
    argPeriDeg: 12.78,
    meanAnomalyDeg: 219.7,
    orbitalPeriodDays: 2353,
    rotationHours: 12.4,
    perihelionAU: 1.243,
    aphelionAU: 5.68,
    color: "#cfd8e2",
    texture: "comet",
    phase: 1.3,
    sourceIds: ["nasaComets", "jplSmallBody"],
    summary: "67P is the twin-lobed comet orbited by ESA's Rosetta spacecraft from 2014 to 2016 and landed on by Philae.",
    details: [
      "Rosetta made it the most closely studied comet in history.",
      "Its distinctive rubber-duck shape likely formed from two bodies merging gently.",
      "Its 6.4-year orbit is shepherded by Jupiter, making it a Jupiter-family comet."
    ]
  }
];

export const FEATURED_ORDER = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "moon",
  "mars",
  "phobos",
  "deimos",
  "asteroid-belt",
  "ceres",
  "vesta",
  "pallas",
  "hygiea",
  "jupiter",
  "amalthea",
  "io",
  "europa",
  "ganymede",
  "callisto",
  "saturn",
  "mimas",
  "enceladus",
  "tethys",
  "dione",
  "titan",
  "rhea",
  "iapetus",
  "uranus",
  "s2025u1",
  "miranda",
  "ariel",
  "umbriel",
  "titania",
  "oberon",
  "neptune",
  "proteus",
  "triton",
  "nereid",
  "kuiper-belt",
  "pluto",
  "charon",
  "nix",
  "hydra",
  "haumea",
  "hiiaka",
  "namaka",
  "makemake",
  "mk2",
  "eris",
  "dysnomia",
  "halley",
  "encke",
  "67p",
  "oort-cloud"
];
