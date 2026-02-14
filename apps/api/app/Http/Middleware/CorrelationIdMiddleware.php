<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Str;

class CorrelationIdMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Get correlation ID from header or generate new one
        $correlationId = $request->header('X-Correlation-ID', (string) Str::uuid());

        // 2. Add to request attributes for easy access later
        $request->attributes->set('correlation_id', $correlationId);

        $response = $next($request);

        // 3. Set header on the response
        $response->headers->set('X-Correlation-ID', $correlationId);

        return $response;
    }
}
