<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExampleResource extends JsonResource
{
    public function __construct(public readonly string $message)
    {
        parent::__construct(null);
    }

    /**
     * @return array<string, string>
     */
    public function toArray(Request $request): array
    {
        return [
            'message' => $this->message,
        ];
    }
}
