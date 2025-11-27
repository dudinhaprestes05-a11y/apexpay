<?php

class RateLimitMiddleware {
    private $config;
    private $cacheFile;

    public function __construct() {
        $appConfig = require __DIR__ . '/../config/app.php';
        $this->config = $appConfig['rate_limit'];
        $this->cacheFile = __DIR__ . '/../storage/cache/rate_limit.json';
    }

    public function handle(Request $request, Response $response) {
        if (!$this->config['enabled']) {
            return;
        }

        $identifier = $this->getIdentifier($request);
        $currentTime = time();
        $windowStart = $currentTime - $this->config['window'];

        $data = $this->loadCache();

        if (!isset($data[$identifier])) {
            $data[$identifier] = [];
        }

        $data[$identifier] = array_filter($data[$identifier], function($timestamp) use ($windowStart) {
            return $timestamp > $windowStart;
        });

        $requestCount = count($data[$identifier]);

        $response->header('X-RateLimit-Limit', $this->config['max_requests']);
        $response->header('X-RateLimit-Remaining', max(0, $this->config['max_requests'] - $requestCount - 1));
        $response->header('X-RateLimit-Reset', $windowStart + $this->config['window']);

        if ($requestCount >= $this->config['max_requests']) {
            $response->error('Limite de requisições excedido. Tente novamente mais tarde.', 429)->send();
        }

        $data[$identifier][] = $currentTime;

        $this->saveCache($data);
    }

    private function getIdentifier(Request $request) {
        if ($request->user) {
            return 'user_' . $request->user['id'];
        }

        return 'ip_' . $request->ip();
    }

    private function loadCache() {
        if (!file_exists($this->cacheFile)) {
            return [];
        }

        $content = file_get_contents($this->cacheFile);
        return json_decode($content, true) ?? [];
    }

    private function saveCache($data) {
        $dir = dirname($this->cacheFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents($this->cacheFile, json_encode($data));
    }
}
