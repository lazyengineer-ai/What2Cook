const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function generateInviteCode(): string {
  const randomValues = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(randomValues);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[randomValues[i]! % CODE_CHARS.length];
  }
  return code;
}

export function normalizeInviteCode(input: string): string {
  return input.replace(/\s/g, "").toUpperCase();
}

export async function generateUniqueInviteCode(
  exists: (code: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateInviteCode();
    if (!(await exists(code))) return code;
  }
  throw new Error("Failed to generate unique invite code");
}
