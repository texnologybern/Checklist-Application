<?php
return [
  'app' => [
    'name' => 'Paros Checklist',
    'timezone' => 'Europe/Athens',
    'base_url' => '' // optional, e.g. 'https://example.gr/paros-checklist/public'
  ],
  'db' => [
    'host' => 'localhost',
    'port' => 3306,
    'database' => 'texnologybern_checker_paros',
    'username' => 'texnologybern_paros',
    'password' => 'ewumDWJlS2u&Dzb,',
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
  ],
  'security' => [
    // set a random string; used to harden CSRF token
    'secret' => 'change_this_to_a_random_long_secret',
  ],
];
