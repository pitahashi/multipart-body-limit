const url = new URL("/api/echo", process.argv[2] ?? "http://127.0.0.1:5184");
const limit = 1024 * 1024;
let unexpected = false;

// Compare ASCII messages across content types.
for (const kind of ["multipart", "json", "text", "urlencoded"]) {
  for (const size of [512 * 1024, limit - 1, limit + 1, 2 * limit]) {
    const message = "a".repeat(size);
    const headers = {};
    let body;
    if (kind === "multipart") {
      body = new FormData();
      body.append("message", message);
    } else if (kind === "json") {
      headers["content-type"] = "application/json";
      body = JSON.stringify({ message });
    } else if (kind === "urlencoded") {
      headers["content-type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams({ message });
    } else {
      headers["content-type"] = "text/plain";
      body = message;
    }
    const request = new Request(url, { method: "POST", headers, body });
    const bytes = await request.arrayBuffer();
    const response = await fetch(url, {
      method: "POST", headers: request.headers, body: bytes,
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.text();
    console.log(JSON.stringify({ kind, messageBytes: size, bodyBytes: bytes.byteLength, status: response.status, response: result }));
    if (response.status !== 200) unexpected = true;
    else {
      const parsed = JSON.parse(result);
      if (parsed.reached !== true || parsed.messageBytes !== size) unexpected = true;
    }
  }
}

// Valid, uncompressed 24-bit BMPs. At width 256 each row is 768 bytes,
// so heights 1365 and 1366 straddle 1 MiB, including the 54-byte header.
for (const height of [682, 1365, 1366, 2730]) {
  const width = 256;
  const pixelBytes = width * 3 * height;
  const image = Buffer.alloc(54 + pixelBytes);
  image.write("BM");
  image.writeUInt32LE(image.length, 2);
  image.writeUInt32LE(54, 10);
  image.writeUInt32LE(40, 14);
  image.writeInt32LE(width, 18);
  image.writeInt32LE(height, 22);
  image.writeUInt16LE(1, 26);
  image.writeUInt16LE(24, 28);
  image.writeUInt32LE(pixelBytes, 34);

  const name = `image-${height}.bmp`;
  const type = "image/bmp";
  const body = new FormData();
  body.append("image", new Blob([image], { type }), name);
  const request = new Request(url, { method: "POST", body });
  const bytes = await request.arrayBuffer();
  const response = await fetch(url, {
    method: "POST", headers: request.headers, body: bytes,
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.text();
  console.log(JSON.stringify({ kind: "multipart-image", imageBytes: image.length, bodyBytes: bytes.byteLength, status: response.status, response: result }));
  if (response.status !== 200) unexpected = true;
  else {
    const parsed = JSON.parse(result);
    if (parsed.reached !== true || parsed.imageBytes !== image.length ||
        parsed.imageType !== type || parsed.imageName !== name) unexpected = true;
  }
}
// Exit 1 when the expected successful Route Handler behavior is violated.
process.exitCode = unexpected ? 1 : 0;
