<?php
class DB {
  private static ?PDO $pdo = null;
  public static function conn(): PDO {
    if (self::$pdo) return self::$pdo;
    $cfg = require __DIR__ . '/../Config/config.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
      $cfg['db']['host'], $cfg['db']['port'], $cfg['db']['database'], $cfg['db']['charset']
    );
    $pdo = new PDO($dsn, $cfg['db']['username'], $cfg['db']['password'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    self::$pdo = $pdo;
    return $pdo;
  }
}
