<?php
/**
 * OsmTileController
 * 路由：/osm/{z}/{x}/{y}
 *
 * 從 data/osm_taiwan.db（SpatiaLite）產生本地 OSM 底圖圖磚
 */
class OsmTileController extends MiniEngine_Controller
{
    const TILE_SIZE = 256;

    // Highway styles: [fill_rgb, casing_rgb, base_width, casing_extra_px]
    // base_width is at zoom 14; scaled up/down by zoom factor
    const HIGHWAY_STYLES = [
        'motorway'       => [[233, 146, 162], [195, 107, 107], 8, 2],
        'motorway_link'  => [[233, 146, 162], [195, 107, 107], 5, 2],
        'trunk'          => [[249, 178, 156], [198, 134, 108], 7, 2],
        'trunk_link'     => [[249, 178, 156], [198, 134, 108], 5, 1],
        'primary'        => [[252, 214, 164], [200, 162, 106], 6, 2],
        'primary_link'   => [[252, 214, 164], [200, 162, 106], 4, 1],
        'secondary'      => [[247, 250, 191], [192, 195, 128], 5, 1],
        'secondary_link' => [[247, 250, 191], [192, 195, 128], 3, 1],
        'tertiary'       => [[255, 255, 255], [204, 204, 204], 4, 1],
        'tertiary_link'  => [[255, 255, 255], [204, 204, 204], 3, 1],
        'residential'    => [[255, 255, 255], [187, 187, 187], 3, 1],
        'living_street'  => [[237, 237, 237], [204, 204, 204], 3, 1],
        'unclassified'   => [[255, 255, 255], [187, 187, 187], 3, 1],
        'service'        => [[255, 255, 255], [204, 204, 204], 2, 1],
        'pedestrian'     => [[221, 221, 232], [187, 187, 204], 3, 1],
        'footway'        => [[248, 169, 190], null, 1, 0],
        'cycleway'       => [[100, 100, 255], null, 1, 0],
        'path'           => [[248, 169, 190], null, 1, 0],
        'track'          => [[153, 119, 72],  null, 1, 0],
        'steps'          => [[248, 169, 190], null, 1, 0],
    ];

    // Rendering priority: lower = drawn first (appears under later layers)
    const HIGHWAY_ORDER = [
        'track' => 0, 'path' => 1, 'footway' => 2, 'steps' => 3, 'cycleway' => 4,
        'service' => 5, 'living_street' => 6,
        'pedestrian' => 7, 'unclassified' => 8, 'residential' => 9,
        'tertiary_link' => 10, 'tertiary' => 11,
        'secondary_link' => 12, 'secondary' => 13,
        'primary_link' => 14, 'primary' => 15,
        'trunk_link' => 16, 'trunk' => 17,
        'motorway_link' => 18, 'motorway' => 19,
    ];

    // Landuse / natural / leisure → [R, G, B]
    const LANDUSE_COLORS = [
        'water'       => [170, 211, 223],
        'bay'         => [170, 211, 223],
        'strait'      => [170, 211, 223],
        'wetland'     => [100, 200, 210],
        'wood'        => [173, 209, 158],
        'forest'      => [173, 209, 158],
        'scrub'       => [200, 215, 171],
        'grassland'   => [205, 235, 176],
        'grass'       => [205, 235, 176],
        'meadow'      => [205, 235, 176],
        'heath'       => [214, 217, 159],
        'park'        => [200, 250, 204],
        'garden'      => [206, 234, 214],
        'nature_reserve' => [200, 250, 204],
        'pitch'       => [138, 200, 138],
        'farmland'    => [238, 240, 213],
        'farmyard'    => [234, 216, 173],
        'orchard'     => [155, 220, 140],
        'vineyard'    => [172, 224, 161],
        'allotments'  => [200, 215, 171],
        'residential' => [224, 223, 223],
        'industrial'  => [220, 220, 220],
        'commercial'  => [238, 224, 228],
        'retail'      => [254, 226, 228],
        'construction'=> [199, 199, 180],
        'brownfield'  => [199, 199, 180],
        'greenfield'  => [205, 235, 176],
        'cemetery'    => [170, 203, 175],
        'military'    => [255, 186, 186],
        'beach'       => [255, 241, 186],
        'sand'        => [241, 238, 215],
        'shingle'     => [210, 205, 196],
        'mud'         => [234, 228, 215],
        'religious'   => [200, 190, 230],
    ];

