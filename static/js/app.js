'use strict';

// ── 中研院 tile URL（Access-Control-Allow-Origin: *，可直接從瀏覽器存取）
// {x}=TILECOL, {y}=TILEROW

// jpg 格式的圖層
const SINICA_JPG_LAYERS = new Set([
    // 全臺 tileserver
    'JM20K_1904', 'JM20K_1921', 'JM50K_1924',
    'TM25K_1989', 'TM25K_1993', 'TM25K_2001', 'TM25K_2003',
    // 臺北
    'Taipei_10K_1962', 'Taipei_10K_1966',
    // 台南
    'Tainan_1936',
]);

// 各圖層對應的 tileserver 子域（不在此 map 中的使用預設 'tileserver'）
const LAYER_REGION = {
    // ── 臺北 ──
    'TPE_06_F': 'taipei', 'TPE_06_I': 'taipei', 'TPE_06_J': 'taipei', 'TPE_06_L': 'taipei',
    'TaipeiTamsui_1947': 'taipei', 'TPE_all': 'taipei',
    'Taipei_1888': 'taipei', 'Taipei_1895': 'taipei', 'Taipei_1895b': 'taipei',
    'Taipei_1897': 'taipei', 'Taipei_1903': 'taipei', 'Taipei_1905': 'taipei',
    'Taipei_1907': 'taipei', 'Taipei_1910': 'taipei', 'Taipei_1911': 'taipei',
    'Taipei_1914': 'taipei', 'Taipei_1916': 'taipei',
    'Taipei_13K_1927': 'taipei', 'Taipei_10K_1939': 'taipei',
    'Taipei_10K_1919': 'taipei', 'Taipei_15K_1947': 'taipei',
    'Taipei_12K_1956': 'taipei', 'Taipei_10K_1962': 'taipei',
    'Taipei_10K_1966': 'taipei', 'Taipei_12K_1967': 'taipei',
    'Taipei_10K_1977': 'taipei',
    // ── 基隆 ──
    'Keelung_31.7K_1854': 'keelung', 'Keelung_14.6K_1899': 'keelung',
    'Keelung_20K_1904': 'keelung', 'Keelung_12K_1924': 'keelung',
    'Keelung_10K_1929': 'keelung', 'Keelung_10K_1937': 'keelung',
    'Keelung_10K_1964': 'keelung',
    // ── 新竹 ──
    'Hsinchu_3K_1905': 'hsinchu', 'Hsinchu_6K_1917': 'hsinchu',
    'Hsinchu_6K_1936': 'hsinchu', 'Hsinchu_10K_1940s': 'hsinchu',
    'Hsinchu_10K_1976': 'hsinchu',
    // ── 桃園 ──
    'Taoyuan_daxi_2.5K_1913': 'taoyuan', 'Taoyuan_6K_1938': 'taoyuan',
    'Taoyuan_5K_1979': 'taoyuan',
    // ── 台中 ──
    'Taichung_1910': 'taichung', 'Taichung_1926': 'taichung',
    'Taichung_1935b': 'taichung', 'Taichung_1937': 'taichung',
    'Taichung_10K_1948': 'taichung', 'Taichung_10K_1956': 'taichung',
    'Taichung_10K_1967B': 'taichung', 'Taichung_15K_1976': 'taichung',
    // ── 嘉義 ──
    'chiayi_1895': 'chiayi', 'Chiayi_3K_1913': 'chiayi',
    'Chiayi_6K_1933': 'chiayi', 'chiayi_12K_1940': 'chiayi',
    'Chiayi_10K_1976': 'chiayi',
    // ── 高雄 ──
    'Kaohsiung_1893': 'kaohsiung', 'Kaohsiung_1929': 'kaohsiung',
    'Kaohsiung_1935': 'kaohsiung',
    'Kaohsiung_6K_1922': 'kaohsiung', 'Kaohsiung_10K_1926': 'kaohsiung',
    'Kaohsiung_10K_1936': 'kaohsiung', 'Kaohsiung_10K_1946': 'kaohsiung',
    'Kaohsiung_10K_1965': 'kaohsiung', 'Kaohsiung_10K_1980': 'kaohsiung',
    // ── 台南 ──
    'Tainan_1875': 'tainan', 'Tainan_20K_1917': 'tainan',
    'Tainan_1935': 'tainan', 'Tainan_1936': 'tainan',
    'Tainan_1943': 'tainan', 'Tainan_1966': 'tainan',
    'Tainan_1996': 'tainan',
    // ── 屏東 ──
    'Pingtung_6K_1912': 'pingtung', 'Pingtung_6K_1930': 'pingtung',
    'Pingtung_10K_1939': 'pingtung', 'Pingtung_10K_1976': 'pingtung',
};

