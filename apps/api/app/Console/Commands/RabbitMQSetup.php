<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class RabbitMQSetup extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rabbitmq:setup {--force : Skip confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Setup RabbitMQ infrastructure (VHost, Exchanges, Queues)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $mgmtUrl = config('rabbitmq.mgmt_url');
        $user = config('rabbitmq.mgmt_user');
        $pass = config('rabbitmq.mgmt_pass');
        $vhost = config('rabbitmq.vhost');

        $this->info("Starting RabbitMQ setup for VHost: {$vhost} at {$mgmtUrl}");

        if (!$this->option('force') && !$this->confirm('This will create exchanges and queues. Proceed?')) {
            return 1;
        }

        $http = Http::withBasicAuth($user, $pass)
            ->asJson()
            ->withOptions(['verify' => false]);

        // 1. Create VHost
        $this->comment("Creating VHost: {$vhost}...");
        $response = $http->withBody('{}', 'application/json')
            ->put("{$mgmtUrl}/api/vhosts/" . urlencode($vhost));
        if ($response->successful()) {
            $this->info("VHost created/verified.");
        } else {
            $this->error("Failed to create VHost: " . $response->body());
        }

        // 2. Create Exchange
        $exchange = 'pantheon.iatp';
        $this->comment("Creating Exchange: {$exchange}...");
        $response = $http->put("{$mgmtUrl}/api/exchanges/" . urlencode($vhost) . "/{$exchange}", [
            'type' => 'topic',
            'durable' => true,
            'auto_delete' => false,
            'internal' => false,
            'arguments' => [],
        ]);
        if ($response->successful()) {
            $this->info("Exchange created.");
        } else {
            $this->error("Failed to create Exchange: " . $response->body());
        }

        // 3. Create Queue (Generic tasks_wake_up for legacy or catch-all, but IATP uses per-agent)
        $queue = 'tasks_wake_up';
        $this->comment("Creating Queue: {$queue}...");
        $response = $http->put("{$mgmtUrl}/api/queues/" . urlencode($vhost) . "/{$queue}", [
            'durable' => true,
            'auto_delete' => false,
            'arguments' => [],
        ]);
        if ($response->successful()) {
            $this->info("Queue created.");
        } else {
            $this->error("Failed to create Queue: " . $response->body());
        }

        // 4. Create Binding (Catch-all for now, agents will have their own later)
        $this->comment("Creating Binding...");
        $response = $http->post("{$mgmtUrl}/api/bindings/" . urlencode($vhost) . "/e/{$exchange}/q/{$queue}", [
            'routing_key' => 'agent.#.wakeup',
            'arguments' => [],
        ]);
        if ($response->successful()) {
            $this->info("Binding created (Pattern: agent.#.wakeup).");
        } else {
            $this->error("Failed to create Binding: " . $response->body());
        }

        $this->info("RabbitMQ setup completed successfully.");
        return 0;
    }
}
