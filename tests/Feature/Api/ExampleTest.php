<?php

use Dedoc\Scramble\Generator;

test('example endpoint returns a greeting', function () {
    $this->getJson('/api/example?name=Ada')
        ->assertOk()
        ->assertJsonPath('data.message', 'Hello, Ada!');
});

test('example endpoint defaults the name when omitted', function () {
    $this->getJson('/api/example')
        ->assertOk()
        ->assertJsonPath('data.message', 'Hello, World!');
});

test('example endpoint is documented in the generated OpenAPI spec', function () {
    $spec = app(Generator::class)();

    expect($spec['paths'])->toHaveKey('/example');

    $parameters = collect($spec['paths']['/example']['get']['parameters'] ?? [])->pluck('name')->all();

    expect($parameters)->toContain('name');
});