// 各圖層的 maxNativeZoom（超過後 Leaflet 自動放大最細 tile）
const SINICA_MAX_NATIVE_ZOOM = {
    // ── 全臺 日治地形圖 ──
    'JM20K_1904':        18,
    'JM100K_1905':       17,
    'JM20K_1921':        18,
    'JM25K_1921':        18,
    'JM50K_1920':        18,
    'JM50K_1924':        18,
    'JMGeo_1930s':       15,
    // ── 全臺 美軍地圖 ──
    'AM25K_1944A':       15,
    'AM25K_1944B':       15,
    'AM50K_1944':        18,
    'AMS250K_1944':      16,
    'AMCityPlan_1945':   18,
    // ── 全臺 戰後地形圖 ──
    'TM25K_1950':        17,
    'TM50K_1954':        15,
    'TM25K_1955':        15,
    'TM25K_1966':        15,
    'TM50K_1966':        15,
    'Taiwan_Corona_1966': 15,
    'Taiwan_Corona_1969': 16,
    'TM25K_1989':        17,
    'TM50K_1990':        18,
    'TM25K_1993':        17,
    'TM50K_1996':        18,
    'TM25K_2001':        18,
    'TM25K_2003':        17,
    'TM50K_2003':        18,
    // ── 臺北地籍 ──
    'TPE_06_F':          14,
    'TPE_06_I':          14,
    'TPE_06_J':          14,
    'TPE_06_L':          19,
    'TaipeiTamsui_1947': 18,
    'TPE_all':           18,
    // ── 臺北都市地圖 ──
    'Taipei_1888': 18, 'Taipei_1895': 18, 'Taipei_1895b': 18,
    'Taipei_1897': 18, 'Taipei_1903': 18, 'Taipei_1905': 18,
    'Taipei_1907': 18, 'Taipei_1910': 18, 'Taipei_1911': 18,
    'Taipei_1914': 18, 'Taipei_1916': 18,
    'Taipei_13K_1927': 18, 'Taipei_10K_1939': 18,
    'Taipei_10K_1919': 18, 'Taipei_15K_1947': 18,
    'Taipei_12K_1956': 18, 'Taipei_10K_1962': 18,
    'Taipei_10K_1966': 18, 'Taipei_12K_1967': 18,
    'Taipei_10K_1977': 18,
    // ── 基隆 ──
    'Keelung_31.7K_1854': 18, 'Keelung_14.6K_1899': 18,
    'Keelung_20K_1904': 18,   'Keelung_12K_1924': 18,
    'Keelung_10K_1929': 18,   'Keelung_10K_1937': 18,
    'Keelung_10K_1964': 18,
    // ── 新竹 ──
    'Hsinchu_3K_1905': 18, 'Hsinchu_6K_1917': 18,
    'Hsinchu_6K_1936': 18, 'Hsinchu_10K_1940s': 18,
    'Hsinchu_10K_1976': 18,
    // ── 桃園 ──
    'Taoyuan_daxi_2.5K_1913': 18, 'Taoyuan_6K_1938': 18,
    'Taoyuan_5K_1979': 18,
    // ── 台中 ──
    'Taichung_1910': 18, 'Taichung_1926': 18,
    'Taichung_1935b': 18, 'Taichung_1937': 18,
    'Taichung_10K_1948': 18, 'Taichung_10K_1956': 18,
    'Taichung_10K_1967B': 18, 'Taichung_15K_1976': 18,
    // ── 嘉義 ──
    'chiayi_1895': 18, 'Chiayi_3K_1913': 18,
    'Chiayi_6K_1933': 18, 'chiayi_12K_1940': 18,
    'Chiayi_10K_1976': 18,
    // ── 高雄 ──
    'Kaohsiung_1893': 18, 'Kaohsiung_1929': 18,
    'Kaohsiung_1935': 18,
    'Kaohsiung_6K_1922': 18, 'Kaohsiung_10K_1926': 18,
    'Kaohsiung_10K_1936': 18, 'Kaohsiung_10K_1946': 18,
    'Kaohsiung_10K_1965': 18, 'Kaohsiung_10K_1980': 18,
    // ── 台南 ──
    'Tainan_1875': 18, 'Tainan_20K_1917': 18,
    'Tainan_1935': 18, 'Tainan_1936': 18,
    'Tainan_1943': 18, 'Tainan_1966': 18,
    'Tainan_1996': 18,
    // ── 屏東 ──
    'Pingtung_6K_1912': 18, 'Pingtung_6K_1930': 18,
    'Pingtung_10K_1939': 18, 'Pingtung_10K_1976': 18,
};

