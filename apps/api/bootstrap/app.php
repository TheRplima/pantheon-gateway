<?php

use App\Exceptions\DomainConflictException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\CorrelationIdMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, $request) {
            if (!$request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'validation_error',
                    'message' => 'Validation failed',
                    'details' => $e->errors(),
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        });

        $exceptions->render(function (ModelNotFoundException $e, $request) {
            if (!$request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'not_found',
                    'message' => 'Resource not found',
                ],
            ], Response::HTTP_NOT_FOUND);
        });

        $exceptions->render(function (AuthenticationException $e, $request) {
            if (!$request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'unauthorized',
                    'message' => 'Authentication required',
                ],
            ], Response::HTTP_UNAUTHORIZED);
        });

        $exceptions->render(function (DomainConflictException $e, $request) {
            if (!$request->is('api/*')) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'conflict',
                    'message' => $e->getMessage(),
                ],
            ], Response::HTTP_CONFLICT);
        });

        $exceptions->render(function (\Throwable $e, $request) {
            if (!$request->is('api/*')) {
                return null;
            }

            $payload = [
                'error' => [
                    'code' => 'internal_error',
                    'message' => 'Internal server error',
                ],
            ];
            if (config('app.debug')) {
                $payload['error']['debug_message'] = $e->getMessage();
            }

            return response()->json([
                ...$payload,
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        });
    })->create();
