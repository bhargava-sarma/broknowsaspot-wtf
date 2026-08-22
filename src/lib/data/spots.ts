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
    name: "gjipe cove",
    region: "vlorë",
    country: "albania",
    lat: 40.1519,
    lng: 19.7361,
    category: "shore",
    difficulty: "moderate",
    access: "open",
    summary: "a canyon walks you down to a beach with no road to it.",
    description:
      "the ionian coast has a hundred beaches you can park at. this isn't one. you leave the car on the ridge and walk down a dry canyon for about forty minutes, and the canyon does the whole thing for you — it narrows, the limestone goes vertical, and then it opens onto sand. because there's no road, the crowd tops out at maybe thirty people in august and zero the rest of the year. there's a bunker at the north end left over from hoxha, half sunk in the sand, which is exactly as photogenic as it sounds.",
    walkInKm: 2.1,
    bestWindow: "may–june, or late september. july–august is hot and airless.",
    watchOut:
      "the canyon floor is loose scree in two places. going down is fine; coming back up in flip-flops is not.",
    photos: [
      { src: null, alt: "the canyon narrows on the walk down to gjipe cove" },
      {
        src: null,
        alt: "concrete bunker half buried at the north end of the beach",
      },
      { src: null, alt: "limestone walls above the cove at evening light" },
    ],
    notes: [
      {
        id: "n1",
        author: "marta_k",
        date: "2026-06-02",
        body: "walked it at 7am to beat the heat — had the whole beach for two hours. the small bar at the bottom opens around 10 and takes cash only.",
      },
      {
        id: "n2",
        author: "duncan",
        date: "2026-04-18",
        body: "canyon had running water in april, ankle deep in one spot. not a problem, just wear something you don't mind soaking.",
      },
    ],
    addedAt: "2026-03-11",
  },
  {
    slug: "paronella-park-overflow",
    name: "mena creek overflow",
    region: "queensland",
    country: "australia",
    lat: -17.6558,
    lng: 145.9925,
    category: "ruin",
    difficulty: "easy",
    access: "permit",
    summary: "a spanish castle folly rotting into the rainforest.",
    description:
      "a catalan immigrant spent the 1930s building a mock castle, a ballroom and a hydro plant in the middle of far north queensland rainforest, and then cyclones and fire spent the next ninety years taking it apart. what's left is concrete stairways going into the canopy and a turbine house that still runs. the state has it now, which means you pay and it's signposted — but go at last light when the tour groups have cleared and it stops feeling managed.",
    walkInKm: 0.4,
    bestWindow: "dry season, may–october. last entry, not first.",
    watchOut:
      "the concrete is ninety years old and permanently wet. the moss on the lower stairs is genuinely slick.",
    photos: [
      {
        src: null,
        alt: "concrete stairway disappearing into rainforest canopy",
      },
      { src: null, alt: "the ruined ballroom wall with tree roots through it" },
    ],
    notes: [
      {
        id: "n3",
        author: "reeve",
        date: "2026-05-21",
        body: "ticket covers you for 24h and includes the night walk. do both — the place is completely different lit.",
      },
    ],
    addedAt: "2026-02-27",
  },
  {
    slug: "kolmanskop-drift",
    name: "kolmanskop drift houses",
    region: "karas",
    country: "namibia",
    lat: -26.7044,
    lng: 15.2306,
    category: "ruin",
    difficulty: "easy",
    access: "permit",
    summary: "a diamond town the desert is slowly filling in.",
    description:
      "german colonial houses abandoned in the 1950s when the diamonds ran out, sitting in the sperrgebiet where the dunes have been walking through the doors ever since. some rooms are waist-deep in sand. the light through the broken windows in the first hour after sunrise is the entire reason to be there, which is why the photography permit exists and why it costs more than the standard one. worth it.",
    walkInKm: 0.3,
    bestWindow: "sunrise. the standard permit doesn't start early enough.",
    watchOut:
      "it sits inside a restricted diamond area — you cannot freelance this one. permit or don't go.",
    photos: [
      { src: null, alt: "sand drifted through a doorway into a bare room" },
      { src: null, alt: "peeling ochre wall with desert light across it" },
      { src: null, alt: "dune spilling into the corner of a colonial house" },
    ],
    notes: [
      {
        id: "n4",
        author: "s_oyelaran",
        date: "2026-01-14",
        body: "buy the sunrise permit in lüderitz the day before, not at the gate. they cap the numbers.",
      },
    ],
    addedAt: "2026-01-09",
  },
  {
    slug: "vikos-balcony",
    name: "vikos balcony",
    region: "epirus",
    country: "greece",
    lat: 39.9847,
    lng: 20.7439,
    category: "viewpoint",
    difficulty: "hard",
    access: "open",
    summary: "an unmarked ledge over the deepest gorge in europe.",
    description:
      "everyone drives to the oxya viewpoint, takes the photo from behind the railing and leaves. an hour further along the rim, past where the marked path gives up, there's a limestone shelf with nothing between you and nine hundred metres of air. no railing, no sign, no one. the gorge runs north-south so the light moves across the far wall all afternoon and the whole thing changes colour about four times.",
    walkInKm: 5.8,
    bestWindow: "late afternoon, april–october. the rim is ice in winter.",
    watchOut:
      "no railing and no phone signal. the last kilometre is unmarked — if you are not comfortable route-finding, stop at oxya.",
    photos: [
      {
        src: null,
        alt: "limestone shelf above the vikos gorge with no railing",
      },
      { src: null, alt: "afternoon light moving across the far gorge wall" },
    ],
    notes: [
      {
        id: "n5",
        author: "petra.h",
        date: "2026-05-30",
        body: "the turn off the marked trail is at a cairn about 40min past oxya, easy to walk straight past. gpx is worth having.",
      },
      {
        id: "n6",
        author: "andreas_v",
        date: "2026-03-08",
        body: "went in march, still snow on the rim path in shade. would not do it again that early.",
      },
    ],
    addedAt: "2026-02-02",
  },
  {
    slug: "williamson-tunnels-lower",
    name: "williamson's lower tunnels",
    region: "liverpool",
    country: "united kingdom",
    lat: 53.4021,
    lng: -2.9558,
    category: "underground",
    difficulty: "moderate",
    access: "permit",
    summary: "brick caverns dug for no known reason, still being excavated.",
    description:
      "a nineteenth-century tobacco merchant employed men for decades to dig an enormous network of brick-vaulted tunnels under edge hill, and nobody has ever established why. no ore, no drainage, no cellar. volunteers have been digging the infill out by hand since the 1990s and are still not at the bottom. the guided section is a fraction of it; the rest is rubble and speculation.",
    walkInKm: 0.1,
    bestWindow: "year round — it's 12°c down there regardless.",
    watchOut:
      "hard hat sections are hard hat sections for a reason. the volunteers will tell you where not to stand; listen.",
    photos: [
      { src: null, alt: "brick vaulted tunnel disappearing into darkness" },
      {
        src: null,
        alt: "excavated rubble face at the working end of the tunnel",
      },
    ],
    notes: [
      {
        id: "n7",
        author: "j_okafor",
        date: "2026-04-04",
        body: "the volunteer-run entrance does a longer tour than the heritage centre one and costs less. book by email, they're slow to reply but they do.",
      },
    ],
    addedAt: "2026-01-22",
  },
  {
    slug: "salto-ventoso-back",
    name: "behind salto ventoso",
    region: "rio grande do sul",
    country: "brazil",
    lat: -29.0447,
    lng: -51.3506,
    category: "water",
    difficulty: "moderate",
    access: "permit",
    summary: "a path that runs behind the waterfall, not in front of it.",
    description:
      "the basalt undercut here is deep enough that a walkway runs the full width behind the falling water. you come out the other side soaked and half deaf. it's on private land and the family that owns it charges a small fee, which is the only reason it hasn't been ruined — numbers stay low and the path stays unimproved.",
    walkInKm: 1.2,
    bestWindow:
      "after rain, when the curtain is full. midday for light through the water.",
    watchOut:
      "the ledge behind the falls is permanently wet basalt. hold the chain, and don't do it in trainers.",
    photos: [
      { src: null, alt: "the walkway behind the waterfall curtain" },
      { src: null, alt: "light through falling water from the undercut" },
    ],
    notes: [
      {
        id: "n8",
        author: "lu_ferreira",
        date: "2026-06-11",
        body: "dry spell in june meant the curtain was thin — still good but go after rain if you can time it.",
      },
    ],
    addedAt: "2026-03-30",
  },
  {
    slug: "hafnarfjall-spur",
    name: "hafnarfjall north spur",
    region: "vesturland",
    country: "iceland",
    lat: 64.5203,
    lng: -21.9319,
    category: "viewpoint",
    difficulty: "serious",
    access: "open",
    summary: "a steep unmarked spur above borgarfjörður, wind permitting.",
    description:
      "the tourist route up hafnarfjall is a slog on loose scree. the north spur is a scramble on better rock with a genuine ridge line at the top and a view down the whole fjord. it is not maintained, not marked, and not a good idea in wind — which in this part of iceland is most days. check the forecast, and mean it.",
    walkInKm: 4.4,
    bestWindow: "june–august, and only on a settled forecast.",
    watchOut:
      "wind. gusts here regularly hit speeds that will take you off the ridge. if it's above 15m/s at the car park, don't start.",
    photos: [
      { src: null, alt: "the north spur ridge line above borgarfjörður" },
      { src: null, alt: "loose basalt scramble on the upper spur" },
    ],
    notes: [
      {
        id: "n9",
        author: "eirik",
        date: "2026-07-19",
        body: "turned back 200m from the top on a 'calm' forecast day. it funnels. no regrets.",
      },
    ],
    addedAt: "2026-04-15",
  },
  {
    slug: "canfranc-platform",
    name: "canfranc long platform",
    region: "aragón",
    country: "spain",
    lat: 42.7539,
    lng: -0.5203,
    category: "transit",
    difficulty: "easy",
    access: "grey",
    summary: "an enormous dead border station in the middle of the pyrenees.",
    description:
      "built in 1928 to a scale that made no sense even then — a platform the better part of a quarter mile long, in a valley with almost nobody in it. a bridge collapse closed the french side in 1970 and it has been mostly dead since. the main building has been restored into a hotel, but the sidings, the customs sheds and the far end of the platform are still exactly as abandoned as they were.",
    walkInKm: 0.6,
    bestWindow: "any. autumn for the valley colour.",
    watchOut:
      "the restored end is a working hotel; the far end is unfenced railway land. nobody stops you, but it isn't yours.",
    photos: [
      {
        src: null,
        alt: "the quarter-mile platform at canfranc receding into fog",
      },
      { src: null, alt: "derelict customs shed beside overgrown sidings" },
      { src: null, alt: "the station facade from the valley road" },
    ],
    notes: [
      {
        id: "n10",
        author: "mireia",
        date: "2026-05-09",
        body: "the hotel bar will let you walk the restored hall without being a guest. the interesting half is north of it anyway.",
      },
    ],
    addedAt: "2026-02-14",
  },
  {
    slug: "hamilton-pool-upstream",
    name: "upstream of hamilton pool",
    region: "texas",
    country: "united states",
    lat: 30.3424,
    lng: -98.1266,
    category: "water",
    difficulty: "moderate",
    access: "grey",
    summary: "the limestone creek above the reserved, ticketed grotto.",
    description:
      "hamilton pool itself now needs a timed reservation months out. the creek that feeds it, above the reserve boundary, does not — and the same limestone shelving and the same clear green water run for a good distance upstream. it is emphatically not the famous collapsed grotto, and it is also not full of people who booked in march.",
    walkInKm: 1.7,
    bestWindow: "spring, when the creek is actually running.",
    watchOut:
      "flash flooding is the real hazard in this drainage, not the walk. do not go in on a storm forecast, upstream or not.",
    photos: [
      {
        src: null,
        alt: "limestone shelves and clear water on the creek upstream",
      },
      { src: null, alt: "cypress roots along the creek bank" },
    ],
    notes: [
      {
        id: "n11",
        author: "dez",
        date: "2026-04-27",
        body: "creek was dry in august last year — completely pointless trip. april was perfect.",
      },
    ],
    addedAt: "2026-03-19",
  },
  {
    slug: "gunkanjima-shadow",
    name: "nagasaki seawall view",
    region: "nagasaki",
    country: "japan",
    lat: 32.6277,
    lng: 129.7386,
    category: "shore",
    difficulty: "easy",
    access: "open",
    summary: "the shore angle on hashima that the boat tours don't give you.",
    description:
      "landing on hashima is weather-dependent, heavily restricted and confined to a short walkway. what nobody mentions is that from a stretch of seawall on the nomozaki side, on a clear afternoon, you get the whole island in profile with the sun behind it — the silhouette that makes it look like the battleship it's named after. free, and you can stay as long as you like.",
    walkInKm: 0.8,
    bestWindow: "clear afternoons. winter has the sharpest air.",
    watchOut:
      "the seawall is exposed and the swell comes up fast on a south wind. stay off the lower blocks.",
    photos: [
      { src: null, alt: "hashima island in profile from the nomozaki seawall" },
      { src: null, alt: "swell breaking against the seawall blocks" },
    ],
    notes: [
      {
        id: "n12",
        author: "haru_t",
        date: "2026-02-08",
        body: "bus from nagasaki takes about an hour and drops you close. go late — the island is backlit after 3pm.",
      },
    ],
    addedAt: "2026-01-30",
  },
  {
    slug: "beelitz-stairwell",
    name: "beelitz north stairwell",
    region: "brandenburg",
    country: "germany",
    lat: 52.2617,
    lng: 12.9192,
    category: "ruin",
    difficulty: "easy",
    access: "private",
    summary: "the sanatorium wing that was never put on the treetop walk.",
    description:
      "most of beelitz-heilstätten has been tidied into a paid attraction with an elevated walkway. the north wing has not. it is fenced, it is monitored, and it is listed here for the record rather than as a recommendation — the interior is genuinely unsafe and the security is real. the legal parts are still worth the trip.",
    walkInKm: 1.1,
    bestWindow: "n/a — go to the ticketed section instead.",
    watchOut:
      "posted private with active security and unsafe floors. we log it; we don't recommend entering it.",
    photos: [
      { src: null, alt: "the north wing facade behind fencing" },
      { src: null, alt: "the sanctioned treetop walkway over the sanatorium" },
    ],
    notes: [
      {
        id: "n13",
        author: "kb_",
        date: "2026-03-02",
        body: "for what it's worth the paid section covers the best surviving stairwell anyway. not worth a fine.",
      },
    ],
    addedAt: "2026-02-20",
  },
  {
    slug: "quilotoa-far-rim",
    name: "quilotoa far rim",
    region: "cotopaxi",
    country: "ecuador",
    lat: -0.8608,
    lng: -78.9014,
    category: "viewpoint",
    difficulty: "hard",
    access: "open",
    summary: "the two-thirds of the crater rim nobody walks.",
    description:
      "the viewpoint at the village end of the quilotoa crater is full by nine in the morning. the rim trail runs the whole way round — about ten kilometres of it — and almost nobody does more than the first twenty minutes. the far side is exposed, has real drop-offs, and gives you the lake from an angle that isn't in any of the photos.",
    walkInKm: 9.6,
    bestWindow:
      "start at first light. cloud closes the crater by early afternoon.",
    watchOut:
      "3,900m. the altitude, not the distance, is what turns this one around — and there is no water on the rim.",
    photos: [
      { src: null, alt: "the crater lake from the far rim in morning light" },
      { src: null, alt: "exposed section of the rim trail with drop-offs" },
    ],
    notes: [
      {
        id: "n14",
        author: "nadia.r",
        date: "2026-06-24",
        body: "took 5.5h including stops, coming from sea level two days earlier. underestimated it badly. carry more water than you think.",
      },
    ],
    addedAt: "2026-04-06",
  },
  {
    slug: "maunsell-approach",
    name: "maunsell forts approach",
    region: "kent",
    country: "united kingdom",
    lat: 51.4756,
    lng: 1.0472,
    category: "structure",
    difficulty: "serious",
    access: "grey",
    summary: "wartime sea forts standing in the thames estuary on stilts.",
    description:
      "clusters of steel towers built in 1942 to shoot at aircraft, left standing in the estuary ever since, rusting on their legs. you cannot land — the structures are unsound and the ladders are gone. what you can do is get a charter out of whitstable on a flat day and sit underneath them, which is more unsettling than landing would be.",
    walkInKm: 0,
    bestWindow: "flat calm, neap tides, summer only.",
    watchOut:
      "open estuary with serious tidal streams and no shelter. this is a boat trip, not a walk — go with someone who knows the water.",
    photos: [
      { src: null, alt: "the maunsell forts standing on rusted stilts" },
      { src: null, alt: "view up at the underside of a fort tower" },
    ],
    notes: [
      {
        id: "n15",
        author: "tomasz_w",
        date: "2026-07-02",
        body: "two charters out of whitstable run it. neither will go if there's any north in the wind, and they're right not to.",
      },
    ],
    addedAt: "2026-05-01",
  },
  {
    slug: "wieliczka-lower-chamber",
    name: "wieliczka lower chambers",
    region: "lesser poland",
    country: "poland",
    lat: 49.9831,
    lng: 20.0544,
    category: "underground",
    difficulty: "moderate",
    access: "permit",
    summary:
      "the miners' route, three hundred metres down, not the tourist loop.",
    description:
      "everyone does the tourist route past the salt chapel. the miners' route goes deeper, gives you a lamp and a detector, and takes you through unlit working chambers where you climb rather than walk. same mine, entirely different experience, and it books out far less because most people don't know it exists.",
    walkInKm: 2.8,
    bestWindow: "year round. 14°c and no weather, ever.",
    watchOut:
      "three hours underground with real ladders. not one for anyone shaky on climbing in the dark.",
    photos: [
      { src: null, alt: "unlit working chamber on the miners' route" },
      { src: null, alt: "timber supports in a lower salt gallery" },
    ],
    notes: [
      {
        id: "n16",
        author: "agnieszka",
        date: "2026-05-16",
        body: "book the miners' route online a week ahead. english departures are only twice a day.",
      },
    ],
    addedAt: "2026-03-25",
  },
];