const SINICA_WMTS = (layerId) => {
    const fmt = SINICA_JPG_LAYERS.has(layerId) ? 'jpg' : 'png';
    const region = LAYER_REGION[layerId] || 'tileserver';
    return `https://gis.sinica.edu.tw/${region}/file-exists.php?img=${layerId}-${fmt}-{z}-{x}-{y}`;
};


// ── 從 URL hash 讀取初始視角（格式：#z/lat/lon）
// 若沒有 hash，預設台北城（清代台北府城 / 日治台北市中心）
function parseHashView() {
    const hash = location.hash.replace('#', '');
    const parts = hash.split('/');
    if (parts.length === 3) {
        const z   = parseInt(parts[0], 10);
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (!isNaN(z) && !isNaN(lat) && !isNaN(lon)) {
            return { center: [lat, lon], zoom: z };
        }
    }
    return null;
}

const DEFAULT_VIEW = { center: [25.046, 121.517], zoom: 14 };
const initView     = parseHashView() || DEFAULT_VIEW;
const INIT_CENTER  = initView.center;
const INIT_ZOOM    = initView.zoom;

// ── 全域狀態 ──
let syncing        = false;   // 防止循環同步

// ── 地圖初始化 ──
const mapLeft = L.map('map-left', {
    center: INIT_CENTER,
    zoom:   INIT_ZOOM,
    zoomControl: true,
});

const mapRight = L.map('map-right', {
    center: INIT_CENTER,
    zoom:   INIT_ZOOM,
    zoomControl: false,
});

// 左側：OSM 現代地圖
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
}).addTo(mapLeft);

// ── 右側圖層管理 ──
let basemapLayer = null;

function buildSinicaLayer(layerId) {
    if (!layerId || layerId === 'none') return null;
    return L.tileLayer(SINICA_WMTS(layerId), {
        attribution: '© <a href="https://gis.sinica.edu.tw/">中央研究院人文社會科學研究中心地理資訊科學研究專題中心</a>',
        opacity: 0.85,
        maxZoom: 19,
        maxNativeZoom: SINICA_MAX_NATIVE_ZOOM[layerId] ?? 18,
    });
}

function refreshRightLayers() {
    if (basemapLayer) { mapRight.removeLayer(basemapLayer); basemapLayer = null; }

    const layerId = document.getElementById('basemap-select').value;

    if (layerId === 'hist1915') {
        hist1915Visible = true;
        document.getElementById('map-right-label').textContent = '1915 臺北廳廳區';
    } else {
        hist1915Visible = false;
        if (layerId && layerId !== 'none') {
            basemapLayer = buildSinicaLayer(layerId);
            basemapLayer.addTo(mapRight);
        }
        const label = document.querySelector(`#basemap-select option[value="${layerId}"]`);
        document.getElementById('map-right-label').textContent =
            label ? label.textContent.trim() : '歷史地圖';
    }

    update1915Layers();
}