    private static ?SQLite3 $osmDb = null;

    // ── 路由處理 ──────────────────────────────────────────────────────────

    public function indexAction(): void
    {
        $z = (int)($_GET['z'] ?? 0);
        $x = (int)($_GET['x'] ?? 0);
        $y = (int)($_GET['y'] ?? 0);

        if ($z < 0 || $z > 19) {
            http_response_code(400);
            $this->noview();
            return;
        }

        $cache_file = $this->getCachePath($z, $x, $y);
        if (file_exists($cache_file)) {
            header('Content-Type: image/png');
            header('Cache-Control: public, max-age=86400');
            header('X-Cache: HIT');
            readfile($cache_file);
            $this->noview();
            return;
        }

        $bbox = $this->tile2bbox($x, $y, $z);
        $img  = $this->renderTile($bbox, $z);

        $this->saveTileCache($img, $cache_file);

        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=3600');
        header('X-Cache: MISS');
        imagepng($img);

        $this->noview();
    }

    // ── 座標轉換 ──────────────────────────────────────────────────────────

    private function tile2bbox(int $x, int $y, int $z): array
    {
        $n      = 1 << $z;
        $minLon = $x / $n * 360.0 - 180.0;
        $maxLon = ($x + 1) / $n * 360.0 - 180.0;
        $maxLat = rad2deg(atan(sinh(M_PI * (1 - 2 * $y / $n))));
        $minLat = rad2deg(atan(sinh(M_PI * (1 - 2 * ($y + 1) / $n))));
        return [$minLon, $minLat, $maxLon, $maxLat];
    }

    private function lonlat2pixel(float $lon, float $lat, array $bbox): array
    {
        $px = ($lon - $bbox[0]) / ($bbox[2] - $bbox[0]) * self::TILE_SIZE;
        $py = ($bbox[3] - $lat) / ($bbox[3] - $bbox[1]) * self::TILE_SIZE;
        return [(int)round($px), (int)round($py)];
    }

    // ── 主繪製函式 ────────────────────────────────────────────────────────

    private function renderTile(array $bbox, int $z): \GdImage
    {
        $img = imagecreatetruecolor(self::TILE_SIZE, self::TILE_SIZE);
        $bg  = imagecolorallocate($img, 242, 239, 233);   // OSM 標準背景色
        imagefill($img, 0, 0, $bg);

        $simplify = ($bbox[2] - $bbox[0]) / self::TILE_SIZE * 0.5;
        $db  = $this->getOsmDb();

        // Unpack bbox for R*Tree queries: [minLon, minLat, maxLon, maxLat]
        [$minLon, $minLat, $maxLon, $maxLat] = $bbox;

        if ($z >= 7)  $this->drawLanduse($img, $db, $bbox, $minLon, $minLat, $maxLon, $maxLat, $simplify);
        if ($z >= 9)  $this->drawWaterways($img, $db, $bbox, $minLon, $minLat, $maxLon, $maxLat, $simplify, $z);
        if ($z >= 10) $this->drawRoads($img, $db, $bbox, $minLon, $minLat, $maxLon, $maxLat, $simplify, $z);
        if ($z >= 15) $this->drawBuildings($img, $db, $bbox, $minLon, $minLat, $maxLon, $maxLat, $simplify);

        return $img;
    }

    // ── Landuse 面積 ──────────────────────────────────────────────────────

