import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  buildDraftState,
  DRAFTABLE_PLAYER_ROLES,
  formatTeamDraftRoster,
  getSnakeTeamId,
  PLAYER_ROLE_TO_SLOT_FIELD,
  ROSTER_SLOT_COUNT,
  TEAM_ROSTER_INCLUDE,
} from "../lib/draft-utils.js";
import { getLeagueMembership, shuffle } from "../lib/league-utils.js";

const router = Router();

const DRAFT_PICK_INCLUDE = {
  draftPicks: {
    orderBy: {
      overallPick: "asc",
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      player: {
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
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

router.post("/:leagueId/draft/start", requireAuth, async (req, res) => {
  try {
    const { leagueId } = req.params;

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
    });

    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }

    if (league.commissionerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Only the commissioner can start the draft" });
    }

    if (league.draftType !== "snake") {
      return res
        .status(400)
        .json({ error: "Only snake leagues can start a draft" });
    }

    if (league.draftStartedAt) {
      return res.status(409).json({ error: "Draft has already started" });
    }

    if (league.teams.length !== league.leagueSize) {
      return res.status(400).json({
        error: `Draft requires exactly ${league.leagueSize} teams before starting`,
      });
    }

    const randomizedTeams = shuffle(league.teams);

    const updatedLeague = await prisma.$transaction(async (tx) => {
      await tx.draftOrderEntry.deleteMany({
        where: { leagueId: league.id },
      });

      await tx.draftPick.deleteMany({
        where: { leagueId: league.id },
      });

      await tx.draftOrderEntry.createMany({
        data: randomizedTeams.map((team, index) => ({
          leagueId: league.id,
          teamId: team.id,
          pickPosition: index + 1,
        })),
      });

      return tx.league.update({
        where: { id: league.id },
        data: {
          isDrafted: false,
          draftStartedAt: new Date(),
          currentRound: 1,
          currentPickNumber: 1,
          currentTeamOnClockId: randomizedTeams[0].id,
        },
        include: {
          currentTeamOnClock: {
            select: {
              id: true,
              name: true,
            },
          },
          draftOrderEntries: {
            orderBy: {
              pickPosition: "asc",
            },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          ...DRAFT_PICK_INCLUDE,
        },
      });
    });

    return res.json(buildDraftState(updatedLeague));
  } catch (error) {
    console.error("Failed to start draft:", error);
    return res.status(500).json({ error: "Failed to start draft" });
  }
});

router.get("/:leagueId/draft", requireAuth, async (req, res) => {
  try {
    const { leagueId } = req.params;

    const membership = await getLeagueMembership(leagueId, req.user.id);

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You do not have access to this league draft" });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        currentTeamOnClock: {
          select: {
            id: true,
            name: true,
          },
        },
        draftOrderEntries: {
          orderBy: {
            pickPosition: "asc",
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        ...DRAFT_PICK_INCLUDE,
      },
    });

    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }

    return res.json(buildDraftState(league));
  } catch (error) {
    console.error("Failed to fetch draft state:", error);
    return res.status(500).json({ error: "Failed to fetch draft state" });
  }
});

router.get("/:leagueId/draft/board", requireAuth, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const roleFilter = req.query.role?.toString().trim().toLowerCase();

    const membership = await getLeagueMembership(leagueId, req.user.id);

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You do not have access to this league draft board" });
    }

    if (roleFilter && !DRAFTABLE_PLAYER_ROLES.has(roleFilter)) {
      return res.status(400).json({ error: "Invalid role filter" });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        currentTeamOnClock: {
          select: {
            id: true,
            name: true,
          },
        },
        draftOrderEntries: {
          orderBy: {
            pickPosition: "asc",
          },
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        ...DRAFT_PICK_INCLUDE,
        ...TEAM_ROSTER_INCLUDE,
      },
    });

    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }

    const takenPlayerIds = new Set(
      league.teams
        .flatMap((team) => [
          team.topPlayerId,
          team.junglePlayerId,
          team.midPlayerId,
          team.botPlayerId,
          team.supportPlayerId,
        ])
        .filter(Boolean),
    );
    const takenDefenseIds = new Set(
      league.teams.map((team) => team.defenseOrgId).filter(Boolean),
    );

    const availablePlayers = await prisma.lckPlayer.findMany({
      where: {
        id: {
          notIn: [...takenPlayerIds],
        },
        ...(roleFilter ? { role: roleFilter } : {}),
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
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
    });

    const availableDefenses = await prisma.lckOrganization.findMany({
      where: {
        id: {
          notIn: [...takenDefenseIds],
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    });

    return res.json({
      draft: buildDraftState(league),
      teams: league.teams.map(formatTeamDraftRoster),
      availablePlayers,
      availableDefenses,
    });
  } catch (error) {
    console.error("Failed to fetch draft board:", error);
    return res.status(500).json({ error: "Failed to fetch draft board" });
  }
});

