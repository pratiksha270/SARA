import os
import json
import re
import subprocess
from flask import Flask, request, jsonify, send_from_directory

# Optional but recommended: pip install flask-cors
# Prevents browser CORS errors when frontend/backend run on different ports.
try:
    from flask_cors import CORS
    _cors_available = True
except ImportError:
    _cors_available = False

# =========================================================
# PATHS
# =========================================================

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "frontend"))
BACKEND_DIR  = os.path.normpath(os.path.join(BASE_DIR, "..", "backend"))
BACKEND_DATA = os.path.join(BACKEND_DIR, "data")
ALLOC_BIN    = os.path.join(BACKEND_DIR, "alloc")

os.makedirs(BACKEND_DATA, exist_ok=True)

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

# FIX #4 — enable CORS so browser doesn't block API calls
if _cors_available:
    CORS(app)


# =========================================================
# HELPERS
# =========================================================

def csv_field(v):
    """Wrap a value in double-quotes and escape internal quotes.
    FIX #5 — prevents CSV corruption when city/resource names contain commas.
    """
    return '"' + str(v if v is not None else "").replace('"', '""') + '"'


# =========================================================
# FRONTEND ROUTES
# =========================================================

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health")
def health():
    return jsonify({"server": "alive"})


# =========================================================
# CSV WRITERS
# =========================================================

def write_warehouse_csv(rows):
    """
    Accepts frontend payload shape:
      { name, city, stock: [{ resource, quantity }] }
    Also tolerates legacy key 'resources' in place of 'stock'.
    """
    path = os.path.join(BACKEND_DATA, "warehouse.csv")
    with open(path, "w") as f:
        f.write("WarehouseName,City,Resource,Quantity\n")
        for r in rows:
            name  = csv_field(r.get("name"))
            city  = csv_field(r.get("city"))
            stock = r.get("stock") or r.get("resources") or []
            for item in stock:
                resource = csv_field(item.get("resource"))
                quantity = item.get("quantity", 0)
                f.write(f"{name},{city},{resource},{quantity}\n")
    return path


def write_relief_csv(rows):
    """
    Accepts frontend payload shape:
      { name, city, people, urgency, needs: [{ resource, quantity }] }
    Also tolerates legacy key 'resources' in place of 'needs'.
    """
    path = os.path.join(BACKEND_DATA, "relief.csv")
    with open(path, "w") as f:
        f.write("AreaName,City,Resource,Quantity,People,Urgency\n")
        for r in rows:
            name    = csv_field(r.get("name"))
            city    = csv_field(r.get("city"))
            people  = r.get("people", 0)
            urgency = r.get("urgency", 0)
            needs   = r.get("needs") or r.get("resources") or []
            for item in needs:
                resource = csv_field(item.get("resource"))
                quantity = item.get("quantity", 0)
                f.write(f"{name},{city},{resource},{quantity},{people},{urgency}\n")
    return path


def write_routes_csv(routes):
    """
    Accepts frontend payload shape: { from, to, distKm }
    Also tolerates distanceKm / DistanceKm / distance for legacy callers.

    FIX #3 — 'distKm' (the key gov.js actually sends) was never checked,
    so distance was always written as 0.
    """
    path = os.path.join(BACKEND_DATA, "routes.csv")
    with open(path, "w") as f:
        f.write("From,To,DistanceKm\n")
        for r in routes:
            frm  = csv_field(r.get("from"))
            to   = csv_field(r.get("to"))
            dist = (
                r.get("distKm")        # ← what gov.js sends
                or r.get("distance")
                or r.get("distanceKm")
                or r.get("DistanceKm")
                or 0
            )
            f.write(f"{frm},{to},{dist}\n")
    return path


# =========================================================
# ADMIN UPLOAD ENDPOINTS
# =========================================================

@app.route("/admin/upload/warehouse", methods=["POST"])
def upload_warehouse():
    data = request.get_json(silent=True)
    if not data or "warehouses" not in data:
        return jsonify({"error": "Invalid warehouse payload"}), 400
    write_warehouse_csv(data["warehouses"])
    return jsonify({"saved": True})


