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
    'Tainan_1939': 'tainan', 'Tainan_1945': 'tainan',
    'Tainan_1959': 'tainan', 'Tainan_1971': 'tainan',
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
    'Tainan_1939': 18, 'Tainan_1945': 18,
    'Tainan_1959': 18, 'Tainan_1971': 18,
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

// ── 各地區中文名稱（用於超出範圍提示）
const REGION_NAME = {
    'tileserver': '全臺灣',
    'taipei':     '臺北',
    'keelung':    '基隆',
    'hsinchu':    '新竹',
    'taoyuan':    '桃園',
    'taichung':   '台中',
    'chiayi':     '嘉義',
    'tainan':     '台南',
    'kaohsiung':  '高雄',
    'pingtung':   '屏東',
};

// ── 各圖層的地理範圍 [minLat, minLon, maxLat, maxLon]（來自 WMTS WGS84BoundingBox）
const LAYER_BBOX = {
    // ── 全臺 日治地形圖 ──
    'JM20K_1904':  [21.656, 117.850, 25.642, 123.859],
    'JM100K_1905': [21.656, 117.850, 25.642, 123.859],
    'JM20K_1921':  [21.656, 117.850, 25.642, 123.859],
    'JM25K_1921':  [21.656, 117.850, 25.642, 123.859],
    'JM50K_1920':  [21.656, 117.850, 25.642, 123.859],
    'JM50K_1924':  [21.656, 117.850, 25.642, 123.859],
    'JMGeo_1930s': [22.332, 120.508, 25.665, 122.258],
    // ── 全臺 美軍地圖 ──
    'AM25K_1944A':   [21.832, 119.258, 25.665, 122.133],
    'AM25K_1944B':   [21.831, 119.383, 25.332, 122.008],
    'AM50K_1944':    [21.656, 117.850, 25.642, 123.859],
    'AMS250K_1944':  [19.882, 118.903, 26.042, 123.215],
    'AMCityPlan_1945': [21.656, 117.850, 25.642, 123.859],
    // ── 全臺 戰後地形圖 ──
    'TM25K_1950':        [21.833, 119.250, 25.667, 122.125],
    'TM50K_1954':        [21.834, 119.300, 25.583, 122.167],
    'TM25K_1955':        [21.818, 119.263, 25.666, 122.158],
    'TM25K_1966':        [21.818, 119.162, 25.666, 122.133],
    'TM50K_1966':        [21.656, 117.850, 25.642, 123.859],
    'Taiwan_Corona_1966': [23.226, 119.253, 25.472, 122.322],
    'Taiwan_Corona_1969': [23.595, 120.256, 25.472, 122.237],
    'TM25K_1989':  [21.656, 117.850, 25.642, 123.859],
    'TM50K_1990':  [21.656, 117.850, 25.642, 123.859],
    'TM25K_1993':  [21.656, 117.850, 25.642, 123.859],
    'TM50K_1996':  [21.656, 117.850, 25.642, 123.859],
    'TM25K_2001':  [21.656, 117.850, 25.642, 123.859],
    'TM25K_2003':  [21.656, 117.850, 25.642, 123.859],
    'TM50K_2003':  [21.656, 117.850, 25.642, 123.859],
    // ── 臺北地籍 ──
    'TPE_06_F':  [24.888, 121.316, 25.303, 121.749],
    'TPE_06_I':  [24.888, 121.316, 25.303, 121.749],
    'TPE_06_J':  [24.888, 121.316, 25.303, 121.749],
    'TPE_06_L':  [24.888, 121.316, 25.303, 121.749],
    'TaipeiTamsui_1947': [24.974, 121.447, 25.130, 121.627],
    'TPE_all':   [21.656, 117.850, 25.642, 123.859],
    // ── 臺北都市地圖 ──
    'Taipei_1888':    [25.013, 121.469, 25.081, 121.556],
    'Taipei_1895':    [25.029, 121.484, 25.072, 121.539],
    'Taipei_1895b':   [24.923, 121.329, 25.175, 121.709],
    'Taipei_1897':    [25.024, 121.478, 25.071, 121.539],
    'Taipei_1903':    [25.024, 121.478, 25.071, 121.539],
    'Taipei_1905':    [25.024, 121.478, 25.072, 121.540],
    'Taipei_1907':    [25.017, 121.475, 25.074, 121.550],
    'Taipei_1910':    [25.013, 121.469, 25.081, 121.556],
    'Taipei_1911':    [25.029, 121.497, 25.053, 121.528],
    'Taipei_1914':    [25.021, 121.480, 25.072, 121.544],
    'Taipei_1916':    [25.004, 121.458, 25.088, 121.565],
    'Taipei_10K_1919': [25.013, 121.467, 25.086, 121.561],
    'Taipei_13K_1927': [24.915, 121.328, 25.217, 121.748],
    'Taipei_10K_1939': [24.974, 121.447, 25.130, 121.627],
    'Taipei_15K_1947': [24.974, 121.447, 25.130, 121.627],
    'Taipei_12K_1956': [24.961, 121.410, 25.175, 121.683],
    'Taipei_10K_1962': [25.089, 121.415, 25.311, 121.675],
    'Taipei_10K_1966': [24.898, 121.320, 25.298, 121.754],
    'Taipei_12K_1967': [24.961, 121.410, 25.175, 121.683],
    'Taipei_10K_1977': [24.915, 121.328, 25.217, 121.748],
    // ── 基隆 ──
    'Keelung_31.7K_1854': [25.118, 121.736, 25.172, 121.815],
    'Keelung_14.6K_1899': [25.116, 121.727, 25.206, 121.800],
    'Keelung_20K_1904':   [25.002, 121.604, 25.337, 122.012],
    'Keelung_12K_1924':   [25.025, 121.580, 25.194, 121.818],
    'Keelung_10K_1929':   [25.121, 121.734, 25.154, 121.766],
    'Keelung_10K_1937':   [25.129, 121.737, 25.167, 121.777],
    'Keelung_10K_1964':   [25.115, 121.706, 25.167, 121.785],
    // ── 新竹 ──
    'Hsinchu_3K_1905':   [24.797, 120.960, 24.812, 120.974],
    'Hsinchu_6K_1917':   [24.789, 120.955, 24.820, 120.985],
    'Hsinchu_6K_1936':   [24.769, 120.944, 24.826, 121.014],
    'Hsinchu_10K_1940s': [24.778, 120.912, 24.845, 120.995],
    'Hsinchu_10K_1976':  [24.778, 120.900, 24.856, 121.010],
    // ── 桃園 ──
    'Taoyuan_daxi_2.5K_1913': [24.879, 121.277, 24.892, 121.295],
    'Taoyuan_6K_1938':        [24.977, 121.292, 25.012, 121.336],
    'Taoyuan_5K_1979':        [24.975, 121.275, 25.025, 121.325],
    // ── 台中 ──
    'Taichung_1910':     [24.129, 120.668, 24.151, 120.696],
    'Taichung_1926':     [24.118, 120.653, 24.161, 120.709],
    'Taichung_1935b':    [24.123, 120.654, 24.158, 120.708],
    'Taichung_1937':     [24.121, 120.642, 24.161, 120.706],
    'Taichung_10K_1948': [24.115, 120.653, 24.162, 120.712],
    'Taichung_10K_1956': [24.120, 120.651, 24.164, 120.711],
    'Taichung_10K_1967B':[24.089, 120.604, 24.197, 120.749],
    'Taichung_15K_1976': [24.114, 120.639, 24.171, 120.715],
    // ── 嘉義 ──
    'chiayi_1895':    [23.465, 120.428, 23.498, 120.474],
    'Chiayi_3K_1913': [23.463, 120.429, 23.495, 120.477],
    'Chiayi_6K_1933': [23.463, 120.431, 23.501, 120.478],
    'chiayi_12K_1940':[23.465, 120.428, 23.498, 120.474],
    'Chiayi_10K_1976':[23.429, 120.363, 23.508, 120.479],
    // ── 台南 ──
    'Tainan_1875':     [22.757, 119.772, 23.215, 120.412],
    'Tainan_20K_1917': [22.757, 119.772, 23.215, 120.412],
    'Tainan_1935':     [22.757, 119.772, 23.215, 120.412],
    'Tainan_1936':     [22.757, 119.772, 23.215, 120.412],
    'Tainan_1939':     [22.757, 119.772, 23.215, 120.412],
    'Tainan_1945':     [22.757, 119.772, 23.215, 120.412],
    'Tainan_1959':     [22.757, 119.772, 23.215, 120.412],
    'Tainan_1971':     [22.757, 119.772, 23.215, 120.412],
    'Tainan_1996':     [22.757, 119.772, 23.215, 120.412],
    // ── 高雄 ──
    'Kaohsiung_1893':     [22.609, 120.258, 22.621, 120.274],
    'Kaohsiung_1929':     [22.603, 120.254, 22.645, 120.309],
    'Kaohsiung_1935':     [22.606, 120.252, 22.644, 120.303],
    'Kaohsiung_6K_1922':  [22.601, 120.251, 22.651, 120.314],
    'Kaohsiung_10K_1926': [22.584, 120.240, 22.660, 120.336],
    'Kaohsiung_10K_1936': [22.582, 120.228, 22.684, 120.355],
    'Kaohsiung_10K_1946': [22.583, 120.228, 22.685, 120.356],
    'Kaohsiung_10K_1965': [22.575, 120.214, 22.654, 120.314],
    'Kaohsiung_10K_1980': [22.497, 120.150, 22.769, 120.491],
    // ── 屏東 ──
    'Pingtung_6K_1912':  [22.657, 120.462, 22.686, 120.516],
    'Pingtung_6K_1930':  [22.661, 120.479, 22.682, 120.499],
    'Pingtung_10K_1939': [22.650, 120.464, 22.698, 120.528],
    'Pingtung_10K_1976': [22.609, 120.438, 22.713, 120.522],
};


