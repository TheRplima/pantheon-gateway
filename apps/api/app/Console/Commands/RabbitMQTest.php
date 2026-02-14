<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class RabbitMQTest extends Command
{
    protected $signature = 'rabbitmq:test';
    protected $description = 'Test RabbitMQ connectivity and publish a message';

    public function handle()
    {
        $host = config('rabbitmq.host');
        $port = (int) config('rabbitmq.port');
        $user = config('rabbitmq.user');
        $pass = config('rabbitmq.pass');
        $vhost = config('rabbitmq.vhost');

        $this->info("Connecting to RabbitMQ at {$host}:{$port} (VHost: {$vhost})...");

        try {
            $connection = new AMQPStreamConnection($host, $port, $user, $pass, $vhost);
            $channel = $connection->channel();

            $this->info("Connected successfully!");

            $exchange = 'pantheon.iatp';
            $queue = 'tasks_wake_up';
            $routingKey = 'agent.nexus.wakeup';

            $this->comment("Declaring exchange: {$exchange}...");
            $channel->exchange_declare($exchange, 'topic', false, true, false);

            $this->comment("Declaring queue: {$queue}...");
            $channel->queue_declare($queue, false, true, false, false);

            $this->comment("Binding queue to exchange (pattern: agent.#.wakeup)...");
            $channel->queue_bind($queue, $exchange, 'agent.#.wakeup');

            $msg = new AMQPMessage(json_encode([
                'message_id' => (string) str()->uuid(),
                'correlation_id' => (string) str()->uuid(),
                'timestamp' => now()->toIso8601String(),
                'sender_id' => 'pantheon-control-panel-test',
                'action' => 'WAKE_UP',
                'payload' => [
                    'task_id' => (string) str()->uuid(),
                    'priority' => 3,
                    'requires_attention' => true
                ],
                'trace_chain' => ['pantheon-control-panel-test']
            ]));

            $channel->basic_publish($msg, $exchange, $routingKey);
            $this->info("Test message published to {$exchange} with routing key {$routingKey}");

            $channel->close();
            $connection->close();

            return 0;
        } catch (\Exception $e) {
            $this->error("Connection failed: " . $e->getMessage());
            return 1;
        }
    }
}
