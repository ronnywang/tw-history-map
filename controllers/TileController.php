<?php
/**
 * TileController
 * 路由：/tile/{era}/{z}/{x}/{y}
 *
 * 產生 XYZ 格式 PNG 圖磚，顯示各時代行政區劃與道路
 */
class TileController extends MiniEngine_Controller
{
    const TILE_SIZE = 256;

    // 各時代行政區劃的色彩設定 [border_color, fill_color, border_width]
    const ERA_STYLES = [
        1 => ['#8B0000', [139, 0,   0,   160], 2],   // 州/廳 - 深紅
        2 => ['#CC4400', [204, 68,  0,   120], 1],   // 郡/市 - 橘紅
        3 => ['#DD8800', [221, 136, 0,   80],  1],   // 街庄/町 - 橘黃
    ];

    const ROAD_COLOR = [0, 80, 160, 200];  // 道路顏色 (RGBA)

    public function indexAction()
    {
        $era = $_GET['era'] ?? '';
        $z   = (int)($_GET['z'] ?? 0);
        $x   = (int)($_GET['x'] ?? 0);
        $y   = (int)($_GET['y'] ?? 0);

        if (!$era || $z < 0 || $z > 20) {
            http_response_code(400);
            $this->noview();
            return;
        }

        // 先嘗試讀取快取
        $cache_file = $this->getCachePath($era, $z, $x, $y);
        if (file_exists($cache_file)) {
            header('Content-Type: image/png');
            header('Cache-Control: public, max-age=86400');
            header('X-Cache: HIT');
            readfile($cache_file);
            $this->noview();
            return;
        }

        // 計算 tile 的 WGS84 bounding box
        $bbox = $this->tile2bbox($x, $y, $z);

        // 繪製圖磚
        $img = $this->renderTile($era, $bbox, $z);

        // 存快取
        $this->saveTileCache($img, $cache_file);

        // 輸出
        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=86400');
        header('X-Cache: MISS');
        imagepng($img);
        imagedestroy($img);

        $this->noview();
    }

    /**
     * 將 XYZ tile 座標轉換為 WGS84 bounding box
     * 回傳 [minLon, minLat, maxLon, maxLat]
     */
    private function tile2bbox(int $x, int $y, int $z): array
    {
        $n = 1 << $z;
        $minLon = $x / $n * 360.0 - 180.0;
        $maxLon = ($x + 1) / $n * 360.0 - 180.0;
        $maxLat = rad2deg(atan(sinh(M_PI * (1 - 2 * $y / $n))));
        $minLat = rad2deg(atan(sinh(M_PI * (1 - 2 * ($y + 1) / $n))));
        return [$minLon, $minLat, $maxLon, $maxLat];
    }

    /**
     * 將 WGS84 經緯度轉為圖磚像素座標
     */
    private function lonlat2pixel(float $lon, float $lat, array $bbox): array
    {
        $px = ($lon - $bbox[0]) / ($bbox[2] - $bbox[0]) * self::TILE_SIZE;
        $py = ($bbox[3] - $lat) / ($bbox[3] - $bbox[1]) * self::TILE_SIZE;
        return [(int)round($px), (int)round($py)];
    }

    /**
     * 繪製圖磚主函式
     */
    private function renderTile(string $era, array $bbox, int $z)
    {
        $img = imagecreatetruecolor(self::TILE_SIZE, self::TILE_SIZE);
        imagesavealpha($img, true);
        $transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
        imagefill($img, 0, 0, $transparent);

        // 計算簡化精度（依 zoom level）
        $pixel_size = ($bbox[2] - $bbox[0]) / self::TILE_SIZE;
        $simplify = $pixel_size * 0.5;

        $db = DB::getInstance();

        // 繪製行政區劃（由大到小）
        foreach ([1, 2, 3] as $level) {
            $this->drawAdminDivisions($img, $db, $era, $level, $bbox, $simplify, $z);
        }

        // zoom >= 13 才繪製道路
        if ($z >= 13) {
            $this->drawRoads($img, $db, $era, $bbox, $simplify);
        }

        return $img;
    }

