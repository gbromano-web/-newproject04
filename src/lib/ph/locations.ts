// Starter location tree: Region > Province > City > District/CBD.
// Coordinates are approximate centroids for map centring, not boundaries.
// PSGC codes are left out on purpose: import them from the PSA's official
// PSGC publication rather than typing them by hand.

export type LocationLevel = "REGION" | "PROVINCE" | "CITY" | "MUNICIPALITY" | "BARANGAY" | "DISTRICT";

export interface LocationNode {
  name: string;
  level: LocationLevel;
  aliases?: string[];
  popular?: boolean;
  lat?: number;
  lng?: number;
  children?: LocationNode[];
}

const city = (name: string, lat: number, lng: number, children: LocationNode[] = [], popular = false): LocationNode => ({
  name, level: "CITY", lat, lng, children, popular,
});
const district = (name: string, lat: number, lng: number, aliases: string[] = [], popular = false): LocationNode => ({
  name, level: "DISTRICT", lat, lng, aliases, popular,
});

const PH_LOCATIONS: LocationNode[] = [
  {
    name: "National Capital Region",
    level: "REGION",
    aliases: ["NCR"],
    children: [
      {
        // NCR has no provinces; "Metro Manila" is the grouping users search for.
        name: "Metro Manila",
        level: "PROVINCE",
        aliases: ["Manila", "MM"],
        popular: true,
        lat: 14.5995,
        lng: 120.9842,
        children: [
          city("Taguig", 14.5176, 121.0509, [
            district("Bonifacio Global City", 14.5509, 121.0509, ["BGC", "The Fort", "Fort Bonifacio"], true),
            district("McKinley Hill", 14.5345, 121.0507, ["McKinley"]),
            district("ARCA South", 14.5097, 121.0427),
          ], true),
          city("Makati", 14.5547, 121.0244, [
            district("Makati CBD", 14.5547, 121.0244, ["Ayala Avenue", "Makati Central Business District"], true),
            district("Salcedo Village", 14.5606, 121.0214),
            district("Legazpi Village", 14.5560, 121.0170),
            district("Rockwell Center", 14.5649, 121.0367, ["Rockwell"], true),
          ], true),
          city("Pasig", 14.5764, 121.0851, [
            district("Ortigas Center", 14.5869, 121.0614, ["Ortigas", "Ortigas CBD"], true),
            district("Kapitolyo", 14.5717, 121.0581),
          ], true),
          city("Quezon City", 14.6760, 121.0437, [
            district("Eastwood City", 14.6095, 121.0793, ["Eastwood"]),
            district("Vertis North", 14.6510, 121.0349),
            district("Cubao", 14.6191, 121.0538, ["Araneta City"]),
          ], true),
          city("Mandaluyong", 14.5794, 121.0359),
          city("Manila", 14.5995, 120.9842, [
            district("Malate", 14.5714, 120.9890),
            district("Ermita", 14.5831, 120.9845),
          ]),
          city("Pasay", 14.5378, 121.0014, [district("Bay Area", 14.5350, 120.9822, ["MOA Complex", "SM Mall of Asia area"])]),
          city("Parañaque", 14.4793, 121.0198, [district("Aseana City", 14.5260, 120.9890, ["Aseana"])]),
          city("Muntinlupa", 14.4081, 121.0415, [
            district("Alabang", 14.4195, 121.0420, ["Filinvest City", "Ayala Alabang"], true),
          ]),
          city("San Juan", 14.6019, 121.0355),
          city("Las Piñas", 14.4445, 120.9939),
        ],
      },
    ],
  },
  {
    name: "CALABARZON",
    level: "REGION",
    aliases: ["Region IV-A"],
    children: [
      {
        name: "Cavite", level: "PROVINCE", popular: true, lat: 14.2456, lng: 120.8786,
        children: [
          city("Imus", 14.4297, 120.9367),
          city("Dasmariñas", 14.3294, 120.9367),
          city("General Trias", 14.3869, 120.8817),
          city("Bacoor", 14.4590, 120.9290),
          city("Tagaytay", 14.1153, 120.9621, [], true),
        ],
      },
      {
        name: "Laguna", level: "PROVINCE", popular: true, lat: 14.2691, lng: 121.4113,
        children: [
          city("Santa Rosa", 14.3122, 121.1114, [district("Nuvali", 14.2410, 121.0560)]),
          city("Biñan", 14.3428, 121.0806),
          city("Calamba", 14.2117, 121.1653),
        ],
      },
      { name: "Rizal", level: "PROVINCE", lat: 14.6037, lng: 121.3084, children: [city("Antipolo", 14.6255, 121.1245)] },
      { name: "Batangas", level: "PROVINCE", lat: 13.7565, lng: 121.0583, children: [city("Lipa", 13.9411, 121.1631), city("Batangas City", 13.7565, 121.0583)] },
    ],
  },
  {
    name: "Cordillera Administrative Region",
    level: "REGION",
    aliases: ["CAR", "Cordilleras"],
    children: [
      { name: "Benguet", level: "PROVINCE", lat: 16.4023, lng: 120.5960, children: [city("Baguio", 16.4023, 120.5960, [], true)] },
      { name: "Ifugao", level: "PROVINCE", lat: 16.8331, lng: 121.1710, children: [{ name: "Banaue", level: "MUNICIPALITY", lat: 16.9110, lng: 121.0590 }] },
    ],
  },
  {
    name: "MIMAROPA",
    level: "REGION",
    aliases: ["Region IV-B"],
    children: [
      {
        name: "Palawan", level: "PROVINCE", popular: true, lat: 9.8349, lng: 118.7384,
        children: [
          city("Puerto Princesa", 9.7392, 118.7353),
          { name: "El Nido", level: "MUNICIPALITY", lat: 11.1956, lng: 119.4075, popular: true },
          { name: "Coron", level: "MUNICIPALITY", lat: 11.9986, lng: 120.2043 },
        ],
      },
    ],
  },
  {
    name: "Bicol Region",
    level: "REGION",
    aliases: ["Region V"],
    children: [
      { name: "Albay", level: "PROVINCE", lat: 13.1775, lng: 123.5280, children: [city("Legazpi", 13.1391, 123.7438)] },
    ],
  },
  {
    name: "Central Luzon",
    level: "REGION",
    aliases: ["Region III"],
    children: [
      {
        name: "Pampanga", level: "PROVINCE", lat: 15.0794, lng: 120.6200,
        children: [
          city("Angeles", 15.1450, 120.5887),
          city("Mabalacat", 15.2230, 120.5740, [district("Clark Freeport Zone", 15.1860, 120.5470, ["Clark", "CFZ"], true)]),
          city("San Fernando", 15.0286, 120.6898),
        ],
      },
    ],
  },
  {
    name: "Central Visayas",
    level: "REGION",
    aliases: ["Region VII"],
    children: [
      {
        name: "Cebu", level: "PROVINCE", popular: true, lat: 10.3157, lng: 123.8854,
        children: [
          city("Cebu City", 10.3157, 123.8854, [
            district("Cebu IT Park", 10.3297, 123.9054, ["IT Park", "Apas"], true),
            district("Cebu Business Park", 10.3180, 123.9050, ["Ayala Center Cebu"], true),
          ], true),
          city("Mandaue", 10.3236, 123.9223),
          city("Lapu-Lapu", 10.3103, 123.9494, [district("Mactan", 10.2950, 123.9650, ["Mactan Island"])]),
        ],
      },
      {
        name: "Bohol", level: "PROVINCE", popular: true, lat: 9.8500, lng: 124.1435,
        children: [
          city("Tagbilaran", 9.6475, 123.8556),
          { name: "Panglao", level: "MUNICIPALITY", lat: 9.5790, lng: 123.7440, popular: true },
          { name: "Carmen", level: "MUNICIPALITY", lat: 9.8210, lng: 124.1960, aliases: ["Chocolate Hills"] },
        ],
      },
    ],
  },
  {
    name: "Davao Region",
    level: "REGION",
    aliases: ["Region XI"],
    children: [
      { name: "Davao del Sur", level: "PROVINCE", lat: 6.7656, lng: 125.3284, children: [city("Davao City", 7.1907, 125.4553, [district("Lanang", 7.1050, 125.6330)], true)] },
    ],
  },
];

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Parañaque -> Paranaque
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface FlatLocation {
  key: string; // slug path, stable across seeds
  name: string;
  displayName: string;
  level: LocationLevel;
  parentKey: string | null;
  ancestorKeys: string[];
  aliases: string[];
  isPopular: boolean;
  lat: number | null;
  lng: number | null;
}

/** Flattens the tree parent-first, so rows can be inserted in order. */
export function flattenLocations(nodes = PH_LOCATIONS, parent: FlatLocation | null = null): FlatLocation[] {
  return nodes.flatMap((n) => {
    const key = parent ? `${parent.key}/${slugify(n.name)}` : slugify(n.name);
    // "Bonifacio Global City, Taguig" — show the nearest city for districts, the province for cities
    const displayName = parent && n.level !== "REGION" && parent.level !== "REGION" ? `${n.name}, ${parent.name}` : n.name;
    const row: FlatLocation = {
      key,
      name: n.name,
      displayName,
      level: n.level,
      parentKey: parent?.key ?? null,
      ancestorKeys: parent ? [...parent.ancestorKeys, parent.key] : [],
      aliases: n.aliases ?? [],
      isPopular: n.popular ?? false,
      lat: n.lat ?? null,
      lng: n.lng ?? null,
    };
    return [row, ...flattenLocations(n.children ?? [], row)];
  });
}
