# vinext multipart Route Handler body limit PoC

This standalone project reproduces a 413 response for ordinary multipart POST
requests whose complete body exceeds 1 MiB (1,048,576 bytes) in vinext 1.1.0.
No Server Actions are used. The probe tests ASCII text fields and BMP image uploads.

## Run

Requires Node.js compatible with Vite 8 and pnpm 12.6.0.

```sh
pnpm install
pnpm dev
```

In another terminal, from this directory:

```sh
pnpm probe
```

To use a different running PoC server:

```sh
node probe.mjs http://localhost:5184
```

The probe reports message or image size, complete request body size, HTTP status,
and response. Image cases upload valid 24-bit BMP files of 523,830, 1,048,374,
1,049,142, and 2,096,694 bytes, covering sizes below and above 1 MiB.
It exits with code 1 when any request fails to return the expected successful echo.
This is intentional while reproducing the bug.

## Expected behavior

All requests reach `app/api/echo/route.ts`, return HTTP 200, and report the full
message or image size. Image responses also report the file name and MIME type.
The Server Actions body limit should not reject ordinary Route Handler requests.

## Boundary detail

The multipart envelope adds bytes, so a message of 1 MiB minus one byte still
produces a request body larger than 1 MiB. The probe prints both sizes to avoid
confusing field size with request body size.
The image cases likewise print file size and complete body size separately.

## Verified results

Verified locally on 2026-10-12 with Node.js 24.21.0. Local validation reused the
parent project's installed dependencies, whose direct versions match package.json.

| Content type | 512 KiB message | 2 MiB message |
| --- | --- | --- |
| multipart/form-data | 200 | 413 Payload Too Large |
| application/json | 200 | 200 |
| text/plain | 200 | 200 |
| application/x-www-form-urlencoded | 200 | 200 |

For the multipart case, the 2 MiB message produced a 2,097,278-byte body.
A 1,048,575-byte message produced a 1,048,701-byte body and also returned 413.
All successful cases returned `reached: true` and the full message byte count.

## Scope

Uses vinext 1.1.0, Vite 8.3.0, and the Cloudflare Vite plugin, matching the original
development setup. Production deployment and Next.js itself have not been tested.
The Route Handler selects the correct parser for each content type so JSON and
plain text can be compared without unrelated form parsing errors.
