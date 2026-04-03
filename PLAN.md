# 台灣歷史地圖（tw-history-map）開發計畫

## 專案目標

建立一個台灣 4D 地圖服務（多加上時間軸的地圖），讓使用者可以比較現代地圖與各歷史時代的行政區劃和路名。

- 左側永遠顯示現代 OSM 地圖
- 右側可選擇時代（日治、民國初年、六都升格前等），顯示對應的歷史地圖與行政區劃
- 左右地圖 zoom / pan 連動
- 底圖整合中研院百年歷史地圖 WMTS 服務

---

## 系統架構

```
前端 (Leaflet.js)
 ├── 左半：OpenStreetMap（現代）
 └── 右半：歷史地圖（可選時代）
      ├── 底圖：中研院百年地圖（直連，Access-Control-Allow-Origin: *）
      └── 疊加層：自有 PHP tile server（行政區劃 / 路名）

後端 (PHP + mini-engine)
 ├── /tile/{era}/{z}/{x}/{y}  → TileController（繪製 PNG 圖磚）
 ├── /api/eras                → ApiController（時代列表）
 ├── /api/layers              → ApiController（各時代可用圖層）
 ├── /api/search              → ApiController（地名搜尋）
 ├── /api/info                → ApiController（座標查詢行政區）
 └── /                        → IndexController（主頁）

資料庫 (SpatiaLite)
 ├── eras（時代定義）
 ├── admin_divisions（各時代行政區劃多邊形）
 ├── roads（各時代路名線段）
 └── places（各時代地點 POI）
```

---

## 目錄結構

```
tw-history-map/
├── controllers/
│   ├── IndexController.php     # 主頁
│   ├── TileController.php      # PNG 圖磚生成（PHP GD）
│   ├── ApiController.php       # JSON API
│   └── ErrorController.php     # 錯誤處理
├── views/
│   └── index/index.php         # 前端主頁面（含 Leaflet）
├── models/
│   └── DB.php                  # SpatiaLite 連線管理
├── libraries/
│   └── MiniEngineHelper.php
├── static/
│   ├── js/app.js               # Leaflet 前端邏輯
│   └── css/style.css
├── scripts/
│   ├── init_db.php             # 資料庫初始化
│   └── import_data.php         # 資料匯入（GeoJSON/Shapefile）
├── data/
│   ├── taiwan.db               # SpatiaLite 資料庫（不進 repo）
│   └── tile_cache/             # 圖磚快取（不進 repo）
├── mini-engine.php             # PHP 框架本體
├── index.php                   # 路由入口
├── init.inc.php                # 框架初始化
├── config.inc.php              # 環境設定（不進 repo）
└── config.sample.inc.php       # 設定範本
```

---

## 時代定義

| ID | 名稱 | 年代 | 說明 |
|----|------|------|------|
| `jp_1895` | 日治初期 | 1895–1920 | 台灣總督府廳制，三縣一廳 |
| `jp_1920` | 日治州廳制 | 1920–1945 | 州郡街庄制，五州三廳 |
| `roc_1945` | 光復初期 | 1945–1950 | 接收日治行政區 |
| `roc_1950` | 省縣市制 | 1950–1998 | 調整縣市行政區 |
| `pre_2010` | 六都升格前 | 1998–2010 | 升格前行政區劃 |
| `current` | 現代 | 2010– | 六都制行政區 |

---

## 中研院百年地圖可用圖層

Tile URL 格式：
```
https://gis.sinica.edu.tw/tileserver/file-exists.php?img={LAYER}-png-{z}-{x}-{y}
```

| 圖層 ID | 說明 |
|---------|------|
| `JM20K_1904` | 明治堡圖 1:20000（1904） |
| `JM50K_1920` | 日治地形圖 1:50000（1920） |
| `JM50K_1924` | 日治地形圖 1:50000（1924） |
| `TM25K_1921` | 台灣地形圖 1:25000（1921） |
| `TW50K_1955` | 五萬分一地形圖（1955） |
| `TM25K_1975` | 地形圖 1:25000（1975） |
| `TM25K_2000` | 地形圖 1:25000（2000） |

---

## 開發環境設定

### 需求
- PHP 8.x（含 `sqlite3`、`gd` extension）
- SpatiaLite：`brew install spatialite-tools libspatialite`
- php.ini 設定：`sqlite3.extension_dir = /opt/homebrew/Cellar/libspatialite/5.1.0_4/lib`

### 啟動
```bash
# 初始化資料庫（第一次）
php scripts/init_db.php

# 啟動開發伺服器
php -S localhost:8080 index.php
```

### 資料匯入
```bash
# 匯入行政區劃 GeoJSON
php scripts/import_data.php --type=admin_divisions --era=jp_1920 --file=data/input/jp1920_admin.geojson

# 匯入道路 GeoJSON
php scripts/import_data.php --type=roads --era=jp_1920 --file=data/input/jp1920_roads.geojson

# Shapefile（需要 ogr2ogr / GDAL）
php scripts/import_data.php --type=admin_divisions --era=jp_1920 --file=data/input/jp1920.shp
```

GeoJSON properties 欄位對應：

**admin_divisions**

| properties 欄位 | 說明 |
|-----------------|------|
| `name` | 地名（必填） |
| `level` | 行政層級：1=州/廳、2=郡/市、3=街庄/町 |
| `name_kana` | 日文假名（選填） |
| `name_en` | 英文名（選填） |

**roads**

| properties 欄位 | 說明 |
|-----------------|------|
| `name` | 歷史路名（必填） |
| `name_modern` | 現代對應路名（選填） |
| `road_type` | 道路類型（選填） |

---

## 完成進度

### ✅ 已完成

- [x] mini-engine 框架初始化、路由設定
- [x] SpatiaLite DB schema（eras / admin_divisions / roads / places）
- [x] 6 個預設時代資料插入
- [x] TileController：XYZ → SpatiaLite 空間查詢 → PHP GD 繪製 PNG 圖磚（含快取）
- [x] ApiController：`/api/eras`、`/api/layers`、`/api/search`、`/api/info`
- [x] 前端 Leaflet.js 左右雙地圖 + 連動 pan/zoom
- [x] 中研院百年歷史地圖底圖整合（直連，無需 proxy）
- [x] 時代選擇器 / 底圖選擇器 / 行政區劃開關
- [x] 分隔線拖曳調整寬度
- [x] 右側地圖點擊查詢行政區資訊
- [x] 地名搜尋
- [x] 資料匯入腳本（GeoJSON / Shapefile → SpatiaLite）

### 🔲 待完成

#### 資料面
- [ ] 匯入日治州廳制（1920）行政區劃多邊形
- [ ] 匯入日治時代道路資料
- [ ] 匯入其他時代行政區劃
- [ ] 地址時代轉換資料（現代地址 ↔ 日治地址）

#### 功能面
- [ ] `/api/address` 地址時代轉換 API
- [ ] 路名標示（zoom >= 14 時在地圖上顯示道路名稱）
- [ ] 地址轉換介面（輸入現代地址，顯示日治時代對應地址）
- [ ] URL 分享（將時代、視角編碼進 URL hash）
- [ ] 行動裝置響應式版面

#### 部署面
- [ ] 正式伺服器部署設定（Apache / Nginx）
- [ ] 圖磚快取策略（依資料更新頻率設定 TTL）
