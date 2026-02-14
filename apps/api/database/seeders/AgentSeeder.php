<?php

namespace Database\Seeders;

use App\Models\Agent;
use Illuminate\Database\Seeder;

class AgentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Agent::updateOrCreate(['id' => 'nexus-01'], [
            'name' => 'Nexus Orchestrator',
            'role' => 'orchestrator',
            'is_active' => true,
            'capabilities' => ['orchestration', 'planning', 'delegation'],
            'metadata' => ['vibe' => 'professional', 'emoji' => '🧠'],
        ]);

        Agent::updateOrCreate(['id' => 'muse-01'], [
            'name' => 'Muse Researcher',
            'role' => 'service',
            'is_active' => true,
            'capabilities' => ['research', 'analysis'],
            'metadata' => ['vibe' => 'curious', 'emoji' => '🔍'],
        ]);
    }
}
