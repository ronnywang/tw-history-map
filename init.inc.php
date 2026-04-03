<?php

define('MINI_ENGINE_LIBRARY', true);
define('MINI_ENGINE_ROOT', __DIR__);
require_once(__DIR__ . '/mini-engine.php');
if (file_exists(__DIR__ . '/config.inc.php')) {
    include(__DIR__ . '/config.inc.php');
}
set_include_path(
    __DIR__ . '/libraries'
    . PATH_SEPARATOR . __DIR__ . '/models'
);
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once(__DIR__ . '/vendor/autoload.php');
}
// PHP 8.4+ 已移除 E_STRICT，在 initEnv() 呼叫前後暫時抑制 E_DEPRECATED
error_reporting(E_ALL & ~E_DEPRECATED);
MiniEngine::initEnv();
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
