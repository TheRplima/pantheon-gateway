<?php

namespace App\Logging;

use Monolog\Handler\AbstractProcessingHandler;
use Monolog\LogRecord;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;

class DatabaseLoggingHandler extends AbstractProcessingHandler
{
    /**
     * Write the log record to the database.
     */
    protected function write(LogRecord $record): void
    {
        $context = $record->context;
        
        // Extract correlation ID from request if available, or from context
        $correlationId = $context['correlation_id'] ?? Request::get('correlation_id');
        
        // Ensure context is JSON serializable
        $contextData = json_encode($context);

        DB::table('execution_logs')->insert([
            'task_id' => $context['task_id'] ?? null,
            'agent_id' => $context['agent_id'] ?? null,
            'correlation_id' => $correlationId,
            'level_name' => $record->level->getName(),
            'message' => $record->message,
            'context' => $contextData,
            'created_at' => $record->datetime->format('Y-m-d H:i:sP'), // PostgreSQL compatible timestamp
        ]);
    }
}
