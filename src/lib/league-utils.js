import { prisma } from "./prisma.js";

export const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const VALID_DRAFT_TYPES = new Set(["snake", "manual"]);

export function shuffle(items) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function normalizeInviteCode(inviteCode) {
  return inviteCode?.trim().toUpperCase();
}

function generateInviteCode() {
  let code = "";

  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_CHARSET.length);
    code += INVITE_CODE_CHARSET[randomIndex];
  }

  return code;
}

export async function createUniqueInviteCode() {
  while (true) {
    const inviteCode = generateInviteCode();
    const existingLeague = await prisma.league.findUnique({
      where: { inviteCode },
    });

    if (!existingLeague) {
      return inviteCode;
    }
  }
}

export async function getLeagueMembership(leagueId, userId) {
  return prisma.fantasyTeam.findFirst({
    where: {
      leagueId,
      userId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}
