<?php
/**
 * ApiController
 * 提供 JSON API 端點
 *
 * GET /api/eras         → 時代列表
 * GET /api/layers       → 各時代可用圖層
 * GET /api/search       → 搜尋地名（?q=&era=）
 * GET /api/address      → 地址時代轉換（?q=&from_era=&to_era=）
 */
class ApiController extends MiniEngine_Controller
{
    public function init()
    {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
    }

    /**
     * GET /api/eras
     * 回傳所有時代定義
     */
    public function erasAction()
    {
        $rows = DB::query("SELECT id, name, name_en, start_year, end_year, description FROM eras ORDER BY sort_order");
        echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
        $this->noview();
    }

    /**
     * GET /api/layers
     * 回傳各時代的可用圖層與中研院 WMTS 對應
     */
    public function layersAction()
    {
        $layers = [
            'jp_1895' => [
                'admin' => true,
                'roads' => false,
                'sinica_wmts' => null,
            ],
            'jp_1920' => [
                'admin' => true,
                'roads' => true,
                'sinica_wmts' => [
                    ['id' => 'JM20K_1904', 'name' => '明治堡圖 (1904)', 'opacity' => 0.8],
                    ['id' => 'JM50K_1920', 'name' => '日治地形圖 (1920)', 'opacity' => 0.8],
                ],
            ],
            'roc_1945' => [
                'admin' => true,
                'roads' => true,
                'sinica_wmts' => null,
            ],
            'roc_1950' => [
                'admin' => true,
                'roads' => true,
                'sinica_wmts' => null,
            ],
            'pre_2010' => [
                'admin' => true,
                'roads' => true,
                'sinica_wmts' => null,
            ],
            'current' => [
                'admin' => true,
                'roads' => false,
                'sinica_wmts' => null,
            ],
        ];

        echo json_encode(['success' => true, 'data' => $layers], JSON_UNESCAPED_UNICODE);
        $this->noview();
    }

    /**
     * GET /api/search?q={keyword}&era={era_id}
     * 搜尋地名
     */
    public function searchAction()
    {
        $q   = trim($_GET['q'] ?? '');
        $era = trim($_GET['era'] ?? '');

        if (strlen($q) < 1) {
            echo json_encode(['success' => false, 'error' => 'query required'], JSON_UNESCAPED_UNICODE);
            $this->noview();
            return;
        }

        $era_cond = $era ? "AND era_id = ?" : "";
        $params   = $era ? [$q . '%', $era] : [$q . '%'];

        $rows = DB::query("
            SELECT id, era_id, level, name, name_kana,
                   ST_X(ST_Centroid(geom)) AS lon,
                   ST_Y(ST_Centroid(geom)) AS lat
            FROM admin_divisions
            WHERE name LIKE ? {$era_cond}
            ORDER BY era_id, level
            LIMIT 20
        ", $params);

        echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
        $this->noview();
    }

    /**
     * GET /api/info?lon={lon}&lat={lat}&era={era_id}
     * 查詢某座標在特定時代的行政區資訊
     */
    public function infoAction()
    {
        $lon = (float)($_GET['lon'] ?? 0);
        $lat = (float)($_GET['lat'] ?? 0);
        $era = trim($_GET['era'] ?? 'jp_1920');

        if (!$lon || !$lat) {
            echo json_encode(['success' => false, 'error' => 'lon/lat required'], JSON_UNESCAPED_UNICODE);
            $this->noview();
            return;
        }

        $rows = DB::query("
            SELECT id, era_id, level, name, name_kana, name_en
            FROM admin_divisions
            WHERE era_id = ?
              AND Within(MakePoint(?, ?, 4326), geom)
            ORDER BY level DESC
        ", [$era, $lon, $lat]);

        echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
        $this->noview();
    }
}
