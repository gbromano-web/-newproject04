// Load test for Go Search Property (k6: https://grafana.com/docs/k6/).
//
//   k6 run -e BASE=https://gosearchproperty.com -e PROFILE=smoke tests/load/k6.js
//   k6 run -e BASE=https://<preview>.vercel.app  -e PROFILE=peak  tests/load/k6.js
//
// Read-only: it never sends inquiries or signs anyone in, so production data and
// rate limits are untouched. Run "peak" and "stress" against a preview deployment
// (same database), off-peak, and tell Supabase/Vercel usage alerts to expect it.
import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE = (__ENV.BASE || "http://127.0.0.1:3210").replace(/\/$/, "");
const PROFILE = __ENV.PROFILE || "smoke";

// Arrival rates in pages per second. Sized for 1-5k visitors a day:
// a busy hour is ~10% of a day's ~25k page views, about 7 pages/s, so "peak" is ~3x that.
const PROFILES = {
  smoke: [{ duration: "1m", target: 2 }],
  peak: [
    { duration: "2m", target: 20 },
    { duration: "5m", target: 20 },
    { duration: "1m", target: 0 },
  ],
  stress: [
    { duration: "2m", target: 20 },
    { duration: "3m", target: 60 },
    { duration: "3m", target: 120 },
    { duration: "1m", target: 0 },
  ],
};

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-arrival-rate",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 400,
      stages: PROFILES[PROFILE],
    },
  },
  // Latency budgets: the run fails if any is missed
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:page}": ["p(95)<800", "p(99)<2000"],
    "http_req_duration{kind:static}": ["p(95)<300"],
    "http_req_duration{kind:health}": ["p(95)<500"],
    checks: ["rate>0.99"],
  },
};

const SEARCHES = [
  "/search?location=Metro%20Manila",
  "/search?type=RENT&location=BGC",
  "/search?type=PRE_SELLING&location=Makati",
  "/uae/search?location=Dubai",
  "/uae/search?type=SALE&location=Dubai%20Marina",
];

export function setup() {
  // Real listing slugs from the sitemap, so property pages are realistic
  const xml = http.get(`${BASE}/sitemap.xml`).body || "";
  const slugs = [...xml.matchAll(/\/property\/([a-z0-9-]+)</g)].map((m) => m[1]);
  return { slugs };
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const page = (path) => {
  const r = http.get(`${BASE}${path}`, { tags: { kind: "page", name: path.split("?")[0] } });
  check(r, { [`${path.split("?")[0]} is 200`]: (x) => x.status === 200 });
  return r;
};

export default function visit({ slugs }) {
  const roll = Math.random();
  group("visit", () => {
    if (roll < 0.35) page(pick(["/", "/uae"]));
    else if (roll < 0.7) page(pick(SEARCHES));
    else if (roll < 0.92 && slugs.length) page(`/property/${pick(slugs)}`);
    else if (roll < 0.97) page(pick(["/calculator", "/uae/calculator", "/about", "/contact"]));
    else {
      const h = http.get(`${BASE}/api/health`, { tags: { kind: "health" } });
      check(h, { "health ok": (x) => x.status === 200 && x.json("database") === "ok" });
    }
  });
  if (roll < 0.1) {
    const html = http.get(`${BASE}/`, { tags: { kind: "page", name: "/" } }).body || "";
    const asset = (html.match(/\/_next\/static\/[^"]+\.js/) || [])[0];
    if (asset) {
      const a = http.get(`${BASE}${asset}`, { tags: { kind: "static" } });
      check(a, { "static asset is immutable": (x) => /immutable/.test(x.headers["Cache-Control"] || "") });
    }
  }
  sleep(Math.random());
}
