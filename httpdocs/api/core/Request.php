<?php

class Request {
    private $method;
    private $uri;
    private $headers;
    private $body;
    private $query;
    private $params = [];
    public $user = null;

    public function __construct() {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->uri = $this->parseUri();
        $this->headers = $this->parseHeaders();
        $this->body = $this->parseBody();
        $this->query = $_GET;
    }

    private function parseUri() {
        $uri = $_SERVER['REQUEST_URI'];
        $uri = parse_url($uri, PHP_URL_PATH);
        return rtrim($uri, '/') ?: '/';
    }

    private function parseHeaders() {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $header = str_replace('_', '-', substr($key, 5));
                $headers[$header] = $value;
            }
        }

        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['CONTENT-TYPE'] = $_SERVER['CONTENT_TYPE'];
        }

        return $headers;
    }

    private function parseBody() {
        $contentType = $this->header('CONTENT-TYPE') ?? '';

        if (strpos($contentType, 'application/json') !== false) {
            $json = file_get_contents('php://input');
            return json_decode($json, true) ?? [];
        }

        if ($this->method === 'POST' || $this->method === 'PUT' || $this->method === 'PATCH') {
            return $_POST;
        }

        return [];
    }

    public function method() {
        return $this->method;
    }

    public function uri() {
        return $this->uri;
    }

    public function header($key) {
        $key = strtoupper(str_replace('-', '_', $key));
        return $this->headers[$key] ?? null;
    }

    public function input($key = null, $default = null) {
        if ($key === null) {
            return $this->body;
        }

        return $this->body[$key] ?? $default;
    }

    public function query($key = null, $default = null) {
        if ($key === null) {
            return $this->query;
        }

        return $this->query[$key] ?? $default;
    }

    public function file($key) {
        return $_FILES[$key] ?? null;
    }

    public function hasFile($key) {
        return isset($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK;
    }

    public function setParams($params) {
        $this->params = $params;
    }

    public function param($key, $default = null) {
        return $this->params[$key] ?? $default;
    }

    public function all() {
        return array_merge($this->body, $this->query, $this->params);
    }

    public function bearerToken() {
        $authorization = $this->header('AUTHORIZATION');

        if ($authorization && strpos($authorization, 'Bearer ') === 0) {
            return substr($authorization, 7);
        }

        return null;
    }

    public function ip() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        }

        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        }

        return $_SERVER['REMOTE_ADDR'];
    }
}
