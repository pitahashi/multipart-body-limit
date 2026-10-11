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

The development server runs at `http://127.0.0.1:5184`. The port is fixed with
`--strictPort`, so startup fails if another process is already using it.

In another terminal, from this directory:

```sh
pnpm probe
```

To use a different running PoC server:

```sh
node probe.mjs http://127.0.0.1:5185
```

The probe sends 20 requests to `/api/echo`: four ASCII message sizes for each of
four content types, followed by four valid, uncompressed 24-bit BMP uploads.
Each output line is JSON containing the message or image size, complete request
body size, HTTP status, and response.

It exits with code 0 when every request returns HTTP 200 with the expected byte
count (and file name and MIME type for images). It exits with code 1 when any
response fails these checks. Exit code 1 is expected while reproducing the bug;
connection failures also cause a nonzero exit, so check the reported responses.

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

Verified locally on 2026-10-12 with Node.js 24.21.0 using this project's installed
dependencies and the development configuration in `vite.config.ts`.

| Content type | 512 KiB message | 1 MiB − 1 byte message | 1 MiB + 1 byte message | 2 MiB message |
| --- | --- | --- | --- | --- |
| multipart/form-data | 200 | 413 | 413 | 413 |
| application/json | 200 | 200 | 200 | 200 |
| text/plain | 200 | 200 | 200 | 200 |
| application/x-www-form-urlencoded | 200 | 200 | 200 | 200 |

For the multipart case, the 2 MiB message produced a 2,097,278-byte body.
A 1,048,575-byte message produced a 1,048,701-byte body and also returned 413.
All successful cases returned `reached: true` and the full message byte count.

The image uploads returned:

| File name | Image bytes | Complete body bytes | HTTP status |
| --- | --- | --- | --- |
| image-682.bmp | 523,830 | 524,005 | 200 |
| image-1365.bmp | 1,048,374 | 1,048,550 | 200 |
| image-1366.bmp | 1,049,142 | 1,049,318 | 413 |
| image-2730.bmp | 2,096,694 | 2,096,870 | 413 |

Successful image responses returned `reached: true`, the full image byte count,
the original file name, and `image/bmp`. All 413 responses contained
`Payload Too Large`. The complete probe exited with code 1.

## Scope

Uses vinext 1.1.0, Vite 8.3.0, and the Cloudflare Vite plugin, matching the original
development setup. Production deployment has not been tested.
Next.js verification is not included in this PoC.
The Route Handler selects the correct parser for each content type so JSON and
plain text can be compared without unrelated form parsing errors.
