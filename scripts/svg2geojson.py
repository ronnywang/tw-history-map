#!/usr/bin/env python3
"""
svg2geojson.py
將 1915_Taihoku_Cho.svg 的行政區域 polygon 轉成 GeoJSON，
並寫入 SpatiaLite 資料庫。

使用方式：
  python3 scripts/svg2geojson.py \
      --svg data/1915_Taihoku_Cho.svg \
      --gcps /path/to/1915_taihoku_gcps.json \
      --db data/taiwan.db \
      [--era jp_1895] [--dry-run]
"""

import argparse
import json
import math
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET

# ── SVG namespace ─────────────────────────────────────────────────────────────
SVG_NS = 'http://www.w3.org/2000/svg'

# ── 14 個支廳對應的填色（依 SVG id 順序）──────────────────────────────────────
# 顏色 → 支廳名稱，透過文字標籤位置自動比對，這裡只做備用映射
COLOR_FALLBACK = {
    '#ffc1c1': '新店支廳',
    '#c1c1ff': '枋橋支廳',
    '#c1feff': '士林支廳',
    '#efed0f': '廳直轄',
    '#c1ffc1': '錫口支廳',
    '#c4ff89': '深坑支廳',
    '#e0c1ff': '瑞芳支廳',
    '#c1e0ff': '基隆支廳',
    '#ffe0c1': '新庄支廳',
    '#ffc1fe': '頂雙溪支廳',
    '#e0e0e0': '水返腳支廳',
    '#c1ffe0': '金包里支廳',
    '#fff1c1': '淡水支廳',
    '#cdbfac': '小基隆支廳',
}

# ── SVG Path 解析器 ──────────────────────────────────────────────────────────

def tokenize_path(d):
    """將 SVG path d 屬性拆成 (command, [args]) 的 list"""
    tokens = re.findall(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)
    commands = []
    current_cmd = None
    current_args = []
    for t in tokens:
        if t.isalpha():
            if current_cmd:
                commands.append((current_cmd, current_args))
            current_cmd = t
            current_args = []
        else:
            current_args.append(float(t))
    if current_cmd:
        commands.append((current_cmd, current_args))
    return commands