@app.route("/admin/upload/relief", methods=["POST"])
def upload_relief():
    data = request.get_json(silent=True)
    if not data or "areas" not in data:
        return jsonify({"error": "Invalid relief payload"}), 400
    write_relief_csv(data["areas"])
    return jsonify({"saved": True})


# FIX #1 — gov.js POSTs routes to /admin/routes (not /admin/upload/routes).
# Both URLs now work so nothing else in the project breaks.

@app.route("/admin/upload/routes", methods=["POST"])
@app.route("/admin/routes",        methods=["POST"])   # ← alias used by gov.js
def upload_routes():
    data = request.get_json(silent=True)
    if isinstance(data, list):
        routes = data
    elif isinstance(data, dict) and "routes" in data:
        routes = data["routes"]
    else:
        return jsonify({"error": "Invalid routes payload"}), 400
    write_routes_csv(routes)
    return jsonify({"saved": True, "message": f"Saved {len(routes)} route(s)."})


# =========================================================
# RUN ALLOCATION
# =========================================================

@app.route("/admin/allocate", methods=["POST"])
def allocate():
    warehouse_csv = os.path.join(BACKEND_DATA, "warehouse.csv")
    relief_csv    = os.path.join(BACKEND_DATA, "relief.csv")
    routes_csv    = os.path.join(BACKEND_DATA, "routes.csv")

    if not (
        os.path.exists(warehouse_csv)
        and os.path.exists(relief_csv)
        and os.path.exists(routes_csv)
    ):
        return jsonify({"error": "Missing uploaded CSV data. Please upload warehouse, relief, and routes data first."}), 400

    try:
        result = subprocess.check_output(
            [ALLOC_BIN, warehouse_csv, relief_csv, routes_csv],
            stderr=subprocess.STDOUT,
            text=True
        )

        # FIX #6 — C binary may emit debug lines before the JSON object.
        # Extract only the JSON portion so json.loads never crashes.
        json_match = re.search(r'(\{.*\}|\[.*\])', result, re.DOTALL)
        if not json_match:
            return jsonify({"error": "C backend returned no JSON", "detail": result}), 500

        json_str   = json_match.group(0)
        parsed     = json.loads(json_str)

        alloc_path = os.path.join(BACKEND_DATA, "last_alloc.json")
        with open(alloc_path, "w") as f:
            json.dump(parsed, f)

        return jsonify(parsed)

    except subprocess.CalledProcessError as e:
        return jsonify({"error": "C backend failed", "detail": e.output}), 500
    except json.JSONDecodeError as e:
        return jsonify({"error": "C backend output was not valid JSON", "detail": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================================
# PUBLISH SNAPSHOT  — FIX #2: route was missing entirely
# gov.js calls POST /admin/publish after every Run Allocation.
# =========================================================

@app.route("/admin/publish", methods=["POST"])
def publish_snapshot():
    alloc_path   = os.path.join(BACKEND_DATA, "last_alloc.json")
    publish_path = os.path.join(BACKEND_DATA, "published.json")

    if not os.path.exists(alloc_path):
        return jsonify({"error": "No allocation to publish. Run allocation first."}), 400

    try:
        with open(alloc_path) as f:
            data = json.load(f)

        with open(publish_path, "w") as f:
            json.dump(data, f)

        return jsonify({"message": "Snapshot published successfully."})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================================
# PUBLIC DASHBOARD
# =========================================================

@app.route("/public/allocations")
def public_allocations():
    alloc_path = os.path.join(BACKEND_DATA, "last_alloc.json")
    if not os.path.exists(alloc_path):
        return jsonify({"allocations": [], "summary": {}})
    with open(alloc_path) as f:
        return jsonify(json.load(f))


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":
    print("-------------------------------------------------------")
    print("SARA Backend running at http://127.0.0.1:5000/")
    print("Frontend dir:", FRONTEND_DIR)
    print("Data dir    :", BACKEND_DATA)
    if not _cors_available:
        print("TIP: pip install flask-cors  to suppress CORS warnings")
    print("-------------------------------------------------------")
    app.run(host="127.0.0.1", port=5000, debug=True)
