/* ===============================
   SARA — Frontend API Helper
   Pure Vanilla JS (ES Module)
   =============================== */

/* -------- API PATHS -------- */

export const API_PATHS = {
  warehouseUpload: "http://127.0.0.1:5000/admin/upload/warehouse",
  reliefUpload: "http://127.0.0.1:5000/admin/upload/relief",
  routesUpload: "http://127.0.0.1:5000/admin/upload/routes",
  runAllocation: "http://127.0.0.1:5000/admin/allocate",
  publicAllocations: "http://127.0.0.1:5000/public/allocations"
};

/* -------- FETCH WRAPPER -------- */

export const api = {
  async get(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`GET ${url} failed (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      console.error("API GET error:", err);
      throw err;
    }
  },

  async post(url, body = {}) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`POST ${url} failed (${res.status}): ${text}`);
      }

      return await res.json();
    } catch (err) {
      console.error("API POST error:", err);
      throw err;
    }
  }
};

/* -------- SMALL HELPERS -------- */

export const $ = (selector) => document.querySelector(selector);

export const $$ = (selector) => Array.from(document.querySelectorAll(selector));

export function toast(message) {
  alert(message);
}

/* -------- CSV / PAIRS PARSER (USED IN RELIEF & WAREHOUSE) -------- */

/**
 * Converts:
 *   "Food:120; Water:60"
 * into:
 *   [{resource:"Food", quantity:120}, ...]
 */
export function parsePairs(str, itemSep = ";", kvSep = ":") {
  if (!str) return [];

  return str
    .split(itemSep)
    .map(s => s.trim())
    .filter(Boolean)
    .map(pair => {
      const [k, v] = pair.split(kvSep).map(x => x.trim());
      return {
        resource: k,
        quantity: Number(v)
      };
    })
    .filter(x => x.resource && Number.isFinite(x.quantity));
}