    /**
     * 繪製行政區劃多邊形
     */
    private function drawAdminDivisions($img, SQLite3 $db, string $era, int $level, array $bbox, float $simplify, int $z): void
    {
        if (!isset(self::ERA_STYLES[$level])) return;
        [$border_hex, $fill_rgba, $border_width] = self::ERA_STYLES[$level];

        // 只在適當 zoom 下繪製各層級
        $min_zoom = match($level) {
            1 => 6,
            2 => 9,
            3 => 11,
            default => 6,
        };
        if ($z < $min_zoom) return;

        $mbr = sprintf(
            'BuildMBR(%f, %f, %f, %f, 4326)',
            $bbox[0], $bbox[1], $bbox[2], $bbox[3]
        );

        $sql = "
            SELECT id, name,
                   ST_AsGeoJSON(ST_Simplify(geom, {$simplify})) AS geojson
            FROM admin_divisions
            WHERE era_id = '{$era}'
              AND level = {$level}
              AND geom && {$mbr}
            LIMIT 500
        ";

        $result = $db->query($sql);
        if (!$result) return;

        $border_color = $this->hex2gdcolor($img, $border_hex);
        $fill_color   = imagecolorallocatealpha($img, $fill_rgba[0], $fill_rgba[1], $fill_rgba[2], 127 - (int)($fill_rgba[3] / 2));

        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            if (!$row['geojson']) continue;
            $geojson = json_decode($row['geojson'], true);
            if (!$geojson) continue;

            $this->drawGeoJsonPolygon($img, $geojson, $bbox, $fill_color, $border_color, $border_width);
        }
    }

    /**
     * 繪製道路線段
     */
    private function drawRoads($img, SQLite3 $db, string $era, array $bbox, float $simplify): void
    {
        $mbr = sprintf(
            'BuildMBR(%f, %f, %f, %f, 4326)',
            $bbox[0], $bbox[1], $bbox[2], $bbox[3]
        );

        $sql = "
            SELECT id, name,
                   ST_AsGeoJSON(ST_Simplify(geom, {$simplify})) AS geojson
            FROM roads
            WHERE era_id = '{$era}'
              AND geom && {$mbr}
            LIMIT 1000
        ";

        $result = $db->query($sql);
        if (!$result) return;

        $road_color = imagecolorallocatealpha($img, self::ROAD_COLOR[0], self::ROAD_COLOR[1], self::ROAD_COLOR[2], 127 - (int)(self::ROAD_COLOR[3] / 2));

        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            if (!$row['geojson']) continue;
            $geojson = json_decode($row['geojson'], true);
            if (!$geojson) continue;

            $this->drawGeoJsonLine($img, $geojson, $bbox, $road_color);
        }
    }

    /**
     * 繪製 GeoJSON 多邊形（支援 Polygon 和 MultiPolygon）
     */
    private function drawGeoJsonPolygon($img, array $geojson, array $bbox, int $fill, int $border, int $border_width): void
    {
        $type  = $geojson['type'] ?? '';
        $rings = [];

        if ($type === 'Polygon') {
            $rings = [$geojson['coordinates']];
        } elseif ($type === 'MultiPolygon') {
            $rings = $geojson['coordinates'];
        } else {
            return;
        }

        foreach ($rings as $polygon) {
            foreach ($polygon as $ring) {
                $points = [];
                foreach ($ring as $coord) {
                    [$px, $py] = $this->lonlat2pixel($coord[0], $coord[1], $bbox);
                    $points[] = $px;
                    $points[] = $py;
                }
                if (count($points) >= 6) {
                    imagefilledpolygon($img, $points, $fill);
                    imagepolygon($img, $points, $border);
                }
            }
        }
    }

    /**
     * 繪製 GeoJSON 線段（支援 LineString 和 MultiLineString）
     */
    private function drawGeoJsonLine($img, array $geojson, array $bbox, int $color): void
    {
        $type  = $geojson['type'] ?? '';
        $lines = [];

        if ($type === 'LineString') {
            $lines = [$geojson['coordinates']];
        } elseif ($type === 'MultiLineString') {
            $lines = $geojson['coordinates'];
        } else {
            return;
        }

        foreach ($lines as $line) {
            $prev = null;
            foreach ($line as $coord) {
                [$px, $py] = $this->lonlat2pixel($coord[0], $coord[1], $bbox);
                if ($prev !== null) {
                    imageline($img, $prev[0], $prev[1], $px, $py, $color);
                }
                $prev = [$px, $py];
            }
        }
    }

    /**
     * hex 色碼轉 GD 顏色
     */
    private function hex2gdcolor($img, string $hex): int
    {
        $hex = ltrim($hex, '#');
        return imagecolorallocate(
            $img,
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2))
        );
    }

    /**
     * 取得快取檔案路徑
     */
    private function getCachePath(string $era, int $z, int $x, int $y): string
    {
        $cache_dir = getenv('TILE_CACHE_DIR') ?: (MINI_ENGINE_ROOT . '/data/tile_cache');
        return "{$cache_dir}/{$era}/{$z}/{$x}/{$y}.png";
    }

    /**
     * 儲存圖磚到快取
     */
    private function saveTileCache($img, string $cache_file): void
    {
        $dir = dirname($cache_file);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        imagepng($img, $cache_file);
    }
}
