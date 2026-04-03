<?php
/**
 * 資料庫初始化腳本
 * 建立 SpatiaLite 資料庫 schema
 * 使用方式：php scripts/init_db.php
 */

if (!defined('MINI_ENGINE_LIBRARY')) {
    define('MINI_ENGINE_LIBRARY', true);
}
if (!defined('MINI_ENGINE_ROOT')) {
    define('MINI_ENGINE_ROOT', __DIR__ . '/..');
}
require_once(__DIR__ . '/../init.inc.php');

$db_path = getenv('DB_PATH');
$spatialite_path = getenv('SPATIALITE_PATH');

echo "初始化資料庫：{$db_path}\n";

if (file_exists($db_path)) {
    echo "資料庫已存在，略過建立。如需重建請先刪除 {$db_path}\n";
    exit(0);
}

$db = new SQLite3($db_path);
$db->loadExtension('mod_spatialite.8.dylib');

// 初始化 SpatiaLite metadata
$db->exec("SELECT InitSpatialMetaData(1)");

echo "SpatiaLite metadata 初始化完成\n";

// 建立時代定義表
$db->exec("
CREATE TABLE eras (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    start_year INTEGER,
    end_year INTEGER,
    description TEXT,
    sort_order INTEGER DEFAULT 0
)");

// 插入預設時代
$eras = [
    ['jp_1895', '日治初期（1895-1920）', 'Japanese Rule Early', 1895, 1920, '台灣總督府設廳制，三縣一廳', 1],
    ['jp_1920', '日治州廳制（1920-1945）', 'Japanese Rule Provincial', 1920, 1945, '州郡街庄制，五州三廳', 2],
    ['roc_1945', '光復初期（1945-1950）', 'ROC Early', 1945, 1950, '接收日治行政區', 3],
    ['roc_1950', '省縣市制（1950-1990s）', 'ROC County System', 1950, 1998, '調整縣市行政區', 4],
    ['pre_2010', '六都升格前（1998-2010）', 'Pre-Six-Municipalities', 1998, 2010, '升格前行政區劃', 5],
    ['current', '現代（2010-）', 'Current', 2010, null, '六都制行政區', 6],
];

$stmt = $db->prepare("INSERT INTO eras (id, name, name_en, start_year, end_year, description, sort_order) VALUES (?,?,?,?,?,?,?)");
foreach ($eras as $era) {
    $stmt->bindValue(1, $era[0]);
    $stmt->bindValue(2, $era[1]);
    $stmt->bindValue(3, $era[2]);
    $stmt->bindValue(4, $era[3]);
    $stmt->bindValue(5, $era[4]);
    $stmt->bindValue(6, $era[5]);
    $stmt->bindValue(7, $era[6]);
    $stmt->execute();
}
echo "時代定義插入完成\n";

// 建立行政區劃表（含空間欄位）
$db->exec("
CREATE TABLE admin_divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    era_id TEXT NOT NULL REFERENCES eras(id),
    level INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_kana TEXT,
    name_en TEXT,
    parent_id INTEGER,
    properties TEXT
)");

$db->exec("SELECT AddGeometryColumn('admin_divisions', 'geom', 4326, 'MULTIPOLYGON', 'XY')");
$db->exec("SELECT CreateSpatialIndex('admin_divisions', 'geom')");
$db->exec("CREATE INDEX idx_admin_era ON admin_divisions(era_id)");
$db->exec("CREATE INDEX idx_admin_level ON admin_divisions(era_id, level)");
echo "admin_divisions 表建立完成\n";

// 建立道路表
$db->exec("
CREATE TABLE roads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    era_id TEXT NOT NULL REFERENCES eras(id),
    name TEXT NOT NULL,
    name_modern TEXT,
    road_type TEXT,
    properties TEXT
)");

$db->exec("SELECT AddGeometryColumn('roads', 'geom', 4326, 'MULTILINESTRING', 'XY')");
$db->exec("SELECT CreateSpatialIndex('roads', 'geom')");
$db->exec("CREATE INDEX idx_road_era ON roads(era_id)");
echo "roads 表建立完成\n";

// 建立地點（POI）表
$db->exec("
CREATE TABLE places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    era_id TEXT NOT NULL REFERENCES eras(id),
    name TEXT NOT NULL,
    name_kana TEXT,
    place_type TEXT,
    properties TEXT
)");

$db->exec("SELECT AddGeometryColumn('places', 'geom', 4326, 'POINT', 'XY')");
$db->exec("SELECT CreateSpatialIndex('places', 'geom')");
$db->exec("CREATE INDEX idx_place_era ON places(era_id)");
echo "places 表建立完成\n";

$db->close();
echo "\n資料庫初始化完成：{$db_path}\n";
