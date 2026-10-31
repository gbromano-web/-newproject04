// UAE location tree: Emirate > (City) > Community. All seven emirates.
// Coordinates are approximate centres for map pins, not boundaries.
// Emirates are stored at the PROVINCE level so "Dubai Marina, Dubai" reads
// like "Makati CBD, Makati"; communities are DISTRICTs.
//
// `adPermit` names the advertising permit every listing ad in that emirate must
// show: Dubai (DLD Trakheesi, per listing, with a Madmoun QR code), Abu Dhabi
// (ADREC Madhmoun, required since 7 July 2025) and Ras Al Khaimah (RAK RERA
// advertisement permit, issued per ad campaign). The database enforces it there.
// In Sharjah, Ajman, Umm Al Quwain and Fujairah a permit number is optional and
// shown when the agent gives one.

import type { LocationNode } from "../ph/locations";

const community = (name: string, lat: number, lng: number, aliases: string[] = [], popular = false): LocationNode => ({
  name, level: "DISTRICT", lat, lng, aliases, popular,
});

export const UAE_LOCATIONS: LocationNode[] = [
  {
    name: "Dubai", level: "PROVINCE", popular: true, lat: 25.2048, lng: 55.2708, adPermit: "DLD Trakheesi permit",
    children: [
      community("Downtown Dubai", 25.1972, 55.2744, ["Downtown", "Burj Khalifa"], true),
      community("Dubai Marina", 25.0805, 55.1403, ["Marina"], true),
      community("Business Bay", 25.185, 55.265, [], true),
      community("Palm Jumeirah", 25.1124, 55.139, ["The Palm", "Palm"], true),
      community("Jumeirah Village Circle", 25.059, 55.209, ["JVC"], true),
      community("Dubai Hills Estate", 25.112, 55.245, ["Dubai Hills"], true),
      community("Jumeirah Lake Towers", 25.07, 55.143, ["JLT"]),
      community("Jumeirah Beach Residence", 25.078, 55.134, ["JBR"]),
      community("Dubai International Financial Centre", 25.211, 55.281, ["DIFC"]),
      community("Dubai Creek Harbour", 25.2, 55.345, ["Creek Harbour"]),
      community("Arabian Ranches", 25.055, 55.269),
      community("Damac Hills", 25.023, 55.251),
      community("Mohammed Bin Rashid City", 25.17, 55.3, ["MBR City", "Meydan"]),
      community("Jumeirah", 25.205, 55.245),
      community("Al Barsha", 25.11, 55.2),
      community("Al Furjan", 25.027, 55.146),
      community("Town Square", 24.997, 55.293),
      community("Dubai South", 24.896, 55.161),
      community("Dubai Silicon Oasis", 25.119, 55.382, ["DSO"]),
      community("International City", 25.165, 55.409),
      community("Mirdif", 25.22, 55.42),
      community("Deira", 25.271, 55.317),
      community("Bur Dubai", 25.253, 55.297),
    ],
  },
  {
    name: "Abu Dhabi", level: "PROVINCE", popular: true, lat: 24.4539, lng: 54.3773, adPermit: "ADREC Madhmoun permit",
    children: [
      community("Al Reem Island", 24.498, 54.406, ["Reem Island", "Reem"], true),
      community("Saadiyat Island", 24.542, 54.433, ["Saadiyat"], true),
      community("Yas Island", 24.488, 54.608, ["Yas"], true),
      community("Al Raha Beach", 24.452, 54.596, ["Raha Beach"]),
      community("Al Maryah Island", 24.501, 54.39, ["Maryah"]),
      community("Khalifa City", 24.419, 54.578),
      community("Masdar City", 24.427, 54.617, ["Masdar"]),
      community("Al Reef", 24.459, 54.674),
      community("Mohammed Bin Zayed City", 24.343, 54.545, ["MBZ City"]),
      community("Al Khalidiyah", 24.47, 54.348, ["Corniche"]),
      { name: "Al Ain", level: "CITY", lat: 24.2075, lng: 55.7447 },
    ],
  },
  {
    name: "Sharjah", level: "PROVINCE", popular: true, lat: 25.3463, lng: 55.4209,
    children: [
      community("Aljada", 25.312, 55.494, [], true),
      community("Al Majaz", 25.327, 55.383),
      community("Al Khan", 25.329, 55.366),
      community("Al Nahda", 25.305, 55.373, ["Al Nahda Sharjah"]),
      community("Muwaileh", 25.296, 55.468),
    ],
  },
  {
    name: "Ajman", level: "PROVINCE", lat: 25.4052, lng: 55.5136,
    children: [
      community("Al Nuaimiya", 25.389, 55.452),
      community("Al Rashidiya", 25.397, 55.437),
      community("Al Zorah", 25.44, 55.49, [], true),
      community("Emirates City", 25.42, 55.56),
    ],
  },
  {
    name: "Ras Al Khaimah", level: "PROVINCE", popular: true, lat: 25.8007, lng: 55.9762, aliases: ["RAK"], adPermit: "RAK RERA advertising permit",
    children: [
      community("Al Marjan Island", 25.667, 55.738, ["Marjan Island", "Marjan"], true),
      community("Al Hamra Village", 25.693, 55.782, ["Al Hamra"]),
      community("Mina Al Arab", 25.728, 55.84),
    ],
  },
  { name: "Umm Al Quwain", level: "PROVINCE", lat: 25.5647, lng: 55.5552, aliases: ["UAQ"] },
  {
    name: "Fujairah", level: "PROVINCE", lat: 25.1288, lng: 56.3265,
    children: [
      { name: "Dibba Al Fujairah", level: "CITY", lat: 25.619, lng: 56.273, aliases: ["Dibba"] },
      community("Al Aqah", 25.495, 56.36),
    ],
  },
];
