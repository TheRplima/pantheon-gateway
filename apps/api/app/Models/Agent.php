<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Agent extends Authenticatable implements JWTSubject
{
    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'id',
        'name',
        'role',
        'is_active',
        'capabilities',
        'metadata',
        'last_seen_at',
    ];

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role,
        ];
    }


    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'capabilities' => 'array',
        'metadata' => 'array',
        'last_seen_at' => 'datetime',
    ];
}
