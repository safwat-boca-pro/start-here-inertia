---
paths:
    - routes/api.php
    - 'app/Http/Controllers/Api/**'
    - 'app/Http/Requests/Api/**'
    - 'app/Http/Resources/**'
---

# API Documentation

## New API endpoints must be Scramble-inferable and SOP-followed
Any new route in `routes/api.php` must use a typed `FormRequest` (for validation) and
return an explicit `JsonResponse` or API `Resource` type with concretely-typed values —
`dedoc/scramble` infers the OpenAPI schema from these via static analysis, and untyped
(`mixed`) values produce an untyped schema. Add a one-line PHPDoc summary on the
controller method for non-obvious operations. Follow
`docs/development-sops/create-api-endpoint.md` and verify the endpoint at `/docs/api`
locally (requires `APP_ENV=local`) before merging.
