export const REVIEWED_AT = "June 2026";

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
    orbitalPeriodDays: 87.969,
    rotationHours: 1407.6,
    axialTiltDeg: 0.034,
    meanTempC: 167,
    moons: 0,
    color: "#9c9287",
    texture: "cratered",
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
    orbitalPeriodDays: 224.701,
    rotationHours: -5832.5,
    axialTiltDeg: 177.36,
    meanTempC: 464,
    moons: 0,
    color: "#d8b26e",
    texture: "clouds",
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
    orbitalPeriodDays: 365.256,
    rotationHours: 23.934,
    axialTiltDeg: 23.44,
    meanTempC: 15,
    moons: 1,
    color: "#4e8fdc",
    texture: "earth",
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
        texture: "cratered",
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
    orbitalPeriodDays: 686.98,
    rotationHours: 24.623,
    axialTiltDeg: 25.19,
    meanTempC: -65,
    moons: 2,
    color: "#c8643f",
    texture: "mars",
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
    orbitalPeriodDays: 4332.589,
    rotationHours: 9.925,
    axialTiltDeg: 3.13,
    meanTempC: -110,
    moons: 101,
    rings: { inner: 1.28, outer: 2.25, color: "#a89470", opacity: 0.18 },
    color: "#d5aa79",
    texture: "bands",
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
        id: "io",
        name: "Io",
        category: "Moon",
        className: "Galilean moon",
        radiusKm: 1821.6,
        orbitKm: 421800,
        orbitalPeriodDays: 1.769,
        rotationHours: 42.46,
        color: "#e6c568",
        texture: "volcanic",
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
        texture: "ice",
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
        texture: "cratered",
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
        texture: "cratered",
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
    orbitalPeriodDays: 10759.22,
    rotationHours: 10.656,
    axialTiltDeg: 26.73,
    meanTempC: -140,
    moons: 285,
    rings: { inner: 1.24, outer: 2.28, color: "#d8c394", opacity: 0.58 },
    color: "#d7bd82",
    texture: "bandsSoft",
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
        texture: "ice",
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
        id: "titan",
        name: "Titan",
        category: "Moon",
        className: "Large moon with atmosphere",
        radiusKm: 2574.7,
        orbitKm: 1221870,
        orbitalPeriodDays: 15.945,
        rotationHours: 382.7,
        color: "#c9924c",
        texture: "haze",
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
        texture: "twoTone",
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
    orbitalPeriodDays: 30685,
    rotationHours: -17.24,
    axialTiltDeg: 97.77,
    meanTempC: -195,
    moons: 29,
    rings: { inner: 1.55, outer: 2.05, color: "#8db7c2", opacity: 0.28 },
    color: "#8ed6d7",
    texture: "smooth",
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
    orbitalPeriodDays: 60190,
    rotationHours: 16.11,
    axialTiltDeg: 28.32,
    meanTempC: -200,
    moons: 16,
    rings: { inner: 1.7, outer: 2.15, color: "#5378b8", opacity: 0.24 },
    color: "#3b6bdc",
    texture: "neptune",
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
        id: "triton",
        name: "Triton",
        category: "Moon",
        className: "Captured moon",
        radiusKm: 1353.4,
        orbitKm: 354759,
        orbitalPeriodDays: -5.877,
        rotationHours: -141,
        color: "#d7d0be",
        texture: "ice",
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
    orbitalPeriodDays: 1680.5,
    rotationHours: 9.074,
    axialTiltDeg: 4,
    moons: 0,
    color: "#8f8880",
    texture: "cratered",
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
    orbitalPeriodDays: 90560,
    rotationHours: -153.3,
    axialTiltDeg: 122.53,
    moons: 5,
    color: "#b98c6d",
    texture: "pluto",
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
        texture: "cratered",
        phase: 0.3,
        sourceIds: ["nasaPlanets", "nasaFactSheets"],
        summary: "Charon is so large compared with Pluto that the pair orbit a barycenter outside Pluto's surface.",
        details: [
          "Its orbit is enlarged visually for selection.",
          "Charon is tidally locked to Pluto.",
          "New Horizons revealed canyons, plains, and a dark polar region on Charon."
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
    orbitalPeriodDays: 103410,
    rotationHours: 3.915,
    axialTiltDeg: null,
    moons: 2,
    rings: { inner: 1.7, outer: 2.05, color: "#bfc6cc", opacity: 0.22 },
    color: "#c8cdd1",
    texture: "ice",
    phase: 4.1,
    stretch: [1.35, 0.78, 0.92],
    sourceIds: ["nasaPlanets", "nasaKuiper", "nasaFactSheets"],
    summary: "Haumea is an elongated, very fast-spinning dwarf planet in the Kuiper Belt with two moons and a ring.",
    details: [
      "Its non-spherical shape is represented by stretching the mesh.",
      "Haumea's exact pole orientation remains less familiar to non-specialists than those of the major planets, so the app does not claim a precise axial tilt.",
      "The four-hour rotation is one of the fastest known for a large solar-system body."
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
    orbitalPeriodDays: 111867,
    rotationHours: 22.83,
    axialTiltDeg: null,
    moons: 1,
    color: "#b77755",
    texture: "smooth",
    phase: 5.0,
    sourceIds: ["nasaPlanets", "nasaKuiper", "nasaFactSheets"],
    summary: "Makemake is a reddish Kuiper Belt dwarf planet, slightly smaller than Pluto and one of the brighter trans-Neptunian objects.",
    details: [
      "It is placed beyond Pluto's average distance in the Kuiper Belt region.",
      "Its orbit is tilted substantially relative to Earth's orbital plane.",
      "A small moon has been detected, but this app keeps Makemake's moon count as metadata rather than rendering a tiny moon."
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
    orbitalPeriodDays: 203830,
    rotationHours: 25.9,
    axialTiltDeg: null,
    moons: 1,
    color: "#d7d2c4",
    texture: "ice",
    phase: 0.4,
    sourceIds: ["nasaPlanets", "nasaKuiper", "nasaFactSheets"],
    summary: "Eris is a distant dwarf planet whose discovery helped trigger the modern IAU planet definition debate.",
    details: [
      "Its orbit is highly inclined and eccentric compared with the eight planets.",
      "The app shows Eris farther out than the classical Kuiper Belt to emphasize its scattered-disk style orbit.",
      "Eris has one known moon, Dysnomia."
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
    orbitalPeriodDays: 27758,
    rotationHours: 52.8,
    perihelionAU: 0.5871,
    aphelionAU: 35.25,
    color: "#dfefff",
    phase: 5.2,
    sourceIds: ["nasaHalley"],
    summary: "Halley's Comet is the famous repeat visitor that returns to the inner solar system about every 76 years.",
    details: [
      "NASA reports a 76-year average period and a retrograde orbit tilted opposite the planets.",
      "Its nucleus is only about 15 by 8 kilometers, so the visible coma and tail are illustrative.",
      "The next return to Earth's skies is expected in 2061."
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
  "jupiter",
  "io",
  "europa",
  "ganymede",
  "callisto",
  "saturn",
  "mimas",
  "enceladus",
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
  "triton",
  "nereid",
  "kuiper-belt",
  "pluto",
  "charon",
  "haumea",
  "makemake",
  "eris",
  "halley",
  "oort-cloud"
];
