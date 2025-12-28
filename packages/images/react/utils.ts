export const dataUrlToBuffer = (dataUrl: string) => {
  const buffer = Buffer.from(dataUrl.split(",")[1]!, "base64");
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
};