// ── 從 URL hash 讀取初始視角（格式：#z/lat/lon/layerId）
// 若沒有 hash，預設台北城（清代台北府城 / 日治台北市中心）
function parseHashView() {
    const hash = location.hash.replace('#', '');
    const parts = hash.split('/');
    if (parts.length >= 3) {
        const z   = parseInt(parts[0], 10);
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (!isNaN(z) && !isNaN(lat) && !isNaN(lon)) {
            return { center: [lat, lon], zoom: z, layer: parts[3] || null };
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
    zoomControl: false,
});
L.control.zoom({ position: 'bottomleft' }).addTo(mapLeft);

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

function buildLocalOsmLayer() {
    return L.tileLayer('/osm/{z}/{x}/{y}', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors（本地圖磚）',
        maxZoom: 19,
        maxNativeZoom: 17,
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
        if (layerId === 'osm_local') {
            basemapLayer = buildLocalOsmLayer();
            basemapLayer.addTo(mapRight);
        } else if (layerId && layerId !== 'none') {
            basemapLayer = buildSinicaLayer(layerId);
            basemapLayer.addTo(mapRight);
        }
        const label = document.querySelector(`#basemap-select option[value="${layerId}"]`);
        document.getElementById('map-right-label').textContent =
            label ? label.textContent.trim() : '歷史地圖';
    }

    update1915Layers();
    updateBoundsState();
}

// ── 超出圖層範圍判斷 ──

function boundsOverlap(mapBounds, bbox) {
    // bbox = [minLat, minLon, maxLat, maxLon]
    return mapBounds.getSouth() <= bbox[2] &&
           mapBounds.getNorth() >= bbox[0] &&
           mapBounds.getWest() <= bbox[3] &&
           mapBounds.getEast() >= bbox[1];
}

function updateBoundsState() {
    const mapBounds = mapLeft.getBounds();
    const selectEl  = document.getElementById('basemap-select');
    const currentId = selectEl.value;

    // 更新自製下拉選單各選項的超出範圍樣式
    const panel = document.getElementById('basemap-panel');
    if (panel) {
        for (const el of panel.querySelectorAll('.cs-option')) {
            const bbox = LAYER_BBOX[el.dataset.value];
            el.classList.toggle('cs-out-of-range', !!(bbox && !boundsOverlap(mapBounds, bbox)));
        }
    }

    // 顯示或隱藏超出範圍提示
    const notice = document.getElementById('out-of-bounds-notice');
    const bbox   = LAYER_BBOX[currentId];
    if (bbox && !boundsOverlap(mapBounds, bbox)) {
        const region   = LAYER_REGION[currentId] || 'tileserver';
        const areaName = REGION_NAME[region] || region;
        document.getElementById('oob-message').textContent =
            `本圖層的資料僅涵蓋${areaName}，目前視圖已超出範圍。`;
        document.getElementById('oob-fly-link').onclick = (e) => {
            e.preventDefault();
            mapLeft.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]]);
        };
        notice.classList.remove('hidden');
    } else {
        notice.classList.add('hidden');
    }
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
        const layer = document.getElementById('basemap-select').value;
        history.replaceState(null, '', `#${z}/${lat}/${lon}/${layer}`);
    }, 300);
}