    private function drawLanduse(\GdImage $img, SQLite3 $db, array $bbox,
        float $x0, float $y0, float $x1, float $y1, float $simplify): void
    {
        $sql = "
            SELECT m.landuse, m.\"natural\", m.leisure, m.amenity, m.military,
                   AsGeoJSON(SimplifyPreserveTopology(m.GEOMETRY, {$simplify})) AS geojson
            FROM multipolygons m
            JOIN idx_multipolygons_GEOMETRY idx ON m.ogc_fid = idx.pkid
            WHERE idx.xmin <= {$x1} AND idx.xmax >= {$x0}
              AND idx.ymin <= {$y1} AND idx.ymax >= {$y0}
              AND (m.landuse IS NOT NULL OR m.\"natural\" IS NOT NULL
                   OR m.leisure IS NOT NULL OR m.military IS NOT NULL
                   OR m.amenity = 'grave_yard')
            LIMIT 3000
        ";

        $result = $db->query($sql);
        if (!$result) return;

        $rows = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $rows[] = $row;
        }

        // Render in two passes: non-water first, water on top
        foreach ([false, true] as $water_pass) {
            foreach ($rows as $row) {
                $key = $this->getLanduseKey($row);
                if (!$key || !isset(self::LANDUSE_COLORS[$key])) continue;
                $is_water = in_array($key, ['water', 'bay', 'strait', 'wetland']);
                if ($is_water !== $water_pass) continue;
                if (empty($row['geojson'])) continue;
                $geojson = json_decode($row['geojson'], true);
                if (!$geojson) continue;
                [$r, $g, $b] = self::LANDUSE_COLORS[$key];
                $fill = imagecolorallocate($img, $r, $g, $b);
                $this->drawGeoJsonPolygon($img, $geojson, $bbox, $fill, -1, 0);
            }
        }
    }

    private function getLanduseKey(array $row): ?string
    {
        if (!empty($row['military']))          return 'military';
        if ($row['amenity'] === 'grave_yard')  return 'cemetery';
        if (!empty($row['natural'])) {
            $n = $row['natural'];
            if (isset(self::LANDUSE_COLORS[$n])) return $n;
        }
        if (!empty($row['leisure'])) {
            $l = $row['leisure'];
            if (isset(self::LANDUSE_COLORS[$l])) return $l;
        }
        if (!empty($row['landuse'])) {
            $lu = $row['landuse'];
            if (isset(self::LANDUSE_COLORS[$lu])) return $lu;
        }
        return null;
    }

    // ── 水系線 ────────────────────────────────────────────────────────────

    private function drawWaterways(\GdImage $img, SQLite3 $db, array $bbox,
        float $x0, float $y0, float $x1, float $y1, float $simplify, int $z): void
    {
        $waterColor = imagecolorallocate($img, 170, 211, 223);

        $types = $z >= 13
            ? "'river','canal','stream','drain','ditch'"
            : "'river','canal'";

        $sql = "
            SELECT l.waterway,
                   AsGeoJSON(SimplifyPreserveTopology(l.GEOMETRY, {$simplify})) AS geojson
            FROM lines l
            JOIN idx_lines_GEOMETRY idx ON l.ogc_fid = idx.pkid
            WHERE idx.xmin <= {$x1} AND idx.xmax >= {$x0}
              AND idx.ymin <= {$y1} AND idx.ymax >= {$y0}
              AND l.waterway IN ({$types})
            LIMIT 2000
        ";

        $result = $db->query($sql);
        if (!$result) return;

        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            if (empty($row['geojson'])) continue;
            $geojson = json_decode($row['geojson'], true);
            if (!$geojson) continue;
            $w = match($row['waterway']) {
                'river'  => max(1, min(5, $z - 7)),
                'canal'  => max(1, min(3, $z - 8)),
                default  => 1,
            };
            imagesetthickness($img, $w);
            $this->drawGeoJsonLine($img, $geojson, $bbox, $waterColor);
        }
        imagesetthickness($img, 1);
    }

    // ── 道路 ──────────────────────────────────────────────────────────────

    private function drawRoads(\GdImage $img, SQLite3 $db, array $bbox,
        float $x0, float $y0, float $x1, float $y1, float $simplify, int $z): void
    {
        $types = $this->getHighwayTypesForZoom($z);
        if (empty($types)) return;

        $type_list = "'" . implode("','", $types) . "'";
        $sql = "
            SELECT l.highway,
                   AsGeoJSON(SimplifyPreserveTopology(l.GEOMETRY, {$simplify})) AS geojson
            FROM lines l
            JOIN idx_lines_GEOMETRY idx ON l.ogc_fid = idx.pkid
            WHERE idx.xmin <= {$x1} AND idx.xmax >= {$x0}
              AND idx.ymin <= {$y1} AND idx.ymax >= {$y0}
              AND l.highway IN ({$type_list})
            LIMIT 5000
        ";

        $result = $db->query($sql);
        if (!$result) return;

        $roads = array_fill_keys($types, []);
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            if (empty($row['geojson']) || !isset($roads[$row['highway']])) continue;
            $g = json_decode($row['geojson'], true);
            if ($g) $roads[$row['highway']][] = $g;
        }

        usort($types, fn($a, $b) =>
            (self::HIGHWAY_ORDER[$a] ?? 0) <=> (self::HIGHWAY_ORDER[$b] ?? 0)
        );

        $zf = max(0.4, ($z - 10) / 4.0);

        // Pass 1: casings
        foreach ($types as $type) {
            if (empty($roads[$type])) continue;
            $style = self::HIGHWAY_STYLES[$type] ?? null;
            if (!$style || !$style[1]) continue;
            [$fill_rgb, $casing_rgb, $base_w, $casing_extra] = $style;
            if ($casing_extra <= 0) continue;
            $w = max(1, (int)round($base_w * $zf) + $casing_extra * 2);
            $color = imagecolorallocate($img, $casing_rgb[0], $casing_rgb[1], $casing_rgb[2]);
            imagesetthickness($img, $w);
            foreach ($roads[$type] as $g) {
                $this->drawGeoJsonLine($img, $g, $bbox, $color);
            }
        }

        // Pass 2: fills
        foreach ($types as $type) {
            if (empty($roads[$type])) continue;
            $style = self::HIGHWAY_STYLES[$type] ?? null;
            if (!$style || !$style[0]) continue;
            [$fill_rgb, , $base_w] = $style;
            $w = max(1, (int)round($base_w * $zf));
            $color = imagecolorallocate($img, $fill_rgb[0], $fill_rgb[1], $fill_rgb[2]);
            imagesetthickness($img, $w);
            foreach ($roads[$type] as $g) {
                $this->drawGeoJsonLine($img, $g, $bbox, $color);
            }
        }

        imagesetthickness($img, 1);
    }

    private function getHighwayTypesForZoom(int $z): array
    {
        if ($z >= 14) {
            return array_keys(self::HIGHWAY_STYLES);
        }
        if ($z >= 12) {
            return ['motorway','motorway_link','trunk','trunk_link',
                    'primary','primary_link','secondary','secondary_link',
                    'tertiary','tertiary_link','residential','unclassified',
                    'living_street','pedestrian','service'];
        }
        if ($z >= 10) {
            return ['motorway','motorway_link','trunk','trunk_link',
                    'primary','primary_link','secondary','secondary_link',
                    'tertiary','tertiary_link'];
        }
        // z >= 10 guard already handles z < 10 in renderTile
        return ['motorway','motorway_link','trunk','trunk_link','primary','primary_link'];
    }

    // ── 建築物 ────────────────────────────────────────────────────────────

    private function drawBuildings(\GdImage $img, SQLite3 $db, array $bbox,
        float $x0, float $y0, float $x1, float $y1, float $simplify): void
    {
        $sql = "
            SELECT AsGeoJSON(SimplifyPreserveTopology(m.GEOMETRY, {$simplify})) AS geojson
            FROM multipolygons m
            JOIN idx_multipolygons_GEOMETRY idx ON m.ogc_fid = idx.pkid
            WHERE idx.xmin <= {$x1} AND idx.xmax >= {$x0}
              AND idx.ymin <= {$y1} AND idx.ymax >= {$y0}
              AND m.building IS NOT NULL
            LIMIT 2000
        ";

        $result = $db->query($sql);
        if (!$result) return;

        $fill   = imagecolorallocate($img, 217, 208, 201);
        $border = imagecolorallocate($img, 198, 186, 177);

        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            if (empty($row['geojson'])) continue;
            $geojson = json_decode($row['geojson'], true);
            if (!$geojson) continue;
            $this->drawGeoJsonPolygon($img, $geojson, $bbox, $fill, $border, 1);
        }
    }

    // ── GeoJSON 繪製輔助 ──────────────────────────────────────────────────

    private function drawGeoJsonPolygon(\GdImage $img, array $geojson, array $bbox, int $fill, int $border, int $border_width): void
    {
        $type = $geojson['type'] ?? '';
        $polygons = match($type) {
            'Polygon'      => [$geojson['coordinates']],
            'MultiPolygon' => $geojson['coordinates'],
            default        => [],
        };

        foreach ($polygons as $polygon) {
            foreach ($polygon as $ring) {
                $pts = [];
                foreach ($ring as $coord) {
                    [$px, $py] = $this->lonlat2pixel((float)$coord[0], (float)$coord[1], $bbox);
                    $pts[] = $px;
                    $pts[] = $py;
                }
                if (count($pts) < 6) continue;
                if ($fill >= 0)  imagefilledpolygon($img, $pts, $fill);
                if ($border >= 0 && $border_width > 0) {
                    imagesetthickness($img, $border_width);
                    imagepolygon($img, $pts, $border);
                }
            }
        }
    }

    private function drawGeoJsonLine(\GdImage $img, array $geojson, array $bbox, int $color): void
    {
        $type  = $geojson['type'] ?? '';
        $lines = match($type) {
            'LineString'      => [$geojson['coordinates']],
            'MultiLineString' => $geojson['coordinates'],
            default           => [],
        };

        foreach ($lines as $line) {
            $prev = null;
            foreach ($line as $coord) {
                [$px, $py] = $this->lonlat2pixel((float)$coord[0], (float)$coord[1], $bbox);
                if ($prev !== null) {
                    imageline($img, $prev[0], $prev[1], $px, $py, $color);
                }
                $prev = [$px, $py];
            }
        }
    }

    // ── 快取 ──────────────────────────────────────────────────────────────

    private function getCachePath(int $z, int $x, int $y): string
    {
        $dir = getenv('TILE_CACHE_DIR') ?: (MINI_ENGINE_ROOT . '/data/tile_cache');
        return "{$dir}/osm/{$z}/{$x}/{$y}.png";
    }

    private function saveTileCache(\GdImage $img, string $path): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        imagepng($img, $path);
    }

    // ── DB 連線 ───────────────────────────────────────────────────────────

    private function getOsmDb(): SQLite3
    {
        if (self::$osmDb === null) {
            $db_path = MINI_ENGINE_ROOT . '/data/osm_taiwan.db';
            $ext     = getenv('SPATIALITE_EXT') ?: 'mod_spatialite.8.dylib';
            self::$osmDb = new SQLite3($db_path, SQLITE3_OPEN_READONLY);
            self::$osmDb->enableExceptions(true);
            self::$osmDb->loadExtension($ext);
            self::$osmDb->busyTimeout(5000);
        }
        return self::$osmDb;
    }
}
