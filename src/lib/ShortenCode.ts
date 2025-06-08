function shortenCode(code: string): string {
  // 入力検証
  if (!/^[a-z0-9]{8}$/.test(code)) {
    throw new Error("入力は8桁の英小文字と数字である必要があります");
  }

  // 36進数として解釈して数値に変換
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

  // 62進数の文字セット (a-z, A-Z, 0-9)
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // 62進数に変換
  if (num === 0n) return "a";

  let result = "";
  while (num > 0n) {
    result = chars[Number(num % 62n)] + result;
    num = num / 62n;
  }

  return result;
}

/**
 * 短縮されたコードを元の8桁コードに復元する関数
 */
function restoreCode(shortCode: string): string {
  // 入力検証
  if (!/^[a-zA-Z0-9]+$/.test(shortCode)) {
    throw new Error("不正な短縮コードです");
  }

  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // 62進数として解釈して数値に変換
  let num = 0n;
  for (const char of shortCode) {
    const index = chars.indexOf(char);
    if (index === -1) {
      throw new Error("不正な文字が含まれています");
    }
    num = num * 62n + BigInt(index);
  }

  // 36進数の文字セット
  const originalChars = "0123456789abcdefghijklmnopqrstuvwxyz";

  // 36進数に変換（8桁にパディング）
  let result = "";
  for (let i = 0; i < 8; i++) {
    result = originalChars[Number(num % 36n)] + result;
    num = num / 36n;
  }

  return result;
}

export default { shortenCode, restoreCode };