router.post("/:leagueId/draft/pick", requireAuth, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const playerId = req.body.playerId?.trim();
    const organizationId = req.body.organizationId?.trim();

    const membership = await getLeagueMembership(leagueId, req.user.id);

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You do not have access to this league draft" });
    }

    if ((!playerId && !organizationId) || (playerId && organizationId)) {
      return res.status(400).json({
        error: "Provide either playerId or organizationId for a draft pick",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const league = await tx.league.findUnique({
        where: { id: leagueId },
        include: {
          currentTeamOnClock: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
          draftOrderEntries: {
            orderBy: {
              pickPosition: "asc",
            },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  userId: true,
                },
              },
            },
          },
          ...TEAM_ROSTER_INCLUDE,
        },
      });

      if (!league) {
        return { status: 404, body: { error: "League not found" } };
      }

      if (league.draftType !== "snake") {
        return {
          status: 400,
          body: { error: "Only snake leagues use draft picks" },
        };
      }

      if (!league.draftStartedAt || !league.currentTeamOnClockId) {
        return { status: 400, body: { error: "Draft has not started" } };
      }

      if (league.isDrafted) {
        return { status: 409, body: { error: "Draft is already complete" } };
      }

      if (!league.currentTeamOnClock || league.currentTeamOnClock.userId !== req.user.id) {
        return { status: 403, body: { error: "It is not your turn to pick" } };
      }

      const currentTeam = league.teams.find(
        (team) => team.id === league.currentTeamOnClockId,
      );

      if (!currentTeam) {
        return {
          status: 500,
          body: { error: "Current draft team could not be found" },
        };
      }

      const updateData = {};
      let pickedAsset = null;
      let pickedSlot = null;
      let pickedPlayerId = null;
      let pickedOrganizationId = null;

      if (playerId) {
        const player = await tx.lckPlayer.findUnique({
          where: { id: playerId },
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
        });

        if (!player) {
          return { status: 404, body: { error: "Player not found" } };
        }

        const slotField = PLAYER_ROLE_TO_SLOT_FIELD[player.role];

        if (!slotField) {
          return {
            status: 400,
            body: { error: "That player role cannot be drafted" },
          };
        }

        if (currentTeam[slotField]) {
          return {
            status: 409,
            body: { error: `Your ${player.role} slot is already filled` },
          };
        }

        const existingPlayerTeam = league.teams.find(
          (team) => team.id !== currentTeam.id && team[slotField] === player.id,
        );

        if (existingPlayerTeam) {
          return {
            status: 409,
            body: { error: "That player is already drafted in this league" },
          };
        }

        updateData[slotField] = player.id;
        pickedAsset = player;
        pickedSlot = player.role;
        pickedPlayerId = player.id;
      } else {
        const organization = await tx.lckOrganization.findUnique({
          where: { id: organizationId },
          select: {
            id: true,
            name: true,
          },
        });

        if (!organization) {
          return { status: 404, body: { error: "Organization not found" } };
        }

        if (currentTeam.defenseOrgId) {
          return {
            status: 409,
            body: { error: "Your defense slot is already filled" },
          };
        }

        const existingDefenseTeam = league.teams.find(
          (team) => team.id !== currentTeam.id && team.defenseOrgId === organization.id,
        );

        if (existingDefenseTeam) {
          return {
            status: 409,
            body: { error: "That defense is already drafted in this league" },
          };
        }

        updateData.defenseOrgId = organization.id;
        pickedAsset = organization;
        pickedSlot = "defense";
        pickedOrganizationId = organization.id;
      }

      await tx.fantasyTeam.update({
        where: { id: currentTeam.id },
        data: updateData,
      });

      const currentOverallPick = league.currentPickNumber ?? 1;
      const currentRound = league.currentRound ?? 1;

      await tx.draftPick.create({
        data: {
          leagueId: league.id,
          teamId: currentTeam.id,
          round: currentRound,
          overallPick: currentOverallPick,
          slot: pickedSlot,
          playerId: pickedPlayerId,
          organizationId: pickedOrganizationId,
        },
      });

      const teamCount = league.draftOrderEntries.length;
      const totalPicks = teamCount * ROSTER_SLOT_COUNT;
      const filledSlotCount =
        league.teams
          .flatMap((team) => [
            team.topPlayerId,
            team.junglePlayerId,
            team.midPlayerId,
            team.botPlayerId,
            team.supportPlayerId,
            team.defenseOrgId,
          ])
          .filter(Boolean).length + 1;
      const nextPickNumber = currentOverallPick + 1;
      let leagueUpdate;

      if (filledSlotCount >= totalPicks) {
        leagueUpdate = {
          isDrafted: true,
          currentPickNumber: totalPicks,
          currentRound: Math.ceil(totalPicks / teamCount),
          currentTeamOnClockId: null,
        };
      } else {
        const nextRound = Math.floor((nextPickNumber - 1) / teamCount) + 1;
        const pickInRound = ((nextPickNumber - 1) % teamCount) + 1;
        const nextTeamId = getSnakeTeamId(
          league.draftOrderEntries,
          nextRound,
          pickInRound,
        );

        leagueUpdate = {
          currentPickNumber: nextPickNumber,
          currentRound: nextRound,
          currentTeamOnClockId: nextTeamId,
        };
      }

      const updatedLeague = await tx.league.update({
        where: { id: league.id },
        data: leagueUpdate,
        include: {
          currentTeamOnClock: {
            select: {
              id: true,
              name: true,
            },
          },
          draftOrderEntries: {
            orderBy: {
              pickPosition: "asc",
            },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          ...DRAFT_PICK_INCLUDE,
          ...TEAM_ROSTER_INCLUDE,
        },
      });

      return {
        status: 200,
        body: {
          pick: {
            teamId: currentTeam.id,
            teamName: currentTeam.name,
            slot: pickedSlot,
            asset: pickedAsset,
          },
          draft: buildDraftState(updatedLeague),
          teams: updatedLeague.teams.map(formatTeamDraftRoster),
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Failed to make draft pick:", error);
    return res.status(500).json({ error: "Failed to make draft pick" });
  }
});

export default router;
