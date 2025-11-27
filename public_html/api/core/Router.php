<?php

class Router {
    private $routes = [];
    private $middlewares = [];
    private $groupPrefix = '';
    private $groupMiddlewares = [];

    public function get($path, $handler) {
        $this->addRoute('GET', $path, $handler);
    }

    public function post($path, $handler) {
        $this->addRoute('POST', $path, $handler);
    }

    public function put($path, $handler) {
        $this->addRoute('PUT', $path, $handler);
    }

    public function delete($path, $handler) {
        $this->addRoute('DELETE', $path, $handler);
    }

    public function options($path, $handler) {
        $this->addRoute('OPTIONS', $path, $handler);
    }

    private function addRoute($method, $path, $handler) {
        $fullPath = $this->groupPrefix . $path;

        $this->routes[] = [
            'method' => $method,
            'path' => $fullPath,
            'pattern' => $this->pathToPattern($fullPath),
            'handler' => $handler,
            'middlewares' => $this->groupMiddlewares
        ];
    }

    private function pathToPattern($path) {
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }

    public function group($options, $callback) {
        $previousPrefix = $this->groupPrefix;
        $previousMiddlewares = $this->groupMiddlewares;

        if (isset($options['prefix'])) {
            $this->groupPrefix .= $options['prefix'];
        }

        if (isset($options['middleware'])) {
            $middlewares = is_array($options['middleware']) ? $options['middleware'] : [$options['middleware']];
            $this->groupMiddlewares = array_merge($this->groupMiddlewares, $middlewares);
        }

        $callback($this);

        $this->groupPrefix = $previousPrefix;
        $this->groupMiddlewares = $previousMiddlewares;
    }

    public function dispatch(Request $request, Response $response) {
        $method = $request->method();
        $uri = $request->uri();

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['pattern'], $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $request->setParams($params);

                try {
                    $this->executeMiddlewares($route['middlewares'], $request, $response);
                    $this->executeHandler($route['handler'], $request, $response);
                } catch (Exception $e) {
                    error_log("Route execution error: " . $e->getMessage());
                    $response->serverError($e->getMessage())->send();
                }

                return;
            }
        }

        $response->notFound()->send();
    }

    private function executeMiddlewares($middlewares, $request, $response) {
        foreach ($middlewares as $middleware) {
            if (is_string($middleware)) {
                $middlewareClass = $this->resolveMiddleware($middleware);
                $middlewareInstance = new $middlewareClass();
                $middlewareInstance->handle($request, $response);
            } elseif (is_callable($middleware)) {
                $middleware($request, $response);
            }
        }
    }

    private function resolveMiddleware($name) {
        $middlewares = [
            'auth' => 'AuthMiddleware',
            'admin' => 'AdminMiddleware',
            'cors' => 'CorsMiddleware',
            'ratelimit' => 'RateLimitMiddleware'
        ];

        return $middlewares[$name] ?? $name;
    }

    private function executeHandler($handler, $request, $response) {
        if (is_array($handler) && count($handler) === 2) {
            [$class, $method] = $handler;
            $controller = new $class();
            $controller->$method($request, $response);
        } elseif (is_callable($handler)) {
            $handler($request, $response);
        }
    }
}
