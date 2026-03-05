import { SignJWT, jwtVerify } from "jose";

interface Sessao {
  funcionario_id: string;
  nome: string;
  cpf: string;
  criadaEm: number;
}

const SESSION_TTL = "8h";
const JWT_ISSUER = "portal-colaborador";
const JWT_AUDIENCE = "portal-colaborador";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado no .env.local");
  return new TextEncoder().encode(secret);
}

export async function criarSessao(funcionario_id: string, nome: string, cpf: string): Promise<string> {
  return await new SignJWT({ sub: funcionario_id, nome, cpf })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(SESSION_TTL)
    .setJti(crypto.randomUUID())
    .sign(getSecretKey());
}

export async function validarSessao(token: string): Promise<Sessao | null> {
  if (!token || typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });
    if (!payload.sub || !payload.nome || !payload.cpf) return null;
    return {
      funcionario_id: payload.sub,
      nome: payload.nome as string,
      cpf: payload.cpf as string,
      criadaEm: (payload.iat ?? 0) * 1000,
    };
  } catch {
    return null;
  }
}

export function invalidarSessao(_token: string): void {
  // Stateless JWT — logout via remoção do cookie
}
