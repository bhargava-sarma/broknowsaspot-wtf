import type { Spot } from "@/lib/types/spot";

/**
 * Seed index.
 *
 * This is the payload `npm run appwrite:seed` writes, and nothing else
 * reads it: the site itself serves whatever is in the database, including
 * an empty database. Coordinates are real so the map reads as a real map;
 * the write-ups are illustrative.
 *
 * `photos[].src` is null throughout — no real photography exists yet, so
 * the gallery renders generated plates. The field is plumbed through so
 * swapping in URLs later is a data change, not a component change.
 */
export const SPOTS: Spot[] = [
  {
    slug: "gjipe-beach-approach",
    name: "Gjipe Cove",
    region: "Vlorë",
    country: "Albania",
    lat: 40.1519,
    lng: 19.7361,
    category: "shore",
    difficulty: "moderate",
    access: "open",
    summary: "A canyon walks you down to a beach with no road to it.",
    description:
      "The Ionian coast has a hundred beaches you can park at. This isn't one. You leave the car on the ridge and walk down a dry canyon for about forty minutes, and the canyon does the whole thing for you — it narrows, the limestone goes vertical, and then it opens onto sand. Because there's no road, the crowd tops out at maybe thirty people in August and zero the rest of the year. There's a bunker at the north end left over from Hoxha, half sunk in the sand, which is exactly as photogenic as it sounds.",
    walkInKm: 2.1,
    bestWindow: "May–June, or late September. July–August is hot and airless.",
    watchOut:
      "The canyon floor is loose scree in two places. Going down is fine; coming back up in flip-flops is not.",
    photos: [
      { src: null, alt: "The canyon narrows on the walk down to Gjipe cove" },
      {
        src: null,
        alt: "Concrete bunker half buried at the north end of the beach",
      },
      { src: null, alt: "Limestone walls above the cove at evening light" },
    ],
    notes: [
      {
        id: "n1",
        author: "marta_k",
        date: "2026-06-02",
        body: "Walked it at 7am to beat the heat — had the whole beach for two hours. The small bar at the bottom opens around 10 and takes cash only.",
      },
      {
        id: "n2",
        author: "duncan",
        date: "2026-04-18",
        body: "Canyon had running water in April, ankle deep in one spot. Not a problem, just wear something you don't mind soaking.",
      },
    ],
    addedAt: "2026-03-11",
  },
  {
    slug: "paronella-park-overflow",
    name: "Mena Creek Overflow",
    region: "Queensland",
    country: "Australia",
    lat: -17.6558,
    lng: 145.9925,
    category: "ruin",
    difficulty: "easy",
    access: "permit",
    summary: "A Spanish castle folly rotting into the rainforest.",
    description:
      "A catalan immigrant spent the 1930s building a mock castle, a ballroom and a hydro plant in the middle of far north Queensland rainforest, and then cyclones and fire spent the next ninety years taking it apart. What's left is concrete stairways going into the canopy and a turbine house that still runs. The state has it now, which means you pay and it's signposted — but go at last light when the tour groups have cleared and it stops feeling managed.",
    walkInKm: 0.4,
    bestWindow: "Dry season, May–October. Last entry, not first.",
    watchOut:
      "The concrete is ninety years old and permanently wet. The moss on the lower stairs is genuinely slick.",
    photos: [
      {
        src: null,
        alt: "Concrete stairway disappearing into rainforest canopy",
      },
      { src: null, alt: "The ruined ballroom wall with tree roots through it" },
    ],
    notes: [
      {
        id: "n3",
        author: "reeve",
        date: "2026-05-21",
        body: "Ticket covers you for 24h and includes the night walk. Do both — the place is completely different lit.",
      },
    ],
    addedAt: "2026-02-27",
  },
  {
    slug: "kolmanskop-drift",
    name: "Kolmanskop Drift Houses",
    region: "Karas",
    country: "Namibia",
    lat: -26.7044,
    lng: 15.2306,
    category: "ruin",
    difficulty: "easy",
    access: "permit",
    summary: "A diamond town the desert is slowly filling in.",
    description:
      "German colonial houses abandoned in the 1950s when the diamonds ran out, sitting in the Sperrgebiet where the dunes have been walking through the doors ever since. Some rooms are waist-deep in sand. The light through the broken windows in the first hour after sunrise is the entire reason to be there, which is why the photography permit exists and why it costs more than the standard one. Worth it.",
    walkInKm: 0.3,
    bestWindow: "Sunrise. The standard permit doesn't start early enough.",
    watchOut:
      "It sits inside a restricted diamond area — you cannot freelance this one. Permit or don't go.",
    photos: [
      { src: null, alt: "Sand drifted through a doorway into a bare room" },
      { src: null, alt: "Peeling ochre wall with desert light across it" },
      { src: null, alt: "Dune spilling into the corner of a colonial house" },
    ],
    notes: [
      {
        id: "n4",
        author: "s_oyelaran",
        date: "2026-01-14",
        body: "Buy the sunrise permit in Lüderitz the day before, not at the gate. They cap the numbers.",
      },
    ],
    addedAt: "2026-01-09",
  },
  {
    slug: "vikos-balcony",
    name: "Vikos Balcony",
    region: "Epirus",
    country: "Greece",
    lat: 39.9847,
    lng: 20.7439,
    category: "viewpoint",
    difficulty: "hard",
    access: "open",
    summary: "An unmarked ledge over the deepest gorge in europe.",
    description:
      "Everyone drives to the oxya viewpoint, takes the photo from behind the railing and leaves. An hour further along the rim, past where the marked path gives up, there's a limestone shelf with nothing between you and nine hundred metres of air. No railing, no sign, no one. The gorge runs north-south so the light moves across the far wall all afternoon and the whole thing changes colour about four times.",
    walkInKm: 5.8,
    bestWindow: "Late afternoon, April–October. The rim is ice in winter.",
    watchOut:
      "No railing and no phone signal. The last kilometre is unmarked — if you are not comfortable route-finding, stop at oxya.",
    photos: [
      {
        src: null,
        alt: "Limestone shelf above the Vikos gorge with no railing",
      },
      { src: null, alt: "Afternoon light moving across the far gorge wall" },
    ],
    notes: [
      {
        id: "n5",
        author: "petra.h",
        date: "2026-05-30",
        body: "The turn off the marked trail is at a cairn about 40min past oxya, easy to walk straight past. Gpx is worth having.",
      },
      {
        id: "n6",
        author: "andreas_v",
        date: "2026-03-08",
        body: "Went in March, still snow on the rim path in shade. Would not do it again that early.",
      },
    ],
    addedAt: "2026-02-02",
  },
  {
    slug: "williamson-tunnels-lower",
    name: "Williamson's Lower Tunnels",
    region: "Liverpool",
    country: "United Kingdom",
    lat: 53.4021,
    lng: -2.9558,
    category: "underground",
    difficulty: "moderate",
    access: "permit",
    summary: "Brick caverns dug for no known reason, still being excavated.",
    description:
      "A nineteenth-century tobacco merchant employed men for decades to dig an enormous network of brick-vaulted tunnels under Edge hill, and nobody has ever established why. No ore, no drainage, no cellar. Volunteers have been digging the infill out by hand since the 1990s and are still not at the bottom. The guided section is a fraction of it; the rest is rubble and speculation.",
    walkInKm: 0.1,
    bestWindow: "Year round — it's 12°c down there regardless.",
    watchOut:
      "Hard hat sections are hard hat sections for a reason. The volunteers will tell you where not to stand; listen.",
    photos: [
      { src: null, alt: "Brick vaulted tunnel disappearing into darkness" },
      {
        src: null,
        alt: "Excavated rubble face at the working end of the tunnel",
      },
    ],
    notes: [
      {
        id: "n7",
        author: "j_okafor",
        date: "2026-04-04",
        body: "The volunteer-run entrance does a longer tour than the heritage centre one and costs less. Book by email, they're slow to reply but they do.",
      },
    ],
    addedAt: "2026-01-22",
  },
  {
    slug: "salto-ventoso-back",
    name: "Behind Salto Ventoso",
    region: "Rio Grande do Sul",
    country: "Brazil",
    lat: -29.0447,
    lng: -51.3506,
    category: "water",
    difficulty: "moderate",
    access: "permit",
    summary: "A path that runs behind the waterfall, not in front of it.",
    description:
      "The basalt undercut here is deep enough that a walkway runs the full width behind the falling water. You come out the other side soaked and half deaf. It's on private land and the family that owns it charges a small fee, which is the only reason it hasn't been ruined — numbers stay low and the path stays unimproved.",
    walkInKm: 1.2,
    bestWindow:
      "After rain, when the curtain is full. Midday for light through the water.",
    watchOut:
      "The ledge behind the falls is permanently wet basalt. Hold the chain, and don't do it in trainers.",
    photos: [
      { src: null, alt: "The walkway behind the waterfall curtain" },
      { src: null, alt: "Light through falling water from the undercut" },
    ],
    notes: [
      {
        id: "n8",
        author: "lu_ferreira",
        date: "2026-06-11",
        body: "Dry spell in June meant the curtain was thin — still good but go after rain if you can time it.",
      },
    ],
    addedAt: "2026-03-30",
  },
  {
    slug: "hafnarfjall-spur",
    name: "Hafnarfjall North Spur",
    region: "Vesturland",
    country: "Iceland",
    lat: 64.5203,
    lng: -21.9319,
    category: "viewpoint",
    difficulty: "serious",
    access: "open",
    summary: "A steep unmarked spur above Borgarfjörður, wind permitting.",
    description:
      "The tourist route up Hafnarfjall is a slog on loose scree. The north spur is a scramble on better rock with a genuine ridge line at the top and a view down the whole fjord. It is not maintained, not marked, and not a good idea in wind — which in this part of Iceland is most days. Check the forecast, and mean it.",
    walkInKm: 4.4,
    bestWindow: "June–August, and only on a settled forecast.",
    watchOut:
      "Wind. Gusts here regularly hit speeds that will take you off the ridge. If it's above 15m/s at the car park, don't start.",
    photos: [
      { src: null, alt: "The north spur ridge line above Borgarfjörður" },
      { src: null, alt: "Loose basalt scramble on the upper spur" },
    ],
    notes: [
      {
        id: "n9",
        author: "eirik",
        date: "2026-07-19",
        body: "Turned back 200m from the top on a 'calm' forecast day. It funnels. No regrets.",
      },
    ],
    addedAt: "2026-04-15",
  },
  {
    slug: "canfranc-platform",
    name: "Canfranc Long Platform",
    region: "Aragón",
    country: "Spain",
    lat: 42.7539,
    lng: -0.5203,
    category: "transit",
    difficulty: "easy",
    access: "grey",
    summary: "An enormous dead border station in the middle of the Pyrenees.",
    description:
      "Built in 1928 to a scale that made no sense even then — a platform the better part of a quarter mile long, in a valley with almost nobody in it. A bridge collapse closed the french side in 1970 and it has been mostly dead since. The main building has been restored into a hotel, but the sidings, the customs sheds and the far end of the platform are still exactly as abandoned as they were.",
    walkInKm: 0.6,
    bestWindow: "Any. Autumn for the valley colour.",
    watchOut:
      "The restored end is a working hotel; the far end is unfenced railway land. Nobody stops you, but it isn't yours.",
    photos: [
      {
        src: null,
        alt: "The quarter-mile platform at Canfranc receding into fog",
      },
      { src: null, alt: "Derelict customs shed beside overgrown sidings" },
      { src: null, alt: "The station facade from the valley road" },
    ],
    notes: [
      {
        id: "n10",
        author: "mireia",
        date: "2026-05-09",
        body: "The hotel bar will let you walk the restored hall without being a guest. The interesting half is north of it anyway.",
      },
    ],
    addedAt: "2026-02-14",
  },
  {
    slug: "hamilton-pool-upstream",
    name: "Upstream of Hamilton Pool",
    region: "Texas",
    country: "United States",
    lat: 30.3424,
    lng: -98.1266,
    category: "water",
    difficulty: "moderate",
    access: "grey",
    summary: "The limestone creek above the reserved, ticketed grotto.",
    description:
      "Hamilton pool itself now needs a timed reservation months out. The creek that feeds it, above the reserve boundary, does not — and the same limestone shelving and the same clear green water run for a good distance upstream. It is emphatically not the famous collapsed grotto, and it is also not full of people who booked in March.",
    walkInKm: 1.7,
    bestWindow: "Spring, when the creek is actually running.",
    watchOut:
      "Flash flooding is the real hazard in this drainage, not the walk. Do not go in on a storm forecast, upstream or not.",
    photos: [
      {
        src: null,
        alt: "Limestone shelves and clear water on the creek upstream",
      },
      { src: null, alt: "Cypress roots along the creek bank" },
    ],
    notes: [
      {
        id: "n11",
        author: "dez",
        date: "2026-04-27",
        body: "Creek was dry in August last year — completely pointless trip. April was perfect.",
      },
    ],
    addedAt: "2026-03-19",
  },
  {
    slug: "gunkanjima-shadow",
    name: "Nagasaki Seawall View",
    region: "Nagasaki",
    country: "Japan",
    lat: 32.6277,
    lng: 129.7386,
    category: "shore",
    difficulty: "easy",
    access: "open",
    summary: "The shore angle on Hashima that the boat tours don't give you.",
    description:
      "Landing on Hashima is weather-dependent, heavily restricted and confined to a short walkway. What nobody mentions is that from a stretch of seawall on the nomozaki side, on a clear afternoon, you get the whole island in profile with the sun behind it — the silhouette that makes it look like the battleship it's named after. Free, and you can stay as long as you like.",
    walkInKm: 0.8,
    bestWindow: "Clear afternoons. Winter has the sharpest air.",
    watchOut:
      "The seawall is exposed and the swell comes up fast on a south wind. Stay off the lower blocks.",
    photos: [
      { src: null, alt: "Hashima island in profile from the nomozaki seawall" },
      { src: null, alt: "Swell breaking against the seawall blocks" },
    ],
    notes: [
      {
        id: "n12",
        author: "haru_t",
        date: "2026-02-08",
        body: "Bus from Nagasaki takes about an hour and drops you close. Go late — the island is backlit after 3pm.",
      },
    ],
    addedAt: "2026-01-30",
  },
  {
    slug: "beelitz-stairwell",
    name: "Beelitz North Stairwell",
    region: "Brandenburg",
    country: "Germany",
    lat: 52.2617,
    lng: 12.9192,
    category: "ruin",
    difficulty: "easy",
    access: "private",
    summary: "The sanatorium wing that was never put on the treetop walk.",
    description:
      "Most of Beelitz-heilstätten has been tidied into a paid attraction with an elevated walkway. The north wing has not. It is fenced, it is monitored, and it is listed here for the record rather than as a recommendation — the interior is genuinely unsafe and the security is real. The legal parts are still worth the trip.",
    walkInKm: 1.1,
    bestWindow: "N/a — go to the ticketed section instead.",
    watchOut:
      "Posted private with active security and unsafe floors. We log it; we don't recommend entering it.",
    photos: [
      { src: null, alt: "The north wing facade behind fencing" },
      { src: null, alt: "The sanctioned treetop walkway over the sanatorium" },
    ],
    notes: [
      {
        id: "n13",
        author: "kb_",
        date: "2026-03-02",
        body: "For what it's worth the paid section covers the best surviving stairwell anyway. Not worth a fine.",
      },
    ],
    addedAt: "2026-02-20",
  },
  {
    slug: "quilotoa-far-rim",
    name: "Quilotoa Far Rim",
    region: "Cotopaxi",
    country: "Ecuador",
    lat: -0.8608,
    lng: -78.9014,
    category: "viewpoint",
    difficulty: "hard",
    access: "open",
    summary: "The two-thirds of the crater rim nobody walks.",
    description:
      "The viewpoint at the village end of the Quilotoa crater is full by nine in the morning. The rim trail runs the whole way round — about ten kilometres of it — and almost nobody does more than the first twenty minutes. The far side is exposed, has real drop-offs, and gives you the lake from an angle that isn't in any of the photos.",
    walkInKm: 9.6,
    bestWindow:
      "Start at first light. Cloud closes the crater by early afternoon.",
    watchOut:
      "3,900M. The altitude, not the distance, is what turns this one around — and there is no water on the rim.",
    photos: [
      { src: null, alt: "The crater lake from the far rim in morning light" },
      { src: null, alt: "Exposed section of the rim trail with drop-offs" },
    ],
    notes: [
      {
        id: "n14",
        author: "nadia.r",
        date: "2026-06-24",
        body: "Took 5.5H including stops, coming from sea level two days earlier. Underestimated it badly. Carry more water than you think.",
      },
    ],
    addedAt: "2026-04-06",
  },
  {
    slug: "maunsell-approach",
    name: "Maunsell Forts Approach",
    region: "Kent",
    country: "United Kingdom",
    lat: 51.4756,
    lng: 1.0472,
    category: "structure",
    difficulty: "serious",
    access: "grey",
    summary: "Wartime sea forts standing in the Thames Estuary on stilts.",
    description:
      "Clusters of steel towers built in 1942 to shoot at aircraft, left standing in the Estuary ever since, rusting on their legs. You cannot land — the structures are unsound and the ladders are gone. What you can do is get a charter out of whitstable on a flat day and sit underneath them, which is more unsettling than landing would be.",
    walkInKm: 0,
    bestWindow: "Flat calm, neap tides, summer only.",
    watchOut:
      "Open Estuary with serious tidal streams and no shelter. This is a boat trip, not a walk — go with someone who knows the water.",
    photos: [
      { src: null, alt: "The Maunsell forts standing on rusted stilts" },
      { src: null, alt: "View up at the underside of a fort tower" },
    ],
    notes: [
      {
        id: "n15",
        author: "tomasz_w",
        date: "2026-07-02",
        body: "Two charters out of whitstable run it. Neither will go if there's any north in the wind, and they're right not to.",
      },
    ],
    addedAt: "2026-05-01",
  },
  {
    slug: "wieliczka-lower-chamber",
    name: "Wieliczka Lower Chambers",
    region: "Lesser Poland",
    country: "Poland",
    lat: 49.9831,
    lng: 20.0544,
    category: "underground",
    difficulty: "moderate",
    access: "permit",
    summary:
      "The miners' route, three hundred metres down, not the tourist loop.",
    description:
      "Everyone does the tourist route past the salt chapel. The miners' route goes deeper, gives you a lamp and a detector, and takes you through unlit working chambers where you climb rather than walk. Same mine, entirely different experience, and it books out far less because most people don't know it exists.",
    walkInKm: 2.8,
    bestWindow: "Year round. 14°C and no weather, ever.",
    watchOut:
      "Three hours underground with real ladders. Not one for anyone shaky on climbing in the dark.",
    photos: [
      { src: null, alt: "Unlit working chamber on the miners' route" },
      { src: null, alt: "Timber supports in a lower salt gallery" },
    ],
    notes: [
      {
        id: "n16",
        author: "agnieszka",
        date: "2026-05-16",
        body: "Book the miners' route online a week ahead. English departures are only twice a day.",
      },
    ],
    addedAt: "2026-03-25",
  },
];
