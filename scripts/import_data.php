<?php
/**
 * 歷史地理資料匯入腳本
 *
 * 用法：
 *   php scripts/import_data.php --type=admin_divisions --era=jp_1920 --file=data/input/jp1920_admin.geojson
 *   php scripts/import_data.php --type=roads --era=jp_1920 --file=data/input/jp1920_roads.geojson
 *   php scripts/import_data.php --type=admin_divisions --era=jp_1920 --file=data/input/jp1920.shp
 *
 * 支援格式：
 *   - GeoJSON (.geojson, .json)
 *   - Shapefile (.shp)：需先用 ogr2ogr 轉 GeoJSON，或本機有 ogr2ogr 可自動轉換
 *
 * GeoJSON properties 欄位對應（行政區劃）：
 *   name      → 地名（必填）
 *   name_kana → 日文假名（選填）
 *   name_en   → 英文名（選填）
 *   level     → 行政層級 1=州/廳, 2=郡/市, 3=街庄/町（必填）
 *
 * GeoJSON properties 欄位對應（道路）：
 *   name        → 歷史路名（必填）
 *   name_modern → 現代路名（選填）
 *   road_type   → 道路類型（選填）
 */

if (!defined('MINI_ENGINE_LIBRARY')) {
    define('MINI_ENGINE_LIBRARY', true);
}
if (!defined('MINI_ENGINE_ROOT')) {
    define('MINI_ENGINE_ROOT', __DIR__ . '/..');
}
require_once(__DIR__ . '/../init.inc.php');

// ── 解析命令列參數 ──
$opts = getopt('', ['type:', 'era:', 'file:', 'level:', 'dry-run', 'clear']);
$type    = $opts['type']  ?? null;
$era     = $opts['era']   ?? null;
$file    = $opts['file']  ?? null;
$level   = isset($opts['level']) ? (int)$opts['level'] : null;
$dry_run = isset($opts['dry-run']);
$clear   = isset($opts['clear']);

if (!$type || !$era || !$file) {
    die("用法：php scripts/import_data.php --type=admin_divisions|roads --era=ERA_ID --file=PATH [--level=1] [--dry-run] [--clear]\n");
}

if (!in_array($type, ['admin_divisions', 'roads', 'places'])) {
    die("type 必須是 admin_divisions, roads 或 places\n");
}

if (!file_exists($file)) {
    die("找不到檔案：{$file}\n");
}

$db = DB::getInstance();

// 確認時代存在
$era_row = DB::queryOne("SELECT id FROM eras WHERE id = ?", [$era]);
if (!$era_row) {
    die("找不到時代：{$era}，請先執行 init_db.php\n");
}

// 如果是 Shapefile，用 ogr2ogr 轉 GeoJSON
$geojson_file = $file;
if (strtolower(pathinfo($file, PATHINFO_EXTENSION)) === 'shp') {
    $geojson_file = tempnam(sys_get_temp_dir(), 'tw_import_') . '.geojson';
    $ogr2ogr = findOgr2ogr();
    if (!$ogr2ogr) {
        die("匯入 Shapefile 需要 ogr2ogr（GDAL）。請安裝：brew install gdal\n");
    }
    echo "轉換 Shapefile → GeoJSON...\n";
    exec("{$ogr2ogr} -f GeoJSON -t_srs EPSG:4326 " . escapeshellarg($geojson_file) . ' ' . escapeshellarg($file) . ' 2>&1', $out, $ret);
    if ($ret !== 0) {
        die("ogr2ogr 轉換失敗：" . implode("\n", $out) . "\n");
    }
}

// 讀取 GeoJSON
$content = file_get_contents($geojson_file);
$geojson = json_decode($content, true);
if (!$geojson || !isset($geojson['features'])) {
    die("無效的 GeoJSON 格式\n");
}

$features = $geojson['features'];
echo "共 " . count($features) . " 個 feature\n";

if ($clear && !$dry_run) {
    DB::exec("DELETE FROM {$type} WHERE era_id = ?", [$era]);
    echo "已清除 {$era} 的 {$type} 資料\n";
}

// ── 開始匯入 ──
$count   = 0;
$skipped = 0;

$db->getInstance()->exec('BEGIN TRANSACTION');

