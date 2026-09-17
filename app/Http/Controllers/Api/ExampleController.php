<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ExampleRequest;
use App\Http\Resources\ExampleResource;

class ExampleController extends Controller
{
    /**
     * Return an example greeting, demonstrating the OpenAPI documentation pipeline.
     */
    public function show(ExampleRequest $request): ExampleResource
    {
        return new ExampleResource(
            message: sprintf('Hello, %s!', $request->string('name', 'World')->toString()),
        );
    }
}
