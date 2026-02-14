<?php

namespace App\Services;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class WakeUpPublisher
{
    protected $connection;
    protected $channel;

    public function __construct()
    {
        // Connection params from .env
        $host = env('RABBITMQ_HOST', 'rabbitmq');
        $port = env('RABBITMQ_PORT', 5672);
        $user = env('RABBITMQ_USER', 'guest');
        $pass = env('RABBITMQ_PASSWORD', 'guest');
        $vhost = env('RABBITMQ_VHOST', 'pantheon');

        try {
            if (class_exists(AMQPStreamConnection::class)) {
                $this->connection = new AMQPStreamConnection($host, $port, $user, $pass, $vhost);
                $this->channel = $this->connection->channel();
            }
        } catch (\Exception $e) {
            \Log::error("Failed to connect to RabbitMQ: " . $e->getMessage());
        }
    }

    /**
     * Publish a wake-up message for a task.
     *
     * @param string $taskId
     * @param string $action
     * @param array $payload
     * @return void
     */
    public function publish(string $taskId, string $action = 'WAKE_UP', array $payload = [])
    {
        if (!$this->channel) {
            \Log::warning("RabbitMQ channel not available. Skipping wake-up for task: {$taskId}");
            return;
        }

        // IATP v3.1 Contract Settings
        $exchange = 'pantheon.iatp';
        
        // Extract agent_id from task (assuming owner_agent is the one to wake up)
        // In a real scenario, you might want to pass the target agent ID explicitly.
        $task = \App\Models\Task::find($taskId);
        $agentId = $task ? $task->owner_agent : 'unknown';
        $routingKey = "agent.{$agentId}.wakeup";

        $messageData = [
            'message_id' => (string) str()->uuid(),
            'correlation_id' => (string) str()->uuid(), // Essential for IATP v3.1 tracing
            'timestamp' => now()->toIso8601String(),
            'sender_id' => 'pantheon-control-panel',
            'action' => $action,
            'payload' => array_merge([
                'task_id' => $taskId,
                'priority' => 3,
                'requires_attention' => true,
            ], $payload),
            'trace_chain' => ['pantheon-control-panel'],
        ];

        $msg = new AMQPMessage(
            json_encode($messageData),
            ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
        );

        $this->channel->basic_publish($msg, $exchange, $routingKey);
        
        \Log::info("IATP v3.1 Message Published: {$routingKey}", ['message_id' => $messageData['message_id']]);
    }

    public function __destruct()
    {
        if ($this->channel) {
            $this->channel->close();
        }
        if ($this->connection) {
            $this->connection->close();
        }
    }
}
