/**
 * Compress an image in the browser before uploading it.
 *
 * Cloudinary also transforms avatars, but doing this first keeps uploads fast
 * on mobile data and avoids sending a 4-5 MB camera photo when a 200 KB image
 * is all the UI needs.
 */
export async function compressImage(
  file,
  { maxSize = 1024, quality = 0.82, type = "image/jpeg" } = {},
) {
  if (!file) throw new Error("Choose an image first.");
  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Choose a JPG, PNG or WEBP image.");
  }

  const bitmap = await loadBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height) || maxSize;
  const scale = Math.min(1, maxSize / longest);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("This browser cannot compress images.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === "function") bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not compress that image."))),
      type,
      quality,
    );
  });

  const baseName = String(file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
  const extension = type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${baseName}.${extension}`, {
    type,
    lastModified: Date.now(),
  });
}

function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadImage(file));
  }
  return loadImage(file);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be opened."));
    };
    image.src = url;
  });
}
