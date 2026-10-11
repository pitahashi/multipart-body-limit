export async function POST(request: Request) {
  console.log("PoC Route Handler reached", request.headers.get("content-type"));
  const contentType = request.headers.get("content-type") ?? "";
  let message: unknown;
  if (contentType.startsWith("multipart/form-data") ||
      contentType.startsWith("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const image = form.get("image");
    if (image !== null) {
      if (typeof image === "string") {
        return Response.json({ error: "Expected an image file" }, { status: 400 });
      }
      return Response.json({
        reached: true,
        imageBytes: image.size,
        imageType: image.type,
        imageName: image.name,
      });
    }
    message = form.get("message");
  } else if (contentType.startsWith("application/json")) {
    message = (await request.json()).message;
  } else {
    message = await request.text();
  }
  if (typeof message !== "string") {
    return Response.json({ error: "Expected a string message" }, { status: 400 });
  }
  return Response.json({ reached: true, messageBytes: new TextEncoder().encode(message).length });
}
