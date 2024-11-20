// src/utils/random.ts
export function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

export function generateUUID(): string {
  const bytes = generateRandomBytes(16);

  // 按照 UUID 的格式填充
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // 设置 UUID 版本号为 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // 设置 UUID 变体为 RFC 4122

  // 转换为 UUID 字符串
  return [...bytes]
    .map((b, i) =>
      [4, 6, 8, 10].includes(i) ? `-${b.toString(16).padStart(2, '0')}` : b.toString(16).padStart(2, '0')
    )
    .join('');
}