foreach ($features as $i => $feature) {
    if (!isset($feature['geometry']) || !isset($feature['properties'])) {
        $skipped++;
        continue;
    }

    $props    = $feature['properties'];
    $geometry = $feature['geometry'];

    // 轉換 geometry 為 WKT（透過 SpatiaLite）
    $geojson_str = json_encode($geometry);
    $wkt_result  = DB::queryOne("SELECT ST_AsText(ST_GeomFromGeoJSON(?)) AS wkt", [$geojson_str]);
    if (!$wkt_result || !$wkt_result['wkt']) {
        echo "警告：第 {$i} 個 feature geometry 無效，跳過\n";
        $skipped++;
        continue;
    }
    $wkt = $wkt_result['wkt'];

    if ($type === 'admin_divisions') {
        $name   = $props['name'] ?? $props['NAME'] ?? $props['n_nm'] ?? '';
        $kana   = $props['name_kana'] ?? $props['kana'] ?? null;
        $name_en = $props['name_en'] ?? null;
        $lv     = $level ?? ($props['level'] ?? $props['LEVEL'] ?? 3);

        if (!$name) {
            $skipped++;
            continue;
        }

        if (!$dry_run) {
            DB::exec("
                INSERT INTO admin_divisions (era_id, level, name, name_kana, name_en, geom)
                VALUES (?, ?, ?, ?, ?, GeomFromText(?, 4326))
            ", [$era, (int)$lv, $name, $kana, $name_en, $wkt]);
        }
        echo "  [{$i}] {$name} (level {$lv})\n";

    } elseif ($type === 'roads') {
        $name        = $props['name'] ?? $props['NAME'] ?? $props['road_name'] ?? '';
        $name_modern = $props['name_modern'] ?? $props['modern_name'] ?? null;
        $road_type   = $props['road_type'] ?? $props['type'] ?? null;

        if (!$name) {
            $skipped++;
            continue;
        }

        if (!$dry_run) {
            DB::exec("
                INSERT INTO roads (era_id, name, name_modern, road_type, geom)
                VALUES (?, ?, ?, ?, GeomFromText(?, 4326))
            ", [$era, $name, $name_modern, $road_type, $wkt]);
        }
        echo "  [{$i}] {$name}\n";

    } elseif ($type === 'places') {
        $name       = $props['name'] ?? $props['NAME'] ?? '';
        $kana       = $props['name_kana'] ?? null;
        $place_type = $props['place_type'] ?? $props['type'] ?? null;

        if (!$name) {
            $skipped++;
            continue;
        }

        if (!$dry_run) {
            DB::exec("
                INSERT INTO places (era_id, name, name_kana, place_type, geom)
                VALUES (?, ?, ?, ?, GeomFromText(?, 4326))
            ", [$era, $name, $kana, $place_type, $wkt]);
        }
        echo "  [{$i}] {$name}\n";
    }

    $count++;
}

if (!$dry_run) {
    $db->getInstance()->exec('COMMIT');
} else {
    $db->getInstance()->exec('ROLLBACK');
    echo "\n[Dry Run] 未實際寫入資料庫\n";
}

echo "\n完成！匯入 {$count} 筆，略過 {$skipped} 筆\n";

// 清除 tile 快取（因為資料更新了）
if (!$dry_run) {
    $cache_dir = getenv('TILE_CACHE_DIR') ?: (MINI_ENGINE_ROOT . '/data/tile_cache');
    $era_cache = "{$cache_dir}/{$era}";
    if (is_dir($era_cache)) {
        exec('rm -rf ' . escapeshellarg($era_cache));
        echo "已清除 {$era} 的 tile 快取\n";
    }
}

// 清理暫時檔案
if (isset($geojson_file) && $geojson_file !== $file && file_exists($geojson_file)) {
    unlink($geojson_file);
}

function findOgr2ogr(): ?string
{
    foreach (['/opt/homebrew/bin/ogr2ogr', '/usr/local/bin/ogr2ogr', 'ogr2ogr'] as $path) {
        if (is_executable($path) || (trim(shell_exec("which {$path} 2>/dev/null")) !== '')) {
            return $path;
        }
    }
    return null;
}
