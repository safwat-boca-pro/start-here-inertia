# SOP: Creating a New API Endpoint

## Purpose
This SOP documents the process for adding a JSON API endpoint in this Laravel v13 application so that it is automatically documented by [`dedoc/scramble`](https://scramble.dedoc.co/) with zero manual OpenAPI annotation. Scramble infers the OpenAPI 3.1 schema by statically analyzing your `FormRequest` rules, controller return types, and API Resource properties — so a properly typed endpoint documents itself, and an untyped one silently produces incomplete docs. Every new API endpoint must follow this process.

## Prerequisites
- Familiarity with Laravel `FormRequest` classes and Eloquent API Resources
- Basic knowledge of the Pest testing framework
- `dedoc/scramble` already installed and configured (`config/scramble.php`, `bootstrap/app.php`'s `api:` routing key) — this was a one-time setup and should already exist in this repo

## Step-by-Step Process

### Step 1: Add the Route

Register the endpoint in `routes/api.php`. This file is wired to the `api` middleware group (stateless, no session/CSRF) via the `api:` key in `bootstrap/app.php` — never add JSON API routes to `routes/web.php`.

```php
<?php

use App\Http\Controllers\Api\ExampleController;
use Illuminate\Support\Facades\Route;

Route::get('example', [ExampleController::class, 'show'])->name('api.example');
```

### Step 2: Create the FormRequest (if the endpoint takes input)

Put it under `app/Http/Requests/Api/`. Scramble reads `rules()` to infer query parameters (for `GET`) or request body schema (for other verbs) — this is the single source of truth for both validation and documentation, so they can't drift apart.

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ExampleRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
```

No `authorize()` method is needed unless the endpoint requires custom authorization logic — omitting it defaults to `true`, matching this repo's existing `FormRequest` convention.

### Step 3: Create the API Resource

Put it under `app/Http/Resources/`. **Every property/value the resource returns must have a concrete type** — Scramble is a static-analysis tool that reads the `toArray()` method's source, not its runtime output, so a `mixed`-typed value (e.g. raw `$this->resource['key']` access on `JsonResource::$resource`, which is untyped) produces an untyped/`any` schema in the generated docs, even though the endpoint works fine at runtime.

```php
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
```

### Step 4: Create the Controller

Put it under `app/Http/Controllers/Api/`. Use an explicit return type (the Resource class, or `JsonResponse`), and a one-line PHPDoc summary — Scramble surfaces it as the operation's description in the docs UI.

```php
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
```

Prefer typed accessors like `$request->string(...)` over `$request->validated(...)` (untyped/`mixed`) — this repo runs `phpstan level: max`, and untyped values fail it.

### Step 5: Write Tests

Add a Pest feature test under `tests/Feature/Api/`. Test the endpoint's actual behavior with `getJson()`/`postJson()` (not `get()`/`post()` — see Common Issues below), and, for endpoints introducing a pattern Scramble might mis-infer, assert against the generated spec directly:

```php
<?php

use Dedoc\Scramble\Generator;

test('example endpoint returns a greeting', function () {
    $this->getJson('/api/example?name=Ada')
        ->assertOk()
        ->assertJsonPath('data.message', 'Hello, Ada!');
});

test('example endpoint is documented in the generated OpenAPI spec', function () {
    $spec = app(Generator::class)();

    expect($spec['paths'])->toHaveKey('/example');

    $parameters = collect($spec['paths']['/example']['get']['parameters'] ?? [])->pluck('name')->all();

    expect($parameters)->toContain('name');
});
```

`app(Generator::class)()` resolves Scramble's generator directly and calls it, bypassing HTTP and `/docs/api`'s access-restriction middleware entirely — no environment/Gate setup is needed to test the generated spec.

### Step 6: Regenerate Frontend Types

```bash
php artisan wayfinder:generate
```

This gives the React frontend typed route/request helpers under `resources/js/wayfinder/`. That directory is gitignored — never commit it.

### Step 7: Verify in the Docs UI

```bash
composer dev   # or: php artisan serve + npm run dev
```

Visit `/docs/api` locally and confirm the new operation appears with the correct parameters and response shape, **before opening a PR**. This only works with `APP_ENV=local` (the default in local dev) or an explicit `viewApiDocs` Gate — see Common Issues below. Note the UI is [Stoplight Elements](https://docs.stoplight.io/docs/elements), not Swagger UI, despite Scramble being an "OpenAPI/Swagger" tool.

### Step 8: Format and Test

```bash
vendor/bin/pint --dirty --format agent
php artisan test --filter=ExampleTest
composer test   # full suite, run before merging
```

## File Reference

| File Type | Location | Purpose |
|-----------|----------|---------|
| Route | `routes/api.php` | Registers the endpoint under the `api` middleware group |
| Controller | `app/Http/Controllers/Api/ExampleController.php` | Handles the request, returns a Resource |
| FormRequest | `app/Http/Requests/Api/ExampleRequest.php` | Validates input; source of Scramble's parameter docs |
| API Resource | `app/Http/Resources/ExampleResource.php` | Shapes the JSON response; source of Scramble's response schema |
| Feature Test | `tests/Feature/Api/ExampleTest.php` | HTTP behavior + generated-spec assertions |
| Scramble config | `config/scramble.php` | Documented route prefix, docs access restriction, UI theme |

## Testing Checklist

- [ ] `declare(strict_types=1);` in every new PHP file
- [ ] Controller method has an explicit return type and a PHPDoc summary
- [ ] `FormRequest::rules()` covers every accepted input
- [ ] API Resource returns concretely-typed values (no raw `$this->resource[...]` array access)
- [ ] Route registered in `routes/api.php`, confirmed via `php artisan route:list --path=api`
- [ ] Endpoint verified at `/docs/api` locally — parameters and response shape look correct
- [ ] `php artisan wayfinder:generate` run locally (not committed)
- [ ] `./vendor/bin/phpstan analyze` and `vendor/bin/pint --dirty --format agent` pass
- [ ] New tests pass; full `composer test` passes

## Common Issues & Solutions

### Issue: Endpoint returns a 302 redirect instead of JSON on invalid input
**Solution**: Use Pest's `getJson()`/`postJson()` helpers (or send an `Accept: application/json` header). A plain `get()`/`post()` against a failed `FormRequest` gets Laravel's default redirect-back-with-errors behavior, even on an API route.

### Issue: New route doesn't show up at `/docs/api`
**Solution**: Confirm it's registered under the documented prefix with `php artisan route:list --path=api` — Scramble only documents routes matching `config('scramble.api_path')` (default `'api'`).

### Issue: Response schema in the docs shows as untyped/`any`
**Solution**: The API Resource's `toArray()` is reading or returning an untyped (`mixed`) value somewhere. Type the underlying property or variable concretely — Scramble infers schemas from static types, not runtime values.

### Issue: `/docs/api` returns 403
**Solution**: Check `APP_ENV` — Scramble's `RestrictedDocsAccess` middleware only allows access when the app is running in the `local` environment, or when a `viewApiDocs` Gate is explicitly defined and passes.

## Best Practices

### Security
- No authentication middleware is applied by default — add it deliberately per-endpoint (e.g. `auth:sanctum` once Sanctum is installed, or the `auth` session guard if the endpoint is meant for the Inertia app itself) rather than assuming a default.
- This starter kit intentionally ships without Sanctum/API token auth and without an API versioning scheme (beyond `config('scramble.info.version')`, set via the `API_VERSION` env var) — add either only when the project actually needs it.

### Code Structure
- Keep `FormRequest::rules()` as the single source of truth for validation — Scramble's inferred docs and the actual runtime validation then can never drift apart.
- Prefer PHPDoc summaries on controller methods for any operation whose behavior isn't obvious from its name — Scramble renders them as the operation description in the docs UI.
- Always use `declare(strict_types=1);` and explicit return types, matching the rest of this codebase.

### Testing Strategy
- Test the endpoint's actual HTTP behavior first; only add a generated-spec assertion (`app(Generator::class)()`) when the endpoint introduces a pattern Scramble might not infer correctly on its own.

## Related Documentation

- [`/CLAUDE.md`](../../CLAUDE.md) - Overall project guidelines
- [`.ai/rules/api-documentation.md`](../../.ai/rules/api-documentation.md) - Enforced rule for files under `routes/api.php`, `app/Http/Controllers/Api/**`, `app/Http/Requests/Api/**`, `app/Http/Resources/**`
