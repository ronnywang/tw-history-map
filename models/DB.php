<?php
/**
 * 資料庫連線管理
 * 提供 SpatiaLite 連線的單例模式
 */
class DB
{
    private static ?SQLite3 $instance = null;

    public static function getInstance(): SQLite3
    {
        if (self::$instance === null) {
            $db_path = getenv('DB_PATH');
            $spatialite_ext = getenv('SPATIALITE_EXT') ?: 'mod_spatialite.8.dylib';

            self::$instance = new SQLite3($db_path, SQLITE3_OPEN_READWRITE);
            self::$instance->enableExceptions(true);
            self::$instance->loadExtension($spatialite_ext);
            self::$instance->busyTimeout(5000);
        }
        return self::$instance;
    }

    /**
     * 執行 SELECT 查詢，回傳所有列
     */
    public static function query(string $sql, array $params = []): array
    {
        $db = self::getInstance();
        if (empty($params)) {
            $result = $db->query($sql);
        } else {
            $stmt = $db->prepare($sql);
            foreach ($params as $i => $val) {
                $pos = is_int($i) ? $i + 1 : $i;
                $stmt->bindValue($pos, $val);
            }
            $result = $stmt->execute();
        }

        $rows = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $rows[] = $row;
        }
        return $rows;
    }

    /**
     * 執行 SELECT 查詢，回傳第一列
     */
    public static function queryOne(string $sql, array $params = []): ?array
    {
        $rows = self::query($sql, $params);
        return $rows[0] ?? null;
    }

    /**
     * 執行非查詢語句（INSERT / UPDATE / DELETE）
     */
    public static function exec(string $sql, array $params = []): bool
    {
        $db = self::getInstance();
        if (empty($params)) {
            return $db->exec($sql);
        }
        $stmt = $db->prepare($sql);
        foreach ($params as $i => $val) {
            $pos = is_int($i) ? $i + 1 : $i;
            $stmt->bindValue($pos, $val);
        }
        return (bool)$stmt->execute();
    }
}
