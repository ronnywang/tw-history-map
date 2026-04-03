<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($this->app_name) ?></title>

    <!-- Leaflet.js -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

    <link rel="stylesheet" href="/static/css/style.css" />
</head>
<body>

<div id="app">
    <!-- 頂部工具列 -->
    <div id="toolbar">
        <div id="toolbar-left">
            <span id="app-title"><?= htmlspecialchars($this->app_name) ?></span>
        </div>
        <div id="toolbar-right">
            <!-- 時代選擇器 -->
            <div class="control-group">
                <label for="era-select">歷史時代：</label>
                <select id="era-select">
                    <?php foreach ($this->eras as $era): ?>
                    <option value="<?= htmlspecialchars($era['id']) ?>"
                        <?= $era['id'] === 'jp_1920' ? 'selected' : '' ?>>
                        <?= htmlspecialchars($era['name']) ?>
                        <?php if ($era['start_year']): ?>
                        (<?= $era['start_year'] ?><?= $era['end_year'] ? '-' . $era['end_year'] : '–' ?>)
                        <?php endif; ?>
                    </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <!-- 底圖選擇器（右側） -->
            <div class="control-group">
                <label for="basemap-select">底圖：</label>
                <select id="basemap-select">
                    <option value="none">無底圖</option>
                    <option value="JM20K_1904">明治堡圖 (1904)</option>
                    <option value="JM50K_1920" selected>日治地形圖 (1920)</option>
                    <option value="TM25K_1921">台灣地形圖 (1921)</option>
                    <option value="TM50K_1924">台灣地形圖 (1924)</option>
                    <option value="TW50K_1955">五萬分一地形圖 (1955)</option>
                    <option value="TM25K_1975">地形圖 (1975)</option>
                    <option value="TM25K_2000">地形圖 (2000)</option>
                </select>
            </div>

            <!-- 疊加層控制 -->
            <div class="control-group">
                <label>
                    <input type="checkbox" id="toggle-admin" checked>
                    行政區劃
                </label>
                <label>
                    <input type="checkbox" id="toggle-roads">
                    道路名稱
                </label>
            </div>

            <!-- 搜尋框 -->
            <div class="control-group">
                <input type="text" id="search-input" placeholder="搜尋地名…">
                <button id="search-btn">搜尋</button>
            </div>
        </div>
    </div>

    <!-- 主地圖區域 -->
    <div id="map-container">
        <div id="map-left">
            <div class="map-label">現代地圖</div>
        </div>
        <div id="divider"></div>
        <div id="map-right">
            <div class="map-label" id="map-right-label">歷史地圖</div>
        </div>
    </div>

    <!-- 座標資訊列 -->
    <div id="statusbar">
        <span id="coords">移動滑鼠查看座標</span>
        <span id="current-era-info"></span>
    </div>

    <!-- 搜尋結果 -->
    <div id="search-results" class="hidden"></div>

    <!-- 點擊資訊 panel -->
    <div id="info-panel" class="hidden">
        <div id="info-panel-header">
            <span id="info-panel-title">行政區資訊</span>
            <button id="info-panel-close">✕</button>
        </div>
        <div id="info-panel-body"></div>
    </div>
</div>

<script>
window.ERAS = <?= json_encode($this->eras, JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="/static/js/app.js"></script>
</body>
</html>
