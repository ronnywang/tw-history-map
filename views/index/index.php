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
            <!-- 右側地圖圖層選擇器 -->
            <div class="control-group">
                <label for="basemap-select">右側圖層：</label>
                <select id="basemap-select">
                    <option value="none">無</option>
                    <optgroup label="── 行政區劃 ──">
                        <option value="hist1915">1915 臺北廳廳區</option>
                    </optgroup>
                    <optgroup label="── 全臺 日治地形圖 ──">
                        <option value="JM20K_1904">明治堡圖 1:20000 (1904)</option>
                        <option value="JM100K_1905">明治地圖 1:100000 (1905)</option>
                        <option value="JM20K_1921">日治地形圖 1:20000 (1921)</option>
                        <option value="JM25K_1921">日治地形圖 1:25000 (1921)</option>
                        <option value="JM50K_1920" selected>日治地形圖 1:50000 (1920)</option>
                        <option value="JM50K_1924">日治地形圖 1:50000 (1924)</option>
                        <option value="JMGeo_1930s">日治地理圖 (1930s)</option>
                    </optgroup>
                    <optgroup label="── 全臺 美軍地圖 ──">
                        <option value="AM25K_1944A">美軍地形圖 1:25000 (1944)</option>
                        <option value="AM25K_1944B">美軍地形圖 1:25000-B (1944)</option>
                        <option value="AM50K_1944">美軍地形圖 1:50000 (1944)</option>
                        <option value="AMS250K_1944">美軍地形圖 1:250000 (1944)</option>
                        <option value="AMCityPlan_1945">美軍城市計畫圖 (1945)</option>
                    </optgroup>
                    <optgroup label="── 全臺 戰後地形圖 ──">
                        <option value="TM25K_1950">地形圖 (1950)</option>
                        <option value="TM50K_1954">地形圖 1:50000 (1954)</option>
                        <option value="TM25K_1955">地形圖 (1955)</option>
                        <option value="TM25K_1966">地形圖 (1966)</option>
                        <option value="TM50K_1966">地形圖 1:50000 (1966)</option>
                        <option value="Taiwan_Corona_1966">Corona 衛星圖 (1966)</option>
                        <option value="Taiwan_Corona_1969">Corona 衛星圖 (1969)</option>
                        <option value="TM25K_1989">地形圖 (1989)</option>
                        <option value="TM50K_1990">地形圖 1:50000 (1990)</option>
                        <option value="TM25K_1993">地形圖 (1993)</option>
                        <option value="TM50K_1996">地形圖 1:50000 (1996)</option>
                        <option value="TM25K_2001">地形圖 (2001)</option>
                        <option value="TM25K_2003">地形圖 (2003)</option>
                        <option value="TM50K_2003">地形圖 1:50000 (2003)</option>
                    </optgroup>
                    <optgroup label="── 臺北 ──">
                        <option value="TPE_06_F">臺北府之圖 (1888)</option>
                        <option value="Taipei_1888">臺北市街圖 (1888)</option>
                        <option value="Taipei_1895">臺北市街圖 (1895)</option>
                        <option value="Taipei_1895b">臺北市街圖-B (1895)</option>
                        <option value="Taipei_1897">臺北市街圖 (1897)</option>
                        <option value="Taipei_1903">臺北市街圖 (1903)</option>
                        <option value="TPE_06_I">臺北廳地圖 (1903)</option>
                        <option value="Taipei_1905">臺北市街圖 (1905)</option>
                        <option value="TPE_06_J">臺北廳地圖 (1905)</option>
                        <option value="Taipei_1907">臺北市街圖 (1907)</option>
                        <option value="Taipei_1910">臺北市街圖 (1910)</option>
                        <option value="TPE_06_L">臺北廳地圖 (1910)</option>
                        <option value="Taipei_1911">臺北市街圖 (1911)</option>
                        <option value="Taipei_1914">臺北市街圖 (1914)</option>
                        <option value="Taipei_1916">臺北市街圖 (1916)</option>
                        <option value="Taipei_10K_1919">臺北 1:10000 (1919)</option>
                        <option value="Taipei_13K_1927">臺北 1:13000 (1927)</option>
                        <option value="Taipei_10K_1939">臺北 1:10000 (1939)</option>
                        <option value="Taipei_15K_1947">臺北 1:15000 (1947)</option>
                        <option value="TaipeiTamsui_1947">臺北淡水 (1947)</option>
                        <option value="Taipei_12K_1956">臺北 1:12000 (1956)</option>
                        <option value="Taipei_10K_1962">臺北 1:10000 (1962)</option>
                        <option value="Taipei_10K_1966">臺北 1:10000 (1966)</option>
                        <option value="Taipei_12K_1967">臺北 1:12000 (1967)</option>
                        <option value="Taipei_10K_1977">臺北 1:10000 (1977)</option>
                        <option value="TPE_all">臺北地籍全圖</option>
                    </optgroup>
                    <optgroup label="── 基隆 ──">
                        <option value="Keelung_31.7K_1854">基隆 1:31700 (1854)</option>
                        <option value="Keelung_14.6K_1899">基隆 1:14600 (1899)</option>
                        <option value="Keelung_20K_1904">基隆 1:20000 (1904)</option>
                        <option value="Keelung_12K_1924">基隆 1:12000 (1924)</option>
                        <option value="Keelung_10K_1929">基隆 1:10000 (1929)</option>
                        <option value="Keelung_10K_1937">基隆 1:10000 (1937)</option>
                        <option value="Keelung_10K_1964">基隆 1:10000 (1964)</option>
                    </optgroup>
                    <optgroup label="── 桃園 ──">
                        <option value="Taoyuan_daxi_2.5K_1913">大溪 1:2500 (1913)</option>
                        <option value="Taoyuan_6K_1938">桃園 1:6000 (1938)</option>
                        <option value="Taoyuan_5K_1979">桃園 1:5000 (1979)</option>
                    </optgroup>
                    <optgroup label="── 新竹 ──">
                        <option value="Hsinchu_3K_1905">新竹 1:3000 (1905)</option>
                        <option value="Hsinchu_6K_1917">新竹 1:6000 (1917)</option>
                        <option value="Hsinchu_6K_1936">新竹 1:6000 (1936)</option>
                        <option value="Hsinchu_10K_1940s">新竹 1:10000 (1940s)</option>
                        <option value="Hsinchu_10K_1976">新竹 1:10000 (1976)</option>
                    </optgroup>
                    <optgroup label="── 台中 ──">
                        <option value="Taichung_1910">台中市街圖 (1910)</option>
                        <option value="Taichung_1926">台中市街圖 (1926)</option>
                        <option value="Taichung_1935b">台中市街圖 (1935)</option>
                        <option value="Taichung_1937">台中市街圖 (1937)</option>
                        <option value="Taichung_10K_1948">台中 1:10000 (1948)</option>
                        <option value="Taichung_10K_1956">台中 1:10000 (1956)</option>
                        <option value="Taichung_10K_1967B">台中 1:10000 (1967)</option>
                        <option value="Taichung_15K_1976">台中 1:15000 (1976)</option>
                    </optgroup>
                    <optgroup label="── 嘉義 ──">
                        <option value="chiayi_1895">嘉義市街圖 (1895)</option>
                        <option value="Chiayi_3K_1913">嘉義 1:3000 (1913)</option>
                        <option value="Chiayi_6K_1933">嘉義 1:6000 (1933)</option>
                        <option value="chiayi_12K_1940">嘉義 1:12000 (1940)</option>
                        <option value="Chiayi_10K_1976">嘉義 1:10000 (1976)</option>
                    </optgroup>
                    <optgroup label="── 台南 ──">
                        <option value="Tainan_1875">台南地圖 (1875)</option>
                        <option value="Tainan_20K_1917">台南 1:20000 (1917)</option>
                        <option value="Tainan_1935">台南市街圖 (1935)</option>
                        <option value="Tainan_1936">台南市街圖 (1936)</option>
                        <option value="Tainan_1943">台南市街圖 (1943)</option>
                        <option value="Tainan_1966">台南市街圖 (1966)</option>
                        <option value="Tainan_1996">台南地圖 (1996)</option>
                    </optgroup>
                    <optgroup label="── 高雄 ──">
                        <option value="Kaohsiung_1893">高雄市街圖 (1893)</option>
                        <option value="Kaohsiung_1929">高雄市街圖 (1929)</option>
                        <option value="Kaohsiung_1935">高雄市街圖 (1935)</option>
                        <option value="Kaohsiung_6K_1922">高雄 1:6000 (1922)</option>
                        <option value="Kaohsiung_10K_1926">高雄 1:10000 (1926)</option>
                        <option value="Kaohsiung_10K_1936">高雄 1:10000 (1936)</option>
                        <option value="Kaohsiung_10K_1946">高雄 1:10000 (1946)</option>
                        <option value="Kaohsiung_10K_1965">高雄 1:10000 (1965)</option>
                        <option value="Kaohsiung_10K_1980">高雄 1:10000 (1980)</option>
                    </optgroup>
                    <optgroup label="── 屏東 ──">
                        <option value="Pingtung_6K_1912">屏東 1:6000 (1912)</option>
                        <option value="Pingtung_6K_1930">屏東 1:6000 (1930)</option>
                        <option value="Pingtung_10K_1939">屏東 1:10000 (1939)</option>
                        <option value="Pingtung_10K_1976">屏東 1:10000 (1976)</option>
                    </optgroup>
                </select>
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
    </div>

</div>

<script src="/static/js/app.js"></script>
</body>
</html>
