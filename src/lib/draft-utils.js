export const PLAYER_ROLE_TO_SLOT_FIELD = {
  top: "topPlayerId",
  jungle: "junglePlayerId",
  mid: "midPlayerId",
  bot: "botPlayerId",
  support: "supportPlayerId",
};

export const DRAFTABLE_PLAYER_ROLES = new Set(
  Object.keys(PLAYER_ROLE_TO_SLOT_FIELD),
);

export const ROSTER_SLOT_COUNT = 6;

export const TEAM_ROSTER_INCLUDE = {
  teams: {
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      userId: true,
      topPlayerId: true,
      junglePlayerId: true,
      midPlayerId: true,
      botPlayerId: true,
      supportPlayerId: true,
      defenseOrgId: true,
      topPlayer: {
        select: {
          id: true,
          name: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      junglePlayer: {
        select: {
          id: true,
          name: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      midPlayer: {
        select: {
          id: true,
          name: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      botPlayer: {
        select: {
          id: true,
          name: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      supportPlayer: {
        select: {
          id: true,
          name: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      defenseOrg: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

function formatPlayerAsset(player) {
  if (!player) {
    return null;
  }

  return {
    id: player.id,
    name: player.name,
    role: player.role,
    organization: player.organization,
  };
}

function formatDefenseAsset(organization) {
  if (!organization) {
    return null;
  }

  return {
    id: organization.id,
    name: organization.name,
  };
}

export function formatTeamDraftRoster(team) {
  return {
    id: team.id,
    name: team.name,
    roster: {
      top: formatPlayerAsset(team.topPlayer),
      jungle: formatPlayerAsset(team.junglePlayer),
      mid: formatPlayerAsset(team.midPlayer),
      bot: formatPlayerAsset(team.botPlayer),
      support: formatPlayerAsset(team.supportPlayer),
      defense: formatDefenseAsset(team.defenseOrg),
    },
  };
}

export function getSnakeTeamId(draftOrderEntries, round, pickInRound) {
  const teamCount = draftOrderEntries.length;
  const index = round % 2 === 1 ? pickInRound - 1 : teamCount - pickInRound;
  return draftOrderEntries[index].teamId;
}

export function buildDraftState(league) {
  return {
    leagueId: league.id,
    draftType: league.draftType,
    draftStartedAt: league.draftStartedAt,
    isDrafted: league.isDrafted,
    currentRound: league.currentRound,
    currentPickNumber: league.currentPickNumber,
    currentTeamOnClock: league.currentTeamOnClock
      ? {
          id: league.currentTeamOnClock.id,
          name: league.currentTeamOnClock.name,
        }
      : null,
    draftOrder: league.draftOrderEntries.map((entry) => ({
      pickPosition: entry.pickPosition,
      team: entry.team,
    })),
    pickHistory: league.draftPicks
      ? league.draftPicks.map((pick) => ({
          id: pick.id,
          round: pick.round,
          overallPick: pick.overallPick,
          slot: pick.slot,
          team: pick.team,
          player: pick.player
            ? {
                id: pick.player.id,
                name: pick.player.name,
                role: pick.player.role,
                organization: pick.player.organization,
              }
            : null,
          organization: pick.organization ?? null,
          createdAt: pick.createdAt,
        }))
      : [],
  };
}