mapLeft.on('move',    () => syncMaps(mapLeft, mapRight));
mapLeft.on('zoomend', () => syncMaps(mapLeft, mapRight));
mapLeft.on('moveend', updateBoundsState);
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


// ── 初始化：從 hash 還原圖層 ──
if (initView.layer) {
    const selectEl = document.getElementById('basemap-select');
    if (selectEl.querySelector(`option[value="${initView.layer}"]`)) {
        selectEl.value = initView.layer;
    }
}
refreshRightLayers();
updateHash();  // 確保 hash 包含圖層（例如 hash 中沒有 layer 段時補上預設值）

// ── 自製下拉選單（取代原生 select，讓超出範圍效果更明顯）──
(function initCustomSelect() {
    const selectEl = document.getElementById('basemap-select');
    selectEl.style.display = 'none';

    const wrapper = selectEl.parentNode;
    wrapper.id = 'basemap-select-wrapper';

    // 建立觸發按鈕
    const btn = document.createElement('div');
    btn.id = 'basemap-btn';
    btn.className = 'custom-select-btn';
    btn.innerHTML = '<span id="basemap-btn-label"></span><span class="cs-arrow">▾</span>';
    wrapper.insertBefore(btn, selectEl);

    // 建立下拉面板（從 select 的結構讀取）
    const panel = document.createElement('div');
    panel.id = 'basemap-panel';
    panel.className = 'custom-select-panel hidden';

    for (const child of selectEl.children) {
        if (child.tagName === 'OPTGROUP') {
            const grp = document.createElement('div');
            grp.className = 'cs-group';
            grp.textContent = child.label;
            panel.appendChild(grp);
            for (const opt of child.children) {
                const el = document.createElement('div');
                el.className = 'cs-option';
                el.dataset.value = opt.value;
                el.textContent = opt.textContent.trim();
                panel.appendChild(el);
            }
        } else if (child.tagName === 'OPTION') {
            const el = document.createElement('div');
            el.className = 'cs-option';
            el.dataset.value = child.value;
            el.textContent = child.textContent.trim();
            panel.appendChild(el);
        }
    }
    wrapper.insertBefore(panel, selectEl);

    function updateLabel() {
        const sel = selectEl.options[selectEl.selectedIndex];
        document.getElementById('basemap-btn-label').textContent = sel ? sel.textContent.trim() : '';
        for (const el of panel.querySelectorAll('.cs-option')) {
            el.classList.toggle('cs-selected', el.dataset.value === selectEl.value);
        }
    }

    function closePanel() {
        panel.classList.add('hidden');
        btn.classList.remove('open');
    }

    panel.addEventListener('click', (e) => {
        const optEl = e.target.closest('.cs-option');
        if (!optEl) return;
        selectEl.value = optEl.dataset.value;
        selectEl.dispatchEvent(new Event('change'));
        updateLabel();
        closePanel();
        // 選完後立刻捲動到選取的選項
        optEl.scrollIntoView({ block: 'nearest' });
    });

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !panel.classList.contains('hidden');
        if (isOpen) {
            closePanel();
        } else {
            // 以 fixed 定位，動態計算位置避免被 toolbar stacking context 擋住
            const rect = btn.getBoundingClientRect();
            panel.style.top   = (rect.bottom + 4) + 'px';
            panel.style.right = (window.innerWidth - rect.right) + 'px';
            panel.classList.remove('hidden');
            btn.classList.add('open');
            // 捲動到目前選取的選項
            const selEl = panel.querySelector('.cs-option.cs-selected');
            if (selEl) selEl.scrollIntoView({ block: 'nearest' });
        }
    });

    panel.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

    updateLabel();
})();

