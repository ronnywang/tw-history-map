<?php
// PHP 內建伺服器：靜態檔案直接回傳，不經 routing
if (php_sapi_name() === 'cli-server') {
    $file = __DIR__ . $_SERVER['REQUEST_URI'];
    $file = strtok($file, '?');  // 去掉 query string
    if (is_file($file)) {
        return false;
    }
}

include(__DIR__ . '/init.inc.php');

MiniEngine::dispatch(function($uri){
    if ($uri == '/robots.txt') {
        return ['index', 'robots'];
    }

    // /tile/{era}/{z}/{x}/{y} → TileController::indexAction
    if (preg_match('#^/tile/([^/]+)/(\d+)/(\d+)/(\d+)$#', $uri, $m)) {
        $_GET['era'] = $m[1];
        $_GET['z']   = $m[2];
        $_GET['x']   = $m[3];
        $_GET['y']   = $m[4];
        return ['tile', 'index'];
    }

    // /api/{action} → ApiController
    if (preg_match('#^/api/([^/]+)$#', $uri, $m)) {
        return ['api', $m[1]];
    }


    // default
    return null;
});