// ── 地圖同步 ──
function syncMaps(source, target) {
    if (syncing) return;
    syncing = true;
    target.setView(source.getCenter(), source.getZoom(), { animate: false });
    syncing = false;
}

// ── 更新 URL hash（節流，避免更新過於頻繁）
let hashUpdateTimer = null;
function updateHash() {
    clearTimeout(hashUpdateTimer);
    hashUpdateTimer = setTimeout(() => {
        const c = mapLeft.getCenter();
        const z = mapLeft.getZoom();
        const lat = c.lat.toFixed(5);
        const lon = c.lng.toFixed(5);
        history.replaceState(null, '', `#${z}/${lat}/${lon}`);
    }, 300);
}

mapLeft.on('move',    () => syncMaps(mapLeft, mapRight));
mapLeft.on('zoomend', () => syncMaps(mapLeft, mapRight));
mapRight.on('move',    () => syncMaps(mapRight, mapLeft));
mapRight.on('zoomend', () => syncMaps(mapRight, mapLeft));

// move / zoomend 都觸發 hash 更新
mapLeft.on('move',    updateHash);
mapLeft.on('zoomend', updateHash);

// ── 對位準心：在對側地圖顯示對應的地理位置 ──
const crosshairLeft  = document.createElement('div');
crosshairLeft.className = 'map-crosshair';
document.getElementById('map-left').appendChild(crosshairLeft);

const crosshairRight = document.createElement('div');
crosshairRight.className = 'map-crosshair';
document.getElementById('map-right').appendChild(crosshairRight);

function moveCrosshair(crosshair, targetMap, latlng) {
    const pt = targetMap.latLngToContainerPoint(latlng);
    crosshair.style.left    = pt.x + 'px';
    crosshair.style.top     = pt.y + 'px';
    crosshair.style.display = 'block';
}

mapLeft.on('mousemove', (e) => moveCrosshair(crosshairRight, mapRight, e.latlng));
mapLeft.on('mouseout',  ()  => { crosshairRight.style.display = 'none'; });
mapRight.on('mousemove', (e) => moveCrosshair(crosshairLeft, mapLeft, e.latlng));
mapRight.on('mouseout',  ()  => { crosshairLeft.style.display = 'none'; });