// ── 現代地點搜尋（Nominatim）──
(function initModernSearch() {
    const input   = document.getElementById('search-modern-input');
    const btn     = document.getElementById('search-modern-btn');
    const results = document.getElementById('search-modern-results');
    let searchMarker = null;
    let abortCtrl    = null;

    function closeResults() {
        results.classList.add('hidden');
        results.innerHTML = '';
    }

    function showMarker(lat, lon) {
        if (searchMarker) mapLeft.removeLayer(searchMarker);
        searchMarker = L.circleMarker([lat, lon], {
            radius: 8,
            color: '#e74c3c',
            fillColor: '#e74c3c',
            fillOpacity: 0.85,
            weight: 2,
        }).addTo(mapLeft);
    }

    async function doSearch() {
        const q = input.value.trim();
        if (!q) return;

        closeResults();
        results.innerHTML = '<div class="search-no-result">搜尋中…</div>';
        const rect = input.getBoundingClientRect();
        results.style.top  = (rect.bottom + 4) + 'px';
        results.style.left = rect.left + 'px';
        results.classList.remove('hidden');

        if (abortCtrl) abortCtrl.abort();
        abortCtrl = new AbortController();

        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=tw&limit=6&accept-language=zh-TW,zh,en`;
            const res  = await fetch(url, {
                signal: abortCtrl.signal,
                headers: { 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' },
            });
            const data = await res.json();

            if (!data.length) {
                results.innerHTML = '<div class="search-no-result">找不到符合的地點</div>';
                return;
            }

            results.innerHTML = '';
            for (const item of data) {
                const el = document.createElement('div');
                el.className = 'search-result-item';
                // 取第一段作為主名稱，其餘作為副標
                const nameParts = item.display_name.split(',');
                const mainName  = nameParts[0].trim();
                const subName   = nameParts.slice(1, 3).join(',').trim();
                el.innerHTML = `<div class="result-name">${mainName}</div>` +
                               (subName ? `<div class="result-type">${subName}</div>` : '');
                el.addEventListener('click', () => {
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);
                    mapLeft.setView([lat, lon], 17);
                    showMarker(lat, lon);
                    input.value = mainName;
                    closeResults();
                });
                results.appendChild(el);
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                results.innerHTML = '<div class="search-no-result">搜尋失敗，請稍後再試</div>';
            }
        }
    }

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
        if (e.key === 'Escape') closeResults();
    });

    // 點擊搜尋框外部關閉結果
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-modern')) closeResults();
    });
    document.getElementById('search-modern').addEventListener('click', (e) => e.stopPropagation());

    // 移動地圖時移除搜尋標記
    mapLeft.on('movestart', () => {
        if (searchMarker) { mapLeft.removeLayer(searchMarker); searchMarker = null; }
    });
})();
