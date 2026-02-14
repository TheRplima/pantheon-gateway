<?php

return [
    'host' => env('RABBITMQ_HOST', 'rabbitmq'),
    'port' => (int) env('RABBITMQ_PORT', 5672),
    'user' => env('RABBITMQ_USER', 'guest'),
    'pass' => env('RABBITMQ_PASS', 'guest'),
    'vhost' => env('RABBITMQ_VHOST', '/'),

    'mgmt_url' => env('RABBITMQ_MGMT_URL', 'http://rabbitmq:15672'),
    'mgmt_user' => env('RABBITMQ_MGMT_USER', env('RABBITMQ_USER', 'guest')),
    'mgmt_pass' => env('RABBITMQ_MGMT_PASS', env('RABBITMQ_PASS', 'guest')),
];