// ── 座標顯示 ──
function onMouseMove(e) {
    const { lat, lng } = e.latlng;
    document.getElementById('coords').textContent =
        `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
}
mapLeft.on('mousemove', onMouseMove);
mapRight.on('mousemove', onMouseMove);


// ── 圖層選擇器 ──
document.getElementById('basemap-select').addEventListener('change', () => {
    refreshRightLayers();
});


// ── 分隔線拖曳調整寬度 ──
(function() {
    const divider   = document.getElementById('divider');
    const container = document.getElementById('map-container');
    const mapL      = document.getElementById('map-left');
    const mapR      = document.getElementById('map-right');
    let dragging    = false;
    let startX      = 0;
    let startLeftW  = 0;

    divider.addEventListener('mousedown', (e) => {
        dragging   = true;
        startX     = e.clientX;
        startLeftW = mapL.getBoundingClientRect().width;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const containerW = container.getBoundingClientRect().width - 4;
        const newLeftW   = Math.max(100, Math.min(containerW - 100,
            startLeftW + (e.clientX - startX)));
        const pct = (newLeftW / containerW * 100).toFixed(2);
        mapL.style.flex = `0 0 ${pct}%`;
        mapR.style.flex = '1';
        mapLeft.invalidateSize();
        mapRight.invalidateSize();
    });

    document.addEventListener('mouseup', () => {
        if (dragging) {
            dragging = false;
            document.body.style.cursor = '';
        }
    });
})();

// ── 1915 臺北廳行政區 GeoJSON 圖層 ──────────────────────────────────────────
const ZOOM_SHITCHO = 11;   // zoom >= 11: 顯示支廳
const ZOOM_KU      = 13;   // zoom >= 13: 顯示區

let hist1915Visible  = false;
let _shitchoPolygons = null;
let _shitchoLabels   = null;
let _kuPolygons      = null;
let _kuLabels        = null;
let _choMarker       = null;

function polygonCentroid(feature) {
    const rings = feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates
        : feature.geometry.coordinates[0];
    const ring = rings[0];
    let sumLon = 0, sumLat = 0;
    for (const pt of ring) { sumLon += pt[0]; sumLat += pt[1]; }
    return [sumLat / ring.length, sumLon / ring.length];
}

function makeLabels(data, cssClass) {
    const markers = [];
    for (const feat of data.features) {
        const [lat, lon] = polygonCentroid(feat);
        markers.push(L.marker([lat, lon], {
            icon: L.divIcon({
                className: cssClass,
                html: feat.properties.name,
                iconSize: null,
                iconAnchor: null,
            }),
            interactive: false,
        }));
    }
    return L.featureGroup(markers);
}

function update1915Layers() {
    if (!_shitchoPolygons) return;
    const z = mapRight.getZoom();

    [_shitchoPolygons, _shitchoLabels, _kuPolygons, _kuLabels, _choMarker].forEach(l => {
        if (l && mapRight.hasLayer(l)) mapRight.removeLayer(l);
    });

    if (!hist1915Visible) return;

    if (z < ZOOM_SHITCHO) {
        _shitchoPolygons.eachLayer(l => l.setStyle({ fillOpacity: 0.12, color: '#555', weight: 1 }));
        _shitchoPolygons.addTo(mapRight);
        _choMarker.addTo(mapRight);

    } else if (z < ZOOM_KU) {
        _shitchoPolygons.eachLayer(l => l.setStyle({
            fillColor:   l.feature.properties.fill,
            fillOpacity: 0.38,
            color:       '#444',
            weight:      1.5,
        }));
        _shitchoPolygons.addTo(mapRight);
        _shitchoLabels.addTo(mapRight);

    } else {
        _shitchoPolygons.eachLayer(l => l.setStyle({ fillOpacity: 0, color: '#333', weight: 2 }));
        _shitchoPolygons.addTo(mapRight);
        _kuPolygons.addTo(mapRight);
        _kuLabels.addTo(mapRight);
    }
}

function init1915Layers(shitchoData, kuData) {
    _shitchoPolygons = L.geoJSON(shitchoData, {
        style: (feat) => ({
            fillColor:   feat.properties.fill,
            fillOpacity: 0.38,
            color:       '#444',
            weight:      1.5,
        }),
    });
    _shitchoLabels = makeLabels(shitchoData, 'hist-label hist-shitcho-label');

    _kuPolygons = L.geoJSON(kuData, {
        style: (feat) => ({
            fillColor:   feat.properties.fill,
            fillOpacity: 0.22,
            color:       '#666',
            weight:      0.8,
        }),
    });
    _kuLabels = makeLabels(kuData, 'hist-label hist-ku-label');

    const allCoords = shitchoData.features.flatMap(f =>
        (f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates[0])[0]
    );
    const centerLat = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;
    const centerLon = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
    _choMarker = L.marker([centerLat, centerLon], {
        icon: L.divIcon({
            className: 'hist-label hist-cho-label',
            html: '臺北廳',
            iconSize: null,
            iconAnchor: null,
        }),
        interactive: false,
    });

    update1915Layers();
}

Promise.all([
    fetch('/static/1915_Taihoku_Shitcho.geojson').then(r => r.json()),
    fetch('/static/1915_Taihoku_Ku.geojson').then(r => r.json()),
]).then(([shitcho, ku]) => init1915Layers(shitcho, ku));

mapRight.on('zoomend', update1915Layers);


// ── 初始化 ──
refreshRightLayers();
