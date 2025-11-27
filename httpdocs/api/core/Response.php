<?php

class Response {
    private $statusCode = 200;
    private $headers = [];
    private $body;

    public function status($code) {
        $this->statusCode = $code;
        return $this;
    }

    public function header($key, $value) {
        $this->headers[$key] = $value;
        return $this;
    }

    public function json($data, $status = 200) {
        $this->statusCode = $status;
        $this->headers['Content-Type'] = 'application/json';
        $this->body = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $this;
    }

    public function success($data = null, $message = 'Success', $status = 200) {
        return $this->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $status);
    }

    public function error($message, $status = 400, $errors = null) {
        return $this->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ], $status);
    }

    public function created($data = null, $message = 'Resource created') {
        return $this->success($data, $message, 201);
    }

    public function noContent() {
        $this->statusCode = 204;
        $this->body = '';
        return $this;
    }

    public function unauthorized($message = 'Unauthorized') {
        return $this->error($message, 401);
    }

    public function forbidden($message = 'Forbidden') {
        return $this->error($message, 403);
    }

    public function notFound($message = 'Resource not found') {
        return $this->error($message, 404);
    }

    public function validationError($errors, $message = 'Validation failed') {
        return $this->error($message, 422, $errors);
    }

    public function serverError($message = 'Internal server error') {
        return $this->error($message, 500);
    }

    public function send() {
        http_response_code($this->statusCode);

        foreach ($this->headers as $key => $value) {
            header("$key: $value");
        }

        if ($this->body !== null) {
            echo $this->body;
        }

        exit;
    }
}
