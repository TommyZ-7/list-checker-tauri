function shortenCode(code: string): string {
  if (!/^[a-z0-9]{8}$/.test(code)) {
    throw new Error("入力は8桁の英小文字と数字である必要があります");
  }

  let num = 0n;
  for (let i = 0; i < 8; i++) {
    const char = code[i];
    let digit: number;

    if (char >= "0" && char <= "9") {
      digit = char.charCodeAt(0) - "0".charCodeAt(0);
    } else {
      digit = char.charCodeAt(0) - "a".charCodeAt(0) + 10;
    }

    num = num * 36n + BigInt(digit);
  }

  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  if (num === 0n) return "a";

  let result = "";
  while (num > 0n) {
    result = chars[Number(num % 62n)] + result;
    num = num / 62n;
  }

  return result;
}

function restoreCode(shortCode: string): string {
  if (!/^[a-zA-Z0-9]+$/.test(shortCode)) {
    throw new Error("不正な短縮コードです");
  }

  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let num = 0n;
  for (const char of shortCode) {
    const index = chars.indexOf(char);
    if (index === -1) {
      throw new Error("不正な文字が含まれています");
    }
    num = num * 62n + BigInt(index);
  }

  const originalChars = "0123456789abcdefghijklmnopqrstuvwxyz";

  let result = "";
  for (let i = 0; i < 8; i++) {
    result = originalChars[Number(num % 36n)] + result;
    num = num / 36n;
  }

  return result;
}

export default { shortenCode, restoreCode };
