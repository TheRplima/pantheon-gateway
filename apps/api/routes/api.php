<?php

use App\Http\Controllers\Api\v1\AgentAuthController;
use App\Http\Controllers\Api\v1\AgentController;
use App\Http\Controllers\Api\v1\AgentLifecycleCallbackController;
use App\Http\Controllers\Api\v1\AgentOperationController;
use App\Http\Controllers\Api\v1\TaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public Auth
    Route::post('auth/login', [AgentAuthController::class, 'login']);

    // Public Read-only Ecosystem View
    Route::get('agents', [AgentController::class, 'index']);
    Route::get('agents/{agent}', [AgentController::class, 'show']);
    Route::post('agents', [AgentController::class, 'store']); // Public for Dashboard Alpha
    Route::get('agent-operations/{operation_id}', [AgentOperationController::class, 'show']);
    Route::post('internal/agent-lifecycle/callback', [AgentLifecycleCallbackController::class, 'store']);
    Route::get('tasks', [TaskController::class, 'index']);
    Route::get('tasks/{task}', [TaskController::class, 'show']);

    // Protected Routes
    Route::middleware('auth:api')->group(function () {
        // Auth management
        Route::post('auth/logout', [AgentAuthController::class, 'logout']);
        Route::post('auth/refresh', [AgentAuthController::class, 'refresh']);
        Route::get('auth/me', [AgentAuthController::class, 'me']);

        // Agents Mutation
        Route::put('agents/{agent}', [AgentController::class, 'update']);
        Route::delete('agents/{agent}', [AgentController::class, 'destroy']);
        Route::post('agents/{agent}/inactive', [AgentController::class, 'markInactive']);
        Route::post('agents/{agent}/soft-delete', [AgentController::class, 'softDelete']);

        // Liquid State Tasks Mutation/Workflow
        Route::get('tasks/pending', [TaskController::class, 'pending']);
        Route::post('tasks', [TaskController::class, 'store']);
        Route::patch('tasks/{task}/status', [TaskController::class, 'updateStatus']);
        Route::post('tasks/{task}/content', [TaskController::class, 'submitContent']);
        Route::post('tasks/{task}/logs', [TaskController::class, 'log']);
        Route::post('tasks/{task}/sign', [TaskController::class, 'sign']);
    });
});
