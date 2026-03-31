<?php

return [
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    'brevo' => [
        'api_key' => env('BREVO_API_KEY'),
        'base_url' => env('BREVO_BASE_URL', 'https://api.brevo.com/v3'),
        'sender_email' => env('BREVO_SENDER_EMAIL', env('MAIL_FROM_ADDRESS')),
        'sender_name' => env('BREVO_SENDER_NAME', env('MAIL_FROM_NAME', 'GNF Notes de Frais')),
        'sandbox' => (bool) env('BREVO_SANDBOX', false),
    ],
];