def cubic_bezier_points(p0, p1, p2, p3, n=8):
    """對三次貝塞爾曲線取樣 n 個點（不含起點）"""
    pts = []
    for i in range(1, n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3*p0[0] + 3*mt**2*t*p1[0] + 3*mt*t**2*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt**2*t*p1[1] + 3*mt*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def path_to_rings(d):
    """
    解析 SVG path d 屬性，回傳 list of rings（每個 ring 是 [(x,y), ...] 的 SVG 像素座標）
    支援: M m L l H h V v C c S s Z z
    """
    commands = tokenize_path(d)
    rings = []
    current_ring = []
    cx, cy = 0.0, 0.0   # 目前位置
    last_cp = None       # 上一個控制點（for S/s）
    start_x, start_y = 0.0, 0.0

    for cmd, args in commands:
        rel = cmd.islower()
        cmd_u = cmd.upper()

        if cmd_u == 'M':
            if current_ring and len(current_ring) > 2:
                rings.append(current_ring)
            current_ring = []
            last_cp = None
            for i in range(0, len(args), 2):
                x = (cx + args[i]   if rel else args[i])
                y = (cy + args[i+1] if rel else args[i+1])
                cx, cy = x, y
                if i == 0:
                    start_x, start_y = x, y
                current_ring.append((x, y))
            # 後續隱含 L
            cmd_u = 'L'

        elif cmd_u == 'L':
            last_cp = None
            for i in range(0, len(args), 2):
                x = (cx + args[i]   if rel else args[i])
                y = (cy + args[i+1] if rel else args[i+1])
                cx, cy = x, y
                current_ring.append((x, y))

        elif cmd_u == 'H':
            last_cp = None
            for v in args:
                x = (cx + v if rel else v)
                cx = x
                current_ring.append((x, cy))

        elif cmd_u == 'V':
            last_cp = None
            for v in args:
                y = (cy + v if rel else v)
                cy = y
                current_ring.append((cx, y))

        elif cmd_u == 'C':
            for i in range(0, len(args), 6):
                x1 = (cx + args[i]   if rel else args[i])
                y1 = (cy + args[i+1] if rel else args[i+1])
                x2 = (cx + args[i+2] if rel else args[i+2])
                y2 = (cy + args[i+3] if rel else args[i+3])
                xe = (cx + args[i+4] if rel else args[i+4])
                ye = (cy + args[i+5] if rel else args[i+5])
                pts = cubic_bezier_points((cx,cy),(x1,y1),(x2,y2),(xe,ye))
                current_ring.extend(pts)
                last_cp = (x2, y2)
                cx, cy = xe, ye

        elif cmd_u == 'S':
            for i in range(0, len(args), 4):
                if last_cp:
                    x1 = 2*cx - last_cp[0]
                    y1 = 2*cy - last_cp[1]
                else:
                    x1, y1 = cx, cy
                x2 = (cx + args[i]   if rel else args[i])
                y2 = (cy + args[i+1] if rel else args[i+1])
                xe = (cx + args[i+2] if rel else args[i+2])
                ye = (cy + args[i+3] if rel else args[i+3])
                pts = cubic_bezier_points((cx,cy),(x1,y1),(x2,y2),(xe,ye))
                current_ring.extend(pts)
                last_cp = (x2, y2)
                cx, cy = xe, ye

        elif cmd_u == 'Z':
            current_ring.append((start_x, start_y))
            if len(current_ring) > 2:
                rings.append(current_ring)
            current_ring = []
            cx, cy = start_x, start_y
            last_cp = None

    if current_ring and len(current_ring) > 2:
        rings.append(current_ring)

    return rings

# ── 仿射變換 ────────────────────────────────────────────────────────────────

def compute_affine(gcps):
    """
    用最小二乘法計算仿射係數
    lon = ax*svgX + ay*svgY + a0
    lat = bx*svgX + by*svgY + b0
    回傳 (coeff_lon, coeff_lat) 各為 [ax, ay, a0]
    """
    n = len(gcps)
    A  = [[g['svgX'], g['svgY'], 1] for g in gcps]
    ls = [g['lon'] for g in gcps]
    ps = [g['lat'] for g in gcps]

    def lstsq3(mat, vec):
        # 用 3×3 正規方程解（不依賴 numpy）
        m = len(mat)
        # AtA
        AtA = [[0]*3 for _ in range(3)]
        Atb = [0]*3
        for i in range(m):
            for r in range(3):
                Atb[r] += mat[i][r] * vec[i]
                for c in range(3):
                    AtA[r][c] += mat[i][r] * mat[i][c]
        # Gauss 消去
        aug = [AtA[r][:] + [Atb[r]] for r in range(3)]
        for col in range(3):
            pivot = max(range(col, 3), key=lambda r: abs(aug[r][col]))
            aug[col], aug[pivot] = aug[pivot], aug[col]
            for r in range(col+1, 3):
                if aug[col][col] == 0:
                    continue
                f = aug[r][col] / aug[col][col]
                for c in range(col, 4):
                    aug[r][c] -= f * aug[col][c]
        x = [0]*3
        for r in range(2, -1, -1):
            x[r] = aug[r][3]
            for c in range(r+1, 3):
                x[r] -= aug[r][c] * x[c]
            if aug[r][r] != 0:
                x[r] /= aug[r][r]
        return x

    return lstsq3(A, ls), lstsq3(A, ps)

def svg_to_wgs84(x, y, coeff_lon, coeff_lat):
    lon = coeff_lon[0]*x + coeff_lon[1]*y + coeff_lon[2]
    lat = coeff_lat[0]*x + coeff_lat[1]*y + coeff_lat[2]
    return lon, lat

def ring_to_wgs84(ring, coeff_lon, coeff_lat):
    return [svg_to_wgs84(x, y, coeff_lon, coeff_lat) for x, y in ring]

# ── 從 SVG 抽取文字標籤位置，用來比對支廳名稱 ───────────────────────────────

def extract_text_positions(root):
    """回傳 [(text_content, x, y), ...]，只取 layer6 的文字"""
    results = []
    # 找 id=layer6 的 group
    layer6 = None
    for g in root.iter(f'{{{SVG_NS}}}g'):
        if g.get('id') == 'layer6':
            layer6 = g
            break
    if layer6 is None:
        return results

    for text_el in layer6.iter(f'{{{SVG_NS}}}text'):
        try:
            tx = float(text_el.get('x', 0))
            ty = float(text_el.get('y', 0))
        except ValueError:
            continue
        # 收集所有 tspan 文字
        parts = []
        for tspan in text_el.iter(f'{{{SVG_NS}}}tspan'):
            if tspan.text:
                parts.append(tspan.text.strip())
        label = ''.join(parts)
        if '支廳' in label or '廳直轄' in label or '廳 直轄' in label:
            results.append((label, tx, ty))
    return results

def polygon_centroid(rings):
    """計算多邊形第一個 ring 的重心"""
    ring = rings[0]
    sx = sum(p[0] for p in ring)
    sy = sum(p[1] for p in ring)
    return sx / len(ring), sy / len(ring)

def assign_names(colored_paths, text_positions):
    """
    對每個 colored path，找最近的支廳文字標籤
    colored_paths: [(id, color, rings), ...]
    text_positions: [(label, tx, ty), ...]
    回傳 {path_id: label}
    """
    assignments = {}
    used = set()
    centroids = {pid: polygon_centroid(rings) for pid, color, rings in colored_paths}

    for pid, color, rings in colored_paths:
        cx, cy = centroids[pid]
        best_label = None
        best_dist = float('inf')
        for label, tx, ty in text_positions:
            if label in used:
                continue
            dist = math.sqrt((tx-cx)**2 + (ty-cy)**2)
            if dist < best_dist:
                best_dist = dist
                best_label = label
        if best_label:
            assignments[pid] = best_label
            used.add(best_label)
        else:
            assignments[pid] = COLOR_FALLBACK.get(color, f'未知({color})')
    return assignments

# ── 主流程 ──────────────────────────────────────────────────────────────────

COLORED_IDS = [f'rect{n}' for n in [3633,3677,3704,3731,3758,3787,3814,3841,3870,3901,3928,3958,3987,4015]]

def get_layer_transform(root):
    """
    讀取各 layer group 的 translate transform，回傳 {layer_id: (tx, ty)}
    只處理 translate(tx, ty) 或 translate(tx) 格式。
    """
    transforms = {}
    for g in root.iter(f'{{{SVG_NS}}}g'):
        eid = g.get('id', '')
        tr  = g.get('transform', '')
        if not tr:
            continue
        m = re.match(r'translate\(\s*([-\d.]+)(?:\s*,\s*([-\d.]+))?\s*\)', tr)
        if m:
            tx = float(m.group(1))
            ty = float(m.group(2)) if m.group(2) else 0.0
            transforms[eid] = (tx, ty)
    return transforms

def apply_transform_to_rings(rings, tx, ty):
    """將 path_to_rings 輸出的 SVG path 座標套用 layer transform，轉為視覺座標"""
    return [[(x + tx, y + ty) for x, y in ring] for ring in rings]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--svg',  required=True)
    parser.add_argument('--gcps', required=True)
    parser.add_argument('--db',   required=True)
    parser.add_argument('--era',  default='jp_1895')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    # 讀 GCPs
    with open(args.gcps) as f:
        gcps = json.load(f)
    print(f"讀取 {len(gcps)} 個 GCP")

    coeff_lon, coeff_lat = compute_affine(gcps)
    print(f"仿射係數 lon: {coeff_lon}")
    print(f"仿射係數 lat: {coeff_lat}")

    # 解析 SVG
    tree = ET.parse(args.svg)
    root = tree.getroot()

    # 取得各 layer 的 transform（尤其是 layer1 的 translate）
    layer_transforms = get_layer_transform(root)
    print(f"Layer transforms: {layer_transforms}")

    # 建立 path id → 所屬 layer 的映射
    def find_layer_for_path(root, pid):
        for g in root.iter(f'{{{SVG_NS}}}g'):
            gid = g.get('id', '')
            if not gid.startswith('layer'):
                continue
            for child in g.iter(f'{{{SVG_NS}}}path'):
                if child.get('id') == pid:
                    return gid
        return None

    # 取出 14 個彩色區域
    colored_paths = []
    path_map = {el.get('id'): el for el in root.iter(f'{{{SVG_NS}}}path')}

    for pid in COLORED_IDS:
        el = path_map.get(pid)
        if el is None:
            print(f"  警告：找不到 {pid}", file=sys.stderr)
            continue
        style = el.get('style', '')
        color = ''
        for part in style.split(';'):
            if part.strip().startswith('fill:'):
                color = part.strip().split(':', 1)[1].strip()
        d = el.get('d', '')
        rings = path_to_rings(d)
        if not rings:
            print(f"  警告：{pid} 沒有解析出 ring", file=sys.stderr)
            continue

        # 套用 layer transform，把 path 座標轉為視覺（viewport）座標
        layer_id = find_layer_for_path(root, pid)
        if layer_id and layer_id in layer_transforms:
            tx, ty = layer_transforms[layer_id]
            rings = apply_transform_to_rings(rings, tx, ty)
            print(f"  {pid} ({color}): layer={layer_id} transform=({tx},{ty:.2f}), {len(rings)} ring(s)")
        else:
            print(f"  {pid} ({color}): 無 layer transform, {len(rings)} ring(s)")

        colored_paths.append((pid, color, rings))

    # 取出文字標籤位置
    text_positions = extract_text_positions(root)
    print(f"\n找到 {len(text_positions)} 個支廳文字標籤：")
    for label, tx, ty in text_positions:
        print(f"  {label!r:20s} @ ({tx:.0f}, {ty:.0f})")

    # 比對名稱
    name_map = assign_names(colored_paths, text_positions)
    print("\n名稱比對結果：")
    for pid, color, rings in colored_paths:
        print(f"  {pid} ({color}) → {name_map[pid]}")

    # 轉換為 WGS84 GeoJSON
    features = []
    for pid, color, rings in colored_paths:
        name = name_map[pid]
        geo_rings = [ring_to_wgs84(r, coeff_lon, coeff_lat) for r in rings]
        # GeoJSON Polygon: [[lon,lat], ...]
        geo_coords = [[[lon, lat] for lon, lat in ring] for ring in geo_rings]
        feature = {
            "type": "Feature",
            "properties": {
                "id": pid,
                "name": name,
                "era_id": args.era,
                "level": 1,
                "color": color,
            },
            "geometry": {
                "type": "Polygon" if len(geo_coords) == 1 else "MultiPolygon",
                "coordinates": geo_coords if len(geo_coords) == 1 else [geo_coords],
            }
        }
        features.append(feature)

    geojson = {"type": "FeatureCollection", "features": features}

    # ── Bounding-box 對齊（可選）────────────────────────────────────────────────
    # 將 GeoJSON 的極值對齊已知地理參考點
    target_north = 25.2975   # 富貴角（台北廳極北）
    target_east  = 122.05    # 三貂角（台北廳極東）稍微加大以補足海岸線
    target_west  = 121.300   # 新北市極西參考點

    def get_all_coords(gj):
        coords = []
        for feat in gj['features']:
            geom = feat['geometry']
            rings = geom['coordinates'] if geom['type'] == 'Polygon' else [r for poly in geom['coordinates'] for r in poly]
            for ring in rings:
                coords.extend(ring)
        return coords

    def set_all_coords(gj, new_coords):
        idx = 0
        for feat in gj['features']:
            geom = feat['geometry']
            if geom['type'] == 'Polygon':
                rings = geom['coordinates']
                for ring in rings:
                    for i in range(len(ring)):
                        ring[i] = new_coords[idx]; idx += 1
            else:
                for poly in geom['coordinates']:
                    for ring in poly:
                        for i in range(len(ring)):
                            ring[i] = new_coords[idx]; idx += 1

    coords = get_all_coords(geojson)
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    cur_max_lat = max(lats)
    cur_max_lon = max(lons)
    cur_min_lon = min(lons)

    # 1. 北移：整體 lat 平移
    lat_shift = target_north - cur_max_lat
    # 2. 東移：整體 lon 平移
    lon_shift = target_east - cur_max_lon
    # 3. 西調：以東極為錨點做 lon 縮放
    new_min_lon = cur_min_lon + lon_shift
    scale_x = (target_east - target_west) / (target_east - new_min_lon)

    new_coords = []
    for lon, lat in coords:
        lon2 = lon + lon_shift                       # east-shift
        lon3 = target_east - (target_east - lon2) * scale_x  # scale around east anchor
        lat2 = lat + lat_shift
        new_coords.append([lon3, lat2])

    set_all_coords(geojson, new_coords)

    # 驗證
    coords2 = get_all_coords(geojson)
    lons2 = [c[0] for c in coords2]
    lats2 = [c[1] for c in coords2]
    print(f"\n對齊後邊界：")
    print(f"  lon: {min(lons2):.6f} ~ {max(lons2):.6f}  (目標 west={target_west}, east={target_east})")
    print(f"  lat: {min(lats2):.6f} ~ {max(lats2):.6f}  (目標 north={target_north})")

    # 寫出 GeoJSON 預覽
    out_path = args.svg.replace('.svg', '_georef.geojson')
    with open(out_path, 'w') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    print(f"\n已寫出 GeoJSON: {out_path}")

    if args.dry_run:
        print("--dry-run 模式，跳過資料庫寫入")
        return

    # 寫入 SpatiaLite
    import ctypes
    spatialite_ext = 'mod_spatialite.8.dylib'

    conn = sqlite3.connect(args.db)
    conn.enable_load_extension(True)
    conn.load_extension(spatialite_ext)

    cur = conn.cursor()

    # 確認 era 存在
    cur.execute("SELECT id FROM eras WHERE id = ?", (args.era,))
    if not cur.fetchone():
        print(f"錯誤：era '{args.era}' 不存在於資料庫", file=sys.stderr)
        sys.exit(1)

    inserted = 0
    for feat in features:
        props = feat['properties']
        geom  = feat['geometry']
        geojson_str = json.dumps(geom)
        try:
            cur.execute("""
                INSERT INTO admin_divisions (era_id, level, name, geom)
                VALUES (?, ?, ?, GeomFromGeoJSON(?))
            """, (props['era_id'], props['level'], props['name'], geojson_str))
            inserted += 1
        except Exception as e:
            print(f"  插入失敗 {props['name']}: {e}", file=sys.stderr)

    conn.commit()
    conn.close()
    print(f"已寫入資料庫：{inserted} 筆行政區域（era={args.era}）")

if __name__ == '__main__':
    main()
