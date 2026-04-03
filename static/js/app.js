'use strict';

// ── 中研院 tile URL（Access-Control-Allow-Origin: *，可直接從瀏覽器存取）
// {x}=TILECOL, {y}=TILEROW
const SINICA_WMTS = (layerId) =>
    `https://gis.sinica.edu.tw/tileserver/file-exists.php?img=${layerId}-png-{z}-{x}-{y}`;

// ── 自有 tile server URL ──
const ADMIN_TILE = (era) => `/tile/${era}/{z}/{x}/{y}`;

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
let currentEra     = 'jp_1920';
let currentBasemap = 'JM50K_1920';
let showAdmin      = true;
let showRoads      = false;
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
let adminLayer   = null;

function buildAdminTileLayer(era) {
    return L.tileLayer(ADMIN_TILE(era), {
        opacity: 0.85,
        maxZoom: 19,
        tileSize: 256,
        // 不快取，讓 tile server 的 Cache-Control 決定
        updateWhenIdle: false,
    });
}

function buildSinicaLayer(layerId) {
    if (!layerId || layerId === 'none') return null;
    return L.tileLayer(SINICA_WMTS(layerId), {
        attribution: '© <a href="https://gis.sinica.edu.tw/">中央研究院人文社會科學研究中心地理資訊科學研究專題中心</a>',
        opacity: 0.85,
        maxZoom: 19,
    });
}

function refreshRightLayers() {
    // 移除舊圖層
    if (basemapLayer) { mapRight.removeLayer(basemapLayer); basemapLayer = null; }
    if (adminLayer)   { mapRight.removeLayer(adminLayer);   adminLayer   = null; }

    // 底圖
    const basemapId = document.getElementById('basemap-select').value;
    if (basemapId && basemapId !== 'none') {
        basemapLayer = buildSinicaLayer(basemapId);
        basemapLayer.addTo(mapRight);
    }

    // 行政區劃疊加層
    if (showAdmin) {
        adminLayer = buildAdminTileLayer(currentEra);
        adminLayer.addTo(mapRight);
    }

    // 更新右側標籤
    const eraObj = window.ERAS.find(e => e.id === currentEra);
    document.getElementById('map-right-label').textContent =
        eraObj ? eraObj.name : currentEra;

    // 更新狀態列
    document.getElementById('current-era-info').textContent =
        eraObj ? `目前時代：${eraObj.name}` : '';
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

// ── 右側地圖點擊：查詢行政區資訊 ──
mapRight.on('click', (e) => {
    const { lat, lng } = e.latlng;
    fetch(`/api/info?lon=${lng}&lat=${lat}&era=${currentEra}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success || !data.data.length) return;
            showInfoPanel(data.data);
        })
        .catch(() => {});
});

function showInfoPanel(divisions) {
    const levelNames = {1: '州/廳', 2: '郡/市', 3: '街庄/町'};
    const panel = document.getElementById('info-panel');
    const body  = document.getElementById('info-panel-body');

    body.innerHTML = divisions.map(d => `
        <div class="division-row">
            <span class="level-badge">${levelNames[d.level] || `Level ${d.level}`}</span>
            <strong>${d.name}</strong>
            ${d.name_kana ? `<small>（${d.name_kana}）</small>` : ''}
        </div>
    `).join('');

    panel.classList.remove('hidden');
}

document.getElementById('info-panel-close').addEventListener('click', () => {
    document.getElementById('info-panel').classList.add('hidden');
});

// ── 時代選擇器 ──
document.getElementById('era-select').addEventListener('change', (e) => {
    currentEra = e.target.value;
    refreshRightLayers();
});

// ── 底圖選擇器 ──
document.getElementById('basemap-select').addEventListener('change', () => {
    refreshRightLayers();
});

// ── 圖層開關 ──
document.getElementById('toggle-admin').addEventListener('change', (e) => {
    showAdmin = e.target.checked;
    refreshRightLayers();
});

document.getElementById('toggle-roads').addEventListener('change', (e) => {
    showRoads = e.target.checked;
    refreshRightLayers();
});

// ── 搜尋 ──
function doSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;

    fetch(`/api/search?q=${encodeURIComponent(q)}&era=${currentEra}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            showSearchResults(data.data);
        })
        .catch(() => {});
}

function showSearchResults(results) {
    const container = document.getElementById('search-results');
    if (!results.length) {
        container.innerHTML = '<div class="result-item">找不到結果</div>';
        container.classList.remove('hidden');
        return;
    }

    const levelNames = {1: '州/廳', 2: '郡/市', 3: '街庄/町'};
    container.innerHTML = results.map(r => `
        <div class="result-item" data-lon="${r.lon}" data-lat="${r.lat}">
            <div class="name">${r.name}</div>
            <div class="meta">${levelNames[r.level] || ''} · ${r.era_id}</div>
        </div>
    `).join('');
    container.classList.remove('hidden');

    // 點擊跳到該地點
    container.querySelectorAll('.result-item').forEach(item => {
        item.addEventListener('click', () => {
            const lon = parseFloat(item.dataset.lon);
            const lat = parseFloat(item.dataset.lat);
            if (!isNaN(lon) && !isNaN(lat)) {
                mapLeft.setView([lat, lon], 13);
                container.classList.add('hidden');
            }
        });
    });
}

document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
});

// 點擊地圖區域關閉搜尋結果
document.getElementById('map-left').addEventListener('click', () => {
    document.getElementById('search-results').classList.add('hidden');
});
document.getElementById('map-right').addEventListener('click', () => {
    document.getElementById('search-results').classList.add('hidden');
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

// ── 初始化 ──
refreshRightLayers();
