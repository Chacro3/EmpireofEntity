// Civilization Manager - Handles civilization data, upgrades, and age progression
class CivilizationManager {
  constructor(engine) {
    this.engine = engine;
    this.currentCivilization = null;
    this.civilizationData = {
      solari: {
        name: "Solari",
        color: "#FFD700", // Gold
        perks: {
          resourceGather: 1.2, // 20% faster resource gathering
          dayBonus: true, // Bonus during daytime
        },
        units: {
          villager: {
            stone: { hp: 50, dp: 5, ar: 5, cost: { food: 50 }, buildTime: 5 },
            bronze: { hp: 60, dp: 6, ar: 6, cost: { food: 75 }, buildTime: 6 },
            iron: { hp: 70, dp: 7, ar: 7, cost: { food: 100 }, buildTime: 7 },
            golden: { hp: 80, dp: 8, ar: 8, cost: { food: 125 }, buildTime: 8 },
            eternal: {
              hp: 90,
              dp: 9,
              ar: 9,
              cost: { food: 150 },
              buildTime: 9,
            },
          },
          spearman: {
            stone: {
              hp: 80,
              dp: 10,
              ar: 10,
              cost: { food: 60 },
              buildTime: 10,
              attackType: "piercing",
            },
            bronze: {
              hp: 100,
              dp: 12,
              ar: 15,
              cost: { food: 80 },
              buildTime: 12,
              attackType: "piercing",
            },
            iron: {
              hp: 120,
              dp: 14,
              ar: 20,
              cost: { food: 100, iron: 20 },
              buildTime: 14,
              attackType: "piercing",
            },
            golden: {
              hp: 150,
              dp: 16,
              ar: 25,
              cost: { food: 120, iron: 30 },
              buildTime: 16,
              attackType: "piercing",
            },
            eternal: {
              hp: 200,
              dp: 20,
              ar: 40,
              cost: { food: 150, iron: 50 },
              buildTime: 18,
              attackType: "piercing",
            },
          },
          archer: {
            bronze: {
              hp: 60,
              dp: 8,
              ar: 15,
              cost: { food: 50, wood: 30 },
              buildTime: 12,
              attackType: "piercing",
              attackRange: 100,
            },
            iron: {
              hp: 70,
              dp: 10,
              ar: 20,
              cost: { food: 60, wood: 40 },
              buildTime: 14,
              attackType: "piercing",
              attackRange: 110,
            },
            golden: {
              hp: 80,
              dp: 12,
              ar: 25,
              cost: { food: 70, wood: 50 },
              buildTime: 16,
              attackType: "piercing",
              attackRange: 120,
            },
            eternal: {
              hp: 150,
              dp: 18,
              ar: 45,
              cost: { food: 100, wood: 60, gold: 20 },
              buildTime: 18,
              attackType: "piercing",
              attackRange: 150,
            },
          },
          cavalry: {
            iron: {
              hp: 120,
              dp: 15,
              ar: 20,
              cost: { food: 80, gold: 40 },
              buildTime: 16,
              attackType: "slashing",
            },
            golden: {
              hp: 150,
              dp: 20,
              ar: 30,
              cost: { food: 100, gold: 60 },
              buildTime: 18,
              attackType: "slashing",
            },
            eternal: {
              hp: 250,
              dp: 25,
              ar: 50,
              cost: { food: 120, gold: 80, iron: 30 },
              buildTime: 20,
              attackType: "slashing",
            },
          },
          knight: {
            golden: {
              hp: 150,
              dp: 20,
              ar: 30,
              cost: { food: 100, gold: 60, iron: 30 },
              buildTime: 20,
              attackType: "slashing",
            },
            eternal: {
              hp: 300,
              dp: 30,
              ar: 60,
              cost: { food: 120, gold: 80, iron: 50 },
              buildTime: 22,
              attackType: "slashing",
            },
          },
          guardian: {
            eternal: {
              hp: 350,
              dp: 35,
              ar: 70,
              cost: { food: 150, gold: 100, iron: 80 },
              buildTime: 25,
              attackType: "slashing",
            },
          },
          catapult: {
            iron: {
              hp: 100,
              dp: 5,
              ar: 50,
              cost: { wood: 300, iron: 150, gold: 50 },
              buildTime: 25,
              attackType: "blunt",
              attackRange: 150,
            },
            golden: {
              hp: 120,
              dp: 8,
              ar: 60,
              cost: { wood: 350, iron: 200, gold: 75 },
              buildTime: 27,
              attackType: "blunt",
              attackRange: 160,
            },
            eternal: {
              hp: 150,
              dp: 10,
              ar: 75,
              cost: { wood: 400, iron: 250, gold: 100 },
              buildTime: 30,
              attackType: "blunt",
              attackRange: 180,
            },
          },
          sun_king: {
            iron: {
              hp: 300,
              dp: 25,
              ar: 30,
              cost: { food: 500, gold: 200, iron: 100 },
              buildTime: 30,
              attackType: "slashing",
              abilityName: "Solar Flare",
              abilityCooldown: 60,
            },
            golden: {
              hp: 400,
              dp: 30,
              ar: 40,
              cost: { food: 500, gold: 200, iron: 100 },
              buildTime: 30,
              attackType: "slashing",
              abilityName: "Solar Flare",
              abilityCooldown: 60,
            },
            eternal: {
              hp: 500,
              dp: 40,
              ar: 50,
              cost: { food: 500, gold: 200, iron: 100 },
              buildTime: 30,
              attackType: "slashing",
              abilityName: "Solar Flare",
              abilityCooldown: 60,
            },
          },
          dawn_sage: {
            golden: {
              hp: 200,
              dp: 15,
              ar: 20,
              cost: { food: 400, gold: 300, iron: 150 },
              buildTime: 35,
              attackType: "piercing",
              attackRange: 120,
              abilityName: "Radiant Healing",
              abilityCooldown: 90,
            },
            eternal: {
              hp: 350,
              dp: 25,
              ar: 40,
              cost: { food: 400, gold: 300, iron: 150 },
              buildTime: 35,
              attackType: "piercing",
              attackRange: 120,
              abilityName: "Radiant Healing",
              abilityCooldown: 90,
            },
          },
        },
        buildings: {
          town_center: {
            stone: {
              hp: 1000,
              dp: 30,
              width: 80,
              height: 80,
              cost: { wood: 500, stone: 200 },
              buildTime: 60,
            },
            bronze: {
              hp: 1200,
              dp: 35,
              width: 80,
              height: 80,
              cost: { wood: 600, stone: 300 },
              buildTime: 70,
            },
            iron: {
              hp: 1400,
              dp: 40,
              width: 80,
              height: 80,
              cost: { wood: 700, stone: 400, iron: 100 },
              buildTime: 80,
            },
            golden: {
              hp: 1600,
              dp: 45,
              width: 80,
              height: 80,
              cost: { wood: 800, stone: 500, iron: 200 },
              buildTime: 90,
            },
            eternal: {
              hp: 2000,
              dp: 50,
              width: 80,
              height: 80,
              cost: { wood: 1000, stone: 600, iron: 300 },
              buildTime: 100,
            },
          },
          house: {
            stone: { hp: 200, dp: 10, cost: { wood: 100 }, buildTime: 15 },
            bronze: { hp: 250, dp: 15, cost: { wood: 120 }, buildTime: 18 },
            iron: {
              hp: 300,
              dp: 20,
              cost: { wood: 150, stone: 50 },
              buildTime: 21,
            },
            golden: {
              hp: 350,
              dp: 25,
              cost: { wood: 200, stone: 100 },
              buildTime: 24,
            },
            eternal: {
              hp: 400,
              dp: 30,
              cost: { wood: 250, stone: 150 },
              buildTime: 27,
            },
          },
          barracks: {
            stone: { hp: 300, dp: 15, cost: { wood: 200 }, buildTime: 25 },
            bronze: { hp: 350, dp: 20, cost: { wood: 240 }, buildTime: 30 },
            iron: {
              hp: 400,
              dp: 25,
              cost: { wood: 280, stone: 100 },
              buildTime: 35,
            },
            golden: {
              hp: 450,
              dp: 30,
              cost: { wood: 320, stone: 150 },
              buildTime: 40,
            },
            eternal: {
              hp: 500,
              dp: 35,
              cost: { wood: 350, stone: 200 },
              buildTime: 45,
            },
          },
          lumber_mill: {
            stone: {
              hp: 200,
              dp: 10,
              cost: { wood: 150 },
              buildTime: 20,
              produces: "wood",
              productionRate: 0.5,
            },
            bronze: {
              hp: 250,
              dp: 15,
              cost: { wood: 180 },
              buildTime: 24,
              produces: "wood",
              productionRate: 0.6,
            },
            iron: {
              hp: 300,
              dp: 20,
              cost: { wood: 220, stone: 80 },
              buildTime: 28,
              produces: "wood",
              productionRate: 0.7,
            },
            golden: {
              hp: 350,
              dp: 25,
              cost: { wood: 260, stone: 120 },
              buildTime: 32,
              produces: "wood",
              productionRate: 0.8,
            },
            eternal: {
              hp: 400,
              dp: 30,
              cost: { wood: 300, stone: 150 },
              buildTime: 36,
              produces: "wood",
              productionRate: 1.0,
            },
          },
          granary: {
            stone: {
              hp: 250,
              dp: 12,
              cost: { wood: 150 },
              buildTime: 20,
              produces: "food",
              productionRate: 0.5,
            },
            bronze: {
              hp: 300,
              dp: 17,
              cost: { wood: 180 },
              buildTime: 24,
              produces: "food",
              productionRate: 0.6,
            },
            iron: {
              hp: 350,
              dp: 22,
              cost: { wood: 220, stone: 80 },
              buildTime: 28,
              produces: "food",
              productionRate: 0.7,
            },
            golden: {
              hp: 400,
              dp: 27,
              cost: { wood: 260, stone: 120 },
              buildTime: 32,
              produces: "food",
              productionRate: 0.8,
            },
            eternal: {
              hp: 450,
              dp: 32,
              cost: { wood: 300, stone: 150 },
              buildTime: 36,
              produces: "food",
              productionRate: 1.0,
            },
          },
          market: {
            stone: {
              hp: 250,
              dp: 12,
              cost: { wood: 150, gold: 50 },
              buildTime: 20,
              produces: "gold",
              productionRate: 0.3,
            },
            bronze: {
              hp: 300,
              dp: 17,
              cost: { wood: 180, gold: 80 },
              buildTime: 24,
              produces: "gold",
              productionRate: 0.4,
            },
            iron: {
              hp: 350,
              dp: 22,
              cost: { wood: 220, stone: 80, gold: 120 },
              buildTime: 28,
              produces: "gold",
              productionRate: 0.5,
            },
            golden: {
              hp: 400,
              dp: 27,
              cost: { wood: 260, stone: 120, gold: 150 },
              buildTime: 32,
              produces: "gold",
              productionRate: 0.6,
            },
            eternal: {
              hp: 450,
              dp: 32,
              cost: { wood: 300, stone: 150, gold: 200 },
              buildTime: 36,
              produces: "gold",
              productionRate: 0.8,
            },
          },
          temple: {
            stone: {
              hp: 400,
              dp: 20,
              cost: { wood: 200, gold: 100 },
              buildTime: 30,
            },
            bronze: {
              hp: 450,
              dp: 25,
              cost: { wood: 240, gold: 120 },
              buildTime: 35,
            },
            iron: {
              hp: 500,
              dp: 30,
              cost: { wood: 280, stone: 100, gold: 150 },
              buildTime: 40,
            },
            golden: {
              hp: 550,
              dp: 35,
              cost: { wood: 320, stone: 150, gold: 200 },
              buildTime: 45,
            },
            eternal: {
              hp: 600,
              dp: 40,
              cost: { wood: 350, stone: 200, gold: 250 },
              buildTime: 50,
            },
          },
          forge: {
            bronze: {
              hp: 350,
              dp: 18,
              cost: { wood: 200, stone: 100 },
              buildTime: 30,
            },
            iron: {
              hp: 400,
              dp: 23,
              cost: { wood: 240, stone: 140 },
              buildTime: 35,
              produces: "iron",
              productionRate: 0.3,
            },
            golden: {
              hp: 450,
              dp: 28,
              cost: { wood: 280, stone: 180 },
              buildTime: 40,
              produces: "iron",
              productionRate: 0.4,
            },
            eternal: {
              hp: 500,
              dp: 33,
              cost: { wood: 320, stone: 220 },
              buildTime: 45,
              produces: "iron",
              productionRate: 0.5,
            },
          },
          tower: {
            stone: {
              hp: 300,
              dp: 15,
              ar: 10,
              cost: { wood: 150, stone: 50 },
              buildTime: 30,
              attackType: "piercing",
              attackRange: 150,
            },
            bronze: {
              hp: 350,
              dp: 20,
              ar: 15,
              cost: { wood: 180, stone: 80 },
              buildTime: 35,
              attackType: "piercing",
              attackRange: 160,
            },
            iron: {
              hp: 400,
              dp: 25,
              ar: 20,
              cost: { wood: 220, stone: 120 },
              buildTime: 40,
              attackType: "piercing",
              attackRange: 170,
            },
            golden: {
              hp: 450,
              dp: 30,
              ar: 25,
              cost: { wood: 260, stone: 160 },
              buildTime: 45,
              attackType: "piercing",
              attackRange: 180,
            },
            eternal: {
              hp: 500,
              dp: 35,
              ar: 30,
              cost: { wood: 300, stone: 200 },
              buildTime: 50,
              attackType: "piercing",
              attackRange: 200,
            },
          },
          wall: {
            stone: { hp: 500, dp: 25, cost: { wood: 50 }, buildTime: 10 },
            bronze: {
              hp: 550,
              dp: 30,
              cost: { wood: 75, stone: 25 },
              buildTime: 12,
            },
            iron: {
              hp: 600,
              dp: 35,
              cost: { wood: 100, stone: 50 },
              buildTime: 14,
            },
            golden: {
              hp: 650,
              dp: 40,
              cost: { wood: 150, stone: 75, iron: 25 },
              buildTime: 16,
            },
            eternal: {
              hp: 700,
              dp: 45,
              cost: { wood: 200, stone: 100, iron: 50 },
              buildTime: 18,
            },
          },
        },
        wonder: {
          stone: {
            name: "Sun Pyramid",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 300,
          },
          bronze: {
            name: "Sun Pyramid",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 240,
          },
          iron: {
            name: "Sun Pyramid",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 180,
          },
          golden: {
            name: "Sun Pyramid",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 120,
          },
          eternal: {
            name: "Sun Pyramid",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 60,
          },
        },
        tech: {
          stone: [
            {
              name: "Solar Tools",
              effects: { resourceGather: 1.2 },
              cost: { wood: 100, food: 50 },
            },
            {
              name: "Sunlit Paths",
              effects: { villagerSpeed: 1.15 },
              cost: { wood: 80 },
            },
            {
              name: "Basic Masonry",
              effects: { buildingHP: 100 },
              cost: { wood: 150 },
            },
            {
              name: "Spear Sharpening",
              effects: { spearmanAR: 5 },
              cost: { food: 50 },
            },
            {
              name: "Trade Caravans",
              effects: { marketProduction: 1.1 },
              cost: { wood: 100, gold: 20 },
            },
          ],
          bronze: [
            {
              name: "Bronze Weapons",
              effects: { soldierAR: 10 },
              cost: { wood: 200, gold: 50 },
            },
            {
              name: "Sandstone Walls",
              effects: { wallHP: 200 },
              cost: { wood: 150, stone: 50 },
            },
            {
              name: "Irrigation",
              effects: { foodProduction: 1.25 },
              cost: { food: 200, wood: 100 },
            },
            {
              name: "Archery Drills",
              effects: { archerAR: 5 },
              cost: { food: 100, wood: 50 },
            },
            {
              name: "Camel Saddles",
              effects: { unlockCavalry: true },
              cost: { food: 150, gold: 50 },
            },
          ],
          iron: [
            {
              name: "Iron Forging",
              effects: { soldierAR: 15 },
              cost: { food: 300, iron: 100 },
            },
            {
              name: "Reinforced Towers",
              effects: { towerAR: 10 },
              cost: { wood: 200, stone: 100 },
            },
            {
              name: "Gold Refining",
              effects: { goldProduction: 1.2 },
              cost: { gold: 200, iron: 50 },
            },
            {
              name: "Solar Siege",
              effects: { unlockCatapult: true },
              cost: { wood: 400, iron: 150 },
            },
            {
              name: "Desert Logistics",
              effects: { unitCost: 0.9 },
              cost: { food: 300, gold: 100 },
            },
          ],
          golden: [
            {
              name: "Sunforged Armor",
              effects: { soldierHP: 50 },
              cost: { food: 400, iron: 200 },
            },
            {
              name: "Monumental Architecture",
              effects: { buildingHP: 300 },
              cost: { wood: 500, stone: 200 },
            },
            {
              name: "Trade Empire",
              effects: { goldProduction: 1.5 },
              cost: { gold: 300, iron: 100 },
            },
            {
              name: "Elite Training",
              effects: { knightAR: 10 },
              cost: { food: 300, gold: 150 },
            },
            {
              name: "Solar Beacons",
              effects: { towerRange: 20 },
              cost: { wood: 400, iron: 200 },
            },
          ],
          eternal: [
            {
              name: "Eternal Blades",
              effects: { soldierAR: 20 },
              cost: { food: 500, iron: 300 },
            },
            {
              name: "Solar Resonance",
              effects: { productionRate: 1.3 },
              cost: { wood: 600, gold: 400 },
            },
            {
              name: "Immortal Defenses",
              effects: { wallHP: 500, towerHP: 500 },
              cost: { stone: 800, iron: 200 },
            },
            {
              name: "Sunlit Precision",
              effects: { archerAR: 15, towerAR: 15 },
              cost: { gold: 400, iron: 200 },
            },
            {
              name: "Divine Favor",
              effects: { heroRegeneration: true },
              cost: { food: 500, gold: 300 },
            },
          ],
        },
        ageRequirements: {
          bronze: { wood: 500, food: 300 },
          iron: { wood: 800, food: 600, gold: 200 },
          golden: { wood: 1200, food: 1000, gold: 500, iron: 300 },
          eternal: {
            wood: 2000,
            food: 1500,
            gold: 1000,
            iron: 800,
            stone: 500,
          },
        },
      },
      lunari: {
        name: "Lunari",
        color: "#C0C0C0", // Silver
        perks: {
          soldierTrain: 1.25, // 25% faster soldier training
          nightBonus: true, // Bonus during nighttime
        },
        units: {
          villager: {
            stone: { hp: 50, dp: 5, ar: 5, cost: { food: 50 }, buildTime: 5 },
            bronze: { hp: 60, dp: 6, ar: 6, cost: { food: 75 }, buildTime: 6 },
            iron: { hp: 70, dp: 7, ar: 7, cost: { food: 100 }, buildTime: 7 },
            golden: { hp: 80, dp: 8, ar: 8, cost: { food: 125 }, buildTime: 8 },
            eternal: {
              hp: 90,
              dp: 9,
              ar: 9,
              cost: { food: 150 },
              buildTime: 9,
            },
          },
          skirmisher: {
            stone: {
              hp: 70,
              dp: 8,
              ar: 12,
              cost: { food: 60 },
              buildTime: 10,
              attackType: "slashing",
            },
            bronze: {
              hp: 90,
              dp: 10,
              ar: 17,
              cost: { food: 80 },
              buildTime: 12,
              attackType: "slashing",
            },
            iron: {
              hp: 110,
              dp: 12,
              ar: 22,
              cost: { food: 100, iron: 20 },
              buildTime: 14,
              attackType: "slashing",
            },
            golden: {
              hp: 140,
              dp: 14,
              ar: 27,
              cost: { food: 120, iron: 30 },
              buildTime: 16,
              attackType: "slashing",
            },
            eternal: {
              hp: 190,
              dp: 18,
              ar: 42,
              cost: { food: 150, iron: 50 },
              buildTime: 18,
              attackType: "slashing",
            },
          },
          hunter: {
            bronze: {
              hp: 50,
              dp: 6,
              ar: 18,
              cost: { food: 50, wood: 30 },
              buildTime: 12,
              attackType: "piercing",
              attackRange: 110,
            },
            iron: {
              hp: 60,
              dp: 8,
              ar: 23,
              cost: { food: 60, wood: 40 },
              buildTime: 14,
              attackType: "piercing",
              attackRange: 120,
            },
            golden: {
              hp: 70,
              dp: 10,
              ar: 28,
              cost: { food: 70, wood: 50 },
              buildTime: 16,
              attackType: "piercing",
              attackRange: 130,
            },
            eternal: {
              hp: 140,
              dp: 16,
              ar: 48,
              cost: { food: 100, wood: 60, gold: 20 },
              buildTime: 18,
              attackType: "piercing",
              attackRange: 160,
            },
          },
          rider: {
            iron: {
              hp: 110,
              dp: 12,
              ar: 22,
              cost: { food: 80, gold: 40 },
              buildTime: 16,
              attackType: "slashing",
            },
            golden: {
              hp: 140,
              dp: 18,
              ar: 32,
              cost: { food: 100, gold: 60 },
              buildTime: 18,
              attackType: "slashing",
            },
            eternal: {
              hp: 240,
              dp: 22,
              ar: 52,
              cost: { food: 120, gold: 80, iron: 30 },
              buildTime: 20,
              attackType: "slashing",
            },
          },
          shadow_blade: {
            golden: {
              hp: 140,
              dp: 18,
              ar: 32,
              cost: { food: 100, gold: 60, iron: 30 },
              buildTime: 20,
              attackType: "slashing",
            },
            eternal: {
              hp: 290,
              dp: 28,
              ar: 62,
              cost: { food: 120, gold: 80, iron: 50 },
              buildTime: 22,
              attackType: "slashing",
            },
          },
          warden: {
            eternal: {
              hp: 340,
              dp: 32,
              ar: 72,
              cost: { food: 150, gold: 100, iron: 80 },
              buildTime: 25,
              attackType: "slashing",
            },
          },
          trebuchet: {
            iron: {
              hp: 90,
              dp: 6,
              ar: 55,
              cost: { wood: 300, iron: 150, gold: 50 },
              buildTime: 25,
              attackType: "blunt",
              attackRange: 160,
            },
            golden: {
              hp: 110,
              dp: 9,
              ar: 65,
              cost: { wood: 350, iron: 200, gold: 75 },
              buildTime: 27,
              attackType: "blunt",
              attackRange: 170,
            },
            eternal: {
              hp: 140,
              dp: 12,
              ar: 80,
              cost: { wood: 400, iron: 250, gold: 100 },
              buildTime: 30,
              attackType: "blunt",
              attackRange: 190,
            },
          },
          moon_priestess: {
            iron: {
              hp: 250,
              dp: 20,
              ar: 25,
              cost: { food: 500, gold: 200, iron: 100 },
              buildTime: 30,
              attackType: "piercing",
              attackRange: 100,
              abilityName: "Lunar Veil",
              abilityCooldown: 60,
            },
            golden: {
              hp: 350,
              dp: 25,
              ar: 35,
              cost: { food: 500, gold: 200, iron: 100 },
              buildTime: 30,
              attackType: "piercing",
              attackRange: 100,
              abilityName: "Lunar Veil",
              abilityCooldown: 60,
            },
            eternal: {
              hp: 450,
              dp: 35,
              ar: 45,
              cost: { food: 500, gold: 200, iron: 100 },
              buildTime: 30,
              attackType: "piercing",
              attackRange: 100,
              abilityName: "Lunar Veil",
              abilityCooldown: 60,
            },
          },
          nightstalker: {
            golden: {
              hp: 280,
              dp: 22,
              ar: 35,
              cost: { food: 400, gold: 300, iron: 150 },
              buildTime: 35,
              attackType: "slashing",
              abilityName: "Shadow Strike",
              abilityCooldown: 45,
            },
            eternal: {
              hp: 480,
              dp: 38,
              ar: 55,
              cost: { food: 400, gold: 300, iron: 150 },
              buildTime: 35,
              attackType: "slashing",
              abilityName: "Shadow Strike",
              abilityCooldown: 45,
            },
          },
        },
        buildings: {
          town_center: {
            stone: {
              hp: 1000,
              dp: 30,
              width: 80,
              height: 80,
              cost: { wood: 500, stone: 200 },
              buildTime: 60,
            },
            bronze: {
              hp: 1200,
              dp: 35,
              width: 80,
              height: 80,
              cost: { wood: 600, stone: 300 },
              buildTime: 70,
            },
            iron: {
              hp: 1400,
              dp: 40,
              width: 80,
              height: 80,
              cost: { wood: 700, stone: 400, iron: 100 },
              buildTime: 80,
            },
            golden: {
              hp: 1600,
              dp: 45,
              width: 80,
              height: 80,
              cost: { wood: 800, stone: 500, iron: 200 },
              buildTime: 90,
            },
            eternal: {
              hp: 2000,
              dp: 50,
              width: 80,
              height: 80,
              cost: { wood: 1000, stone: 600, iron: 300 },
              buildTime: 100,
            },
          },
          hut: {
            stone: { hp: 200, dp: 10, cost: { wood: 100 }, buildTime: 15 },
            bronze: { hp: 250, dp: 15, cost: { wood: 120 }, buildTime: 18 },
            iron: {
              hp: 300,
              dp: 20,
              cost: { wood: 150, stone: 50 },
              buildTime: 21,
            },
            golden: {
              hp: 350,
              dp: 25,
              cost: { wood: 200, stone: 100 },
              buildTime: 24,
            },
            eternal: {
              hp: 400,
              dp: 30,
              cost: { wood: 250, stone: 150 },
              buildTime: 27,
            },
          },
          training_ground: {
            stone: { hp: 300, dp: 15, cost: { wood: 200 }, buildTime: 25 },
            bronze: { hp: 350, dp: 20, cost: { wood: 240 }, buildTime: 30 },
            iron: {
              hp: 400,
              dp: 25,
              cost: { wood: 280, stone: 100 },
              buildTime: 35,
            },
            golden: {
              hp: 450,
              dp: 30,
              cost: { wood: 320, stone: 150 },
              buildTime: 40,
            },
            eternal: {
              hp: 500,
              dp: 35,
              cost: { wood: 350, stone: 200 },
              buildTime: 45,
            },
          },
          sawmill: {
            stone: {
              hp: 200,
              dp: 10,
              cost: { wood: 150 },
              buildTime: 20,
              produces: "wood",
              productionRate: 0.5,
            },
            bronze: {
              hp: 250,
              dp: 15,
              cost: { wood: 180 },
              buildTime: 24,
              produces: "wood",
              productionRate: 0.6,
            },
            iron: {
              hp: 300,
              dp: 20,
              cost: { wood: 220, stone: 80 },
              buildTime: 28,
              produces: "wood",
              productionRate: 0.7,
            },
            golden: {
              hp: 350,
              dp: 25,
              cost: { wood: 260, stone: 120 },
              buildTime: 32,
              produces: "wood",
              productionRate: 0.8,
            },
            eternal: {
              hp: 400,
              dp: 30,
              cost: { wood: 300, stone: 150 },
              buildTime: 36,
              produces: "wood",
              productionRate: 1.0,
            },
          },
          storehouse: {
            stone: {
              hp: 250,
              dp: 12,
              cost: { wood: 150 },
              buildTime: 20,
              produces: "food",
              productionRate: 0.5,
            },
            bronze: {
              hp: 300,
              dp: 17,
              cost: { wood: 180 },
              buildTime: 24,
              produces: "food",
              productionRate: 0.6,
            },
            iron: {
              hp: 350,
              dp: 22,
              cost: { wood: 220, stone: 80 },
              buildTime: 28,
              produces: "food",
              productionRate: 0.7,
            },
            golden: {
              hp: 400,
              dp: 27,
              cost: { wood: 260, stone: 120 },
              buildTime: 32,
              produces: "food",
              productionRate: 0.8,
            },
            eternal: {
              hp: 450,
              dp: 32,
              cost: { wood: 300, stone: 150 },
              buildTime: 36,
              produces: "food",
              productionRate: 1.0,
            },
          },
          trade_post: {
            stone: {
              hp: 250,
              dp: 12,
              cost: { wood: 150, gold: 50 },
              buildTime: 20,
              produces: "gold",
              productionRate: 0.3,
            },
            bronze: {
              hp: 300,
              dp: 17,
              cost: { wood: 180, gold: 80 },
              buildTime: 24,
              produces: "gold",
              productionRate: 0.4,
            },
            iron: {
              hp: 350,
              dp: 22,
              cost: { wood: 220, stone: 80, gold: 120 },
              buildTime: 28,
              produces: "gold",
              productionRate: 0.5,
            },
            golden: {
              hp: 400,
              dp: 27,
              cost: { wood: 260, stone: 120, gold: 150 },
              buildTime: 32,
              produces: "gold",
              productionRate: 0.6,
            },
            eternal: {
              hp: 450,
              dp: 32,
              cost: { wood: 300, stone: 150, gold: 200 },
              buildTime: 36,
              produces: "gold",
              productionRate: 0.8,
            },
          },
          shrine: {
            stone: {
              hp: 400,
              dp: 20,
              cost: { wood: 200, gold: 100 },
              buildTime: 30,
            },
            bronze: {
              hp: 450,
              dp: 25,
              cost: { wood: 240, gold: 120 },
              buildTime: 35,
            },
            iron: {
              hp: 500,
              dp: 30,
              cost: { wood: 280, stone: 100, gold: 150 },
              buildTime: 40,
            },
            golden: {
              hp: 550,
              dp: 35,
              cost: { wood: 320, stone: 150, gold: 200 },
              buildTime: 45,
            },
            eternal: {
              hp: 600,
              dp: 40,
              cost: { wood: 350, stone: 200, gold: 250 },
              buildTime: 50,
            },
          },
          kiln: {
            bronze: {
              hp: 350,
              dp: 18,
              cost: { wood: 200, stone: 100 },
              buildTime: 30,
            },
            iron: {
              hp: 400,
              dp: 23,
              cost: { wood: 240, stone: 140 },
              buildTime: 35,
              produces: "iron",
              productionRate: 0.3,
            },
            golden: {
              hp: 450,
              dp: 28,
              cost: { wood: 280, stone: 180 },
              buildTime: 40,
              produces: "iron",
              productionRate: 0.4,
            },
            eternal: {
              hp: 500,
              dp: 33,
              cost: { wood: 320, stone: 220 },
              buildTime: 45,
              produces: "iron",
              productionRate: 0.5,
            },
          },
          watchtower: {
            stone: {
              hp: 300,
              dp: 15,
              ar: 10,
              cost: { wood: 150, stone: 50 },
              buildTime: 30,
              attackType: "piercing",
              attackRange: 150,
            },
            bronze: {
              hp: 350,
              dp: 20,
              ar: 15,
              cost: { wood: 180, stone: 80 },
              buildTime: 35,
              attackType: "piercing",
              attackRange: 160,
            },
            iron: {
              hp: 400,
              dp: 25,
              ar: 20,
              cost: { wood: 220, stone: 120 },
              buildTime: 40,
              attackType: "piercing",
              attackRange: 170,
            },
            golden: {
              hp: 450,
              dp: 30,
              ar: 25,
              cost: { wood: 260, stone: 160 },
              buildTime: 45,
              attackType: "piercing",
              attackRange: 180,
            },
            eternal: {
              hp: 500,
              dp: 35,
              ar: 30,
              cost: { wood: 300, stone: 200 },
              buildTime: 50,
              attackType: "piercing",
              attackRange: 200,
            },
          },
          palisade: {
            stone: { hp: 500, dp: 25, cost: { wood: 50 }, buildTime: 10 },
            bronze: {
              hp: 550,
              dp: 30,
              cost: { wood: 75, stone: 25 },
              buildTime: 12,
            },
            iron: {
              hp: 600,
              dp: 35,
              cost: { wood: 100, stone: 50 },
              buildTime: 14,
            },
            golden: {
              hp: 650,
              dp: 40,
              cost: { wood: 150, stone: 75, iron: 25 },
              buildTime: 16,
            },
            eternal: {
              hp: 700,
              dp: 45,
              cost: { wood: 200, stone: 100, iron: 50 },
              buildTime: 18,
            },
          },
        },
        wonder: {
          stone: {
            name: "Moon Sanctuary",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 300,
          },
          bronze: {
            name: "Moon Sanctuary",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 240,
          },
          iron: {
            name: "Moon Sanctuary",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 180,
          },
          golden: {
            name: "Moon Sanctuary",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 120,
          },
          eternal: {
            name: "Moon Sanctuary",
            hp: 2000,
            dp: 60,
            cost: { wood: 2000, stone: 1500, gold: 1000, iron: 500 },
            buildTime: 60,
          },
        },
        tech: {
          stone: [
            {
              name: "Lunar Blades",
              effects: { resourceGather: 1.2 },
              cost: { wood: 100, food: 50 },
            },
            {
              name: "Moonlit Trails",
              effects: { villagerSpeed: 1.15 },
              cost: { wood: 80 },
            },
            {
              name: "Wooden Frames",
              effects: { buildingHP: 100 },
              cost: { wood: 150 },
            },
            {
              name: "Skirmish Tactics",
              effects: { skirmisherAR: 5 },
              cost: { food: 50 },
            },
            {
              name: "Night Markets",
              effects: { tradePostProduction: 1.1 },
              cost: { wood: 100, gold: 20 },
            },
          ],
          bronze: [
            {
              name: "Bronze Tips",
              effects: { soldierAR: 10 },
              cost: { wood: 200, gold: 50 },
            },
            {
              name: "Palisade Reinforcement",
              effects: { wallHP: 200 },
              cost: { wood: 150, stone: 50 },
            },
            {
              name: "Hunting Traps",
              effects: { foodProduction: 1.25 },
              cost: { food: 200, wood: 100 },
            },
            {
              name: "Bowstring Tension",
              effects: { hunterAR: 5 },
              cost: { food: 100, wood: 50 },
            },
            {
              name: "Wolf Riders",
              effects: { unlockRider: true },
              cost: { food: 150, gold: 50 },
            },
          ],
          iron: [
            {
              name: "Iron Edges",
              effects: { soldierAR: 15 },
              cost: { food: 300, iron: 100 },
            },
            {
              name: "Watchtower Optics",
              effects: { towerAR: 10 },
              cost: { wood: 200, stone: 100 },
            },
            {
              name: "Silver Exchange",
              effects: { goldProduction: 1.2 },
              cost: { gold: 200, iron: 50 },
            },
            {
              name: "Lunar Siege",
              effects: { unlockTrebuchet: true },
              cost: { wood: 400, iron: 150 },
            },
            {
              name: "Shadow Scouts",
              effects: { unitTrainTime: 0.9 },
              cost: { food: 300, gold: 100 },
            },
          ],
          golden: [
            {
              name: "Moonforged Armor",
              effects: { soldierHP: 50 },
              cost: { food: 400, iron: 200 },
            },
            {
              name: "Sacred Groves",
              effects: { buildingHP: 300 },
              cost: { wood: 500, stone: 200 },
            },
            {
              name: "Trade Mastery",
              effects: { goldProduction: 1.5 },
              cost: { gold: 300, iron: 100 },
            },
            {
              name: "Shadow Mastery",
              effects: { shadowBladeAR: 10 },
              cost: { food: 300, gold: 150 },
            },
            {
              name: "Lunar Signals",
              effects: { watchtowerRange: 20 },
              cost: { wood: 400, iron: 200 },
            },
          ],
          eternal: [
            {
              name: "Eternal Shadows",
              effects: { soldierAR: 20 },
              cost: { food: 500, iron: 300 },
            },
            {
              name: "Lunar Harmony",
              effects: { productionRate: 1.3 },
              cost: { wood: 600, gold: 400 },
            },
            {
              name: "Unbreakable Defenses",
              effects: { wallHP: 500, towerHP: 500 },
              cost: { stone: 800, iron: 200 },
            },
            {
              name: "Night Precision",
              effects: { hunterAR: 15, watchtowerAR: 15 },
              cost: { gold: 400, iron: 200 },
            },
            {
              name: "Celestial Grace",
              effects: { heroRegeneration: true },
              cost: { food: 500, gold: 300 },
            },
          ],
        },
        ageRequirements: {
          bronze: { wood: 500, food: 300 },
          iron: { wood: 800, food: 600, gold: 200 },
          golden: { wood: 1200, food: 1000, gold: 500, iron: 300 },
          eternal: {
            wood: 2000,
            food: 1500,
            gold: 1000,
            iron: 800,
            stone: 500,
          },
        },
      },
    };

    // Initialize with default civilization
    this.currentCivilization = "solari";

    // Track researched technologies
    this.researched = [];
  }

  setCivilization(civName) {
    if (this.civilizationData[civName]) {
      this.currentCivilization = civName;
      return true;
    }
    return false;
  }

  getColor() {
    return this.currentCivilization
      ? this.civilizationData[this.currentCivilization].color
      : "#FFFFFF";
  }

  getName() {
    return this.currentCivilization
      ? this.civilizationData[this.currentCivilization].name
      : "Unknown";
  }

  getPerk(perkName) {
    if (!this.currentCivilization) return null;
    return this.civilizationData[this.currentCivilization].perks[perkName];
  }

  getUnitData(unitType) {
    if (!this.currentCivilization) return null;

    const civData = this.civilizationData[this.currentCivilization];
    const currentAge = this.engine.gameState.currentAge;

    let unitKey;

    // Map generic unit types to civilization-specific types
    if (this.currentCivilization === "solari") {
      unitKey =
        {
          villager: "villager",
          spearman: "spearman",
          archer: "archer",
          cavalry: "cavalry",
          knight: "knight",
          guardian: "guardian",
          siege: "catapult",
          hero1: "sun_king",
          hero2: "dawn_sage",
        }[unitType] || unitType;
    } else if (this.currentCivilization === "lunari") {
      unitKey =
        {
          villager: "villager",
          spearman: "skirmisher",
          archer: "hunter",
          cavalry: "rider",
          knight: "shadow_blade",
          guardian: "warden",
          siege: "trebuchet",
          hero1: "moon_priestess",
          hero2: "nightstalker",
        }[unitType] || unitType;
    } else {
      unitKey = unitType;
    }

    // Get unit data for the current age
    if (civData.units[unitKey] && civData.units[unitKey][currentAge]) {
      return civData.units[unitKey][currentAge];
    }

    // If unit is not available in current age, check previous ages
    const ages = ["eternal", "golden", "iron", "bronze", "stone"];
    const ageIndex = ages.indexOf(currentAge);

    for (let i = ageIndex + 1; i < ages.length; i++) {
      const prevAge = ages[i];
      if (civData.units[unitKey] && civData.units[unitKey][prevAge]) {
        return civData.units[unitKey][prevAge];
      }
    }

    return null;
  }

  getBuildingData(buildingType) {
    if (!this.currentCivilization) return null;

    const civData = this.civilizationData[this.currentCivilization];
    const currentAge = this.engine.gameState.currentAge;

    let buildingKey;

    // Map generic building types to civilization-specific types
    if (this.currentCivilization === "solari") {
      buildingKey =
        {
          house: "house",
          barracks: "barracks",
          lumber_mill: "lumber_mill",
          granary: "granary",
          market: "market",
          temple: "temple",
          forge: "forge",
          tower: "tower",
          wall: "wall",
        }[buildingType] || buildingType;
    } else if (this.currentCivilization === "lunari") {
      buildingKey =
        {
          house: "hut",
          barracks: "training_ground",
          lumber_mill: "sawmill",
          granary: "storehouse",
          market: "trade_post",
          temple: "shrine",
          forge: "kiln",
          tower: "watchtower",
          wall: "palisade",
        }[buildingType] || buildingType;
    } else {
      buildingKey = buildingType;
    }

    // Get building data for the current age
    if (
      civData.buildings[buildingKey] &&
      civData.buildings[buildingKey][currentAge]
    ) {
      return civData.buildings[buildingKey][currentAge];
    }

    // If building is not available in current age, check previous ages
    const ages = ["eternal", "golden", "iron", "bronze", "stone"];
    const ageIndex = ages.indexOf(currentAge);

    for (let i = ageIndex + 1; i < ages.length; i++) {
      const prevAge = ages[i];
      if (
        civData.buildings[buildingKey] &&
        civData.buildings[buildingKey][prevAge]
      ) {
        return civData.buildings[buildingKey][prevAge];
      }
    }

    return null;
  }

  getWonderData() {
    if (!this.currentCivilization) return null;

    const civData = this.civilizationData[this.currentCivilization];
    const currentAge = this.engine.gameState.currentAge;

    // Get wonder data for the current age
    if (civData.wonder && civData.wonder[currentAge]) {
      return civData.wonder[currentAge];
    }

    // If wonder data is not available for current age, use the Stone Age data
    return civData.wonder.stone;
  }

  getWonderType() {
    if (!this.currentCivilization) return "generic_wonder";

    if (this.currentCivilization === "solari") {
      return "sun_pyramid";
    } else if (this.currentCivilization === "lunari") {
      return "moon_sanctuary";
    }

    return "generic_wonder";
  }

  getTechOptions(age) {
    if (!this.currentCivilization) return [];

    const civData = this.civilizationData[this.currentCivilization];
    return civData.tech[age] || [];
  }

  getAgeAdvancementCost(nextAge) {
    if (!this.currentCivilization) return null;

    const civData = this.civilizationData[this.currentCivilization];
    return civData.ageRequirements[nextAge] || null;
  }

  updateCivilizationForAge(newAge) {
    // Nothing to do if no civilization is selected
    if (!this.currentCivilization) return;

    // Update tech effects that depend on age
    this.applyTechEffects();

    // Update existing unit stats
    this.updateExistingUnitStats(newAge);

    // Update existing building stats
    this.updateExistingBuildingStats(newAge);
  }

  applyTechEffects() {
    // Nothing to do if no civilization is selected
    if (!this.currentCivilization) return;

    // Get researched techs
    const researchedTechs = this.getResearchedTechs();

    // Apply effects of each researched tech
    for (const tech of researchedTechs) {
      for (const effectKey in tech.effects) {
        const effectValue = tech.effects[effectKey];

        // Apply effect based on its type
        switch (effectKey) {
          case "resourceGather":
            // Applied dynamically when villagers gather
            break;

          case "villagerSpeed":
            // Update all villager speeds
            this.engine.entityManager
              .getEntitiesByOwnerAndType("player", "villager")
              .forEach((villager) => {
                villager.speed *= effectValue;
              });
            break;

          case "buildingHP":
            // Update all building HP
            this.engine.entityManager
              .getBuildingEntities()
              .filter((building) => building.owner === "player")
              .forEach((building) => {
                const hpIncrease = effectValue;
                building.maxHp += hpIncrease;
                building.hp += hpIncrease;
              });
            break;

          case "soldierAR":
          case "spearmanAR":
          case "archerAR":
          case "knightAR":
            // Update soldier AR
            this.engine.entityManager.entities
              .filter(
                (entity) =>
                  entity.owner === "player" && entity.type === "soldier"
              )
              .forEach((soldier) => {
                if (
                  effectKey === "soldierAR" ||
                  (effectKey === "spearmanAR" &&
                    soldier.soldierType === "spearman") ||
                  (effectKey === "archerAR" &&
                    soldier.soldierType === "archer") ||
                  (effectKey === "knightAR" && soldier.soldierType === "knight")
                ) {
                  soldier.ar += effectValue;
                }
              });
            break;

          case "towerAR":
            // Update tower AR
            this.engine.entityManager.entities
              .filter(
                (entity) =>
                  entity.owner === "player" &&
                  (entity.buildingType === "tower" ||
                    entity.buildingType === "watchtower")
              )
              .forEach((tower) => {
                tower.ar += effectValue;
              });
            break;

          case "towerRange":
            // Update tower range
            this.engine.entityManager.entities
              .filter(
                (entity) =>
                  entity.owner === "player" &&
                  (entity.buildingType === "tower" ||
                    entity.buildingType === "watchtower")
              )
              .forEach((tower) => {
                tower.attackRange += effectValue;
              });
            break;

          case "wallHP":
          case "towerHP":
            // Update wall/tower HP
            this.engine.entityManager.entities
              .filter((entity) => {
                if (entity.owner !== "player") return false;
                if (effectKey === "wallHP" && entity.type === "wall")
                  return true;
                if (
                  effectKey === "towerHP" &&
                  (entity.buildingType === "tower" ||
                    entity.buildingType === "watchtower")
                )
                  return true;
                return false;
              })
              .forEach((entity) => {
                const hpIncrease = effectValue;
                entity.maxHp += hpIncrease;
                entity.hp += hpIncrease;
              });
            break;

          case "foodProduction":
          case "goldProduction":
          case "marketProduction":
          case "tradePostProduction":
            // Update production rates
            this.engine.entityManager.entities
              .filter((entity) => {
                if (entity.owner !== "player" || entity.type !== "building")
                  return false;
                if (
                  effectKey === "foodProduction" &&
                  entity.produces === "food"
                )
                  return true;
                if (
                  effectKey === "goldProduction" &&
                  entity.produces === "gold"
                )
                  return true;
                if (
                  effectKey === "marketProduction" &&
                  entity.buildingType === "market"
                )
                  return true;
                if (
                  effectKey === "tradePostProduction" &&
                  entity.buildingType === "trade_post"
                )
                  return true;
                return false;
              })
              .forEach((building) => {
                building.productionRate *= effectValue;
              });
            break;

          case "productionRate":
            // Update all production buildings
            this.engine.entityManager.entities
              .filter(
                (entity) =>
                  entity.owner === "player" &&
                  entity.type === "building" &&
                  entity.produces
              )
              .forEach((building) => {
                building.productionRate *= effectValue;
              });
            break;

          case "unitCost":
            // Applied when creating units
            break;

          case "unitTrainTime":
            // Applied when creating units
            break;

          case "heroRegeneration":
            // Enable hero regeneration
            this.engine.entityManager.entities
              .filter(
                (entity) => entity.owner === "player" && entity.type === "hero"
              )
              .forEach((hero) => {
                hero.canRegenerate = true;
              });
            break;

          case "unlockCavalry":
          case "unlockRider":
          case "unlockCatapult":
          case "unlockTrebuchet":
            // Applied when checking available units
            break;
        }
      }
    }
  }

  updateExistingUnitStats(newAge) {
    // Update stats of existing units based on the new age
    this.engine.entityManager.entities
      .filter(
        (entity) =>
          entity.owner === "player" &&
          (entity.type === "villager" ||
            entity.type === "soldier" ||
            entity.type === "siege" ||
            entity.type === "hero")
      )
      .forEach((unit) => {
        // Get the new stats for this unit type
        let newStats;

        if (unit.type === "villager") {
          newStats = this.getUnitData("villager");
        } else if (unit.type === "soldier") {
          newStats = this.getUnitData(unit.soldierType);
        } else if (unit.type === "siege") {
          newStats = this.getUnitData("siege");
        } else if (unit.type === "hero") {
          newStats = this.getUnitData(unit.heroType);
        }

        if (newStats) {
          // Calculate the HP percentage (for partial healing)
          const hpPercentage = unit.hp / unit.maxHp;

          // Update stats
          unit.maxHp = newStats.hp;
          unit.dp = newStats.dp;
          unit.ar = newStats.ar;

          // Update HP based on the same percentage
          unit.hp = Math.floor(unit.maxHp * hpPercentage);

          // Update other properties if available
          if (newStats.attackRange) unit.attackRange = newStats.attackRange;
          if (newStats.attackType) unit.attackType = newStats.attackType;
        }
      });
  }

  updateExistingBuildingStats(newAge) {
    // Update stats of existing buildings based on the new age
    this.engine.entityManager.entities
      .filter(
        (entity) =>
          entity.owner === "player" &&
          (entity.type === "building" || entity.type === "wall")
      )
      .forEach((building) => {
        // Get the new stats for this building type
        let newStats;

        if (building.type === "building") {
          newStats = this.getBuildingData(building.buildingType);
        } else if (building.type === "wall") {
          newStats = this.getBuildingData("wall");
        }

        if (newStats) {
          // Calculate the HP percentage (for partial healing)
          const hpPercentage = building.hp / building.maxHp;

          // Update stats
          building.maxHp = newStats.hp;
          building.dp = newStats.dp;
          if (newStats.ar) building.ar = newStats.ar;

          // Update HP based on the same percentage
          building.hp = Math.floor(building.maxHp * hpPercentage);

          // Update other properties if available
          if (newStats.attackRange) building.attackRange = newStats.attackRange;
          if (newStats.attackType) building.attackType = newStats.attackType;
          if (newStats.productionRate)
            building.productionRate = newStats.productionRate;
        }
      });
  }

  // Technology research methods
  researchTech(techName) {
    if (!this.currentCivilization) return false;

    // Get tech data for selected civilization
    const currentAge = this.engine.gameState.currentAge;
    const techList = this.getTechOptions(currentAge);

    // Find the tech by name
    const tech = techList.find((t) => t.name === techName);
    if (!tech) return false;

    // Check if already researched
    if (this.isResearched(techName)) return false;

    // Check resources
    if (!this.engine.resourceManager.spendResources(tech.cost)) {
      return false;
    }

    // Add to researched list
    this.researched.push({
      name: techName,
      effects: tech.effects,
      age: currentAge,
    });

    // Apply tech effects immediately
    this.applyTechEffects();

    return true;
  }

  isResearched(techName) {
    return this.researched.some((tech) => tech.name === techName);
  }

  getResourceCostModifiers() {
    // Return cost modifiers based on civilization and researched techs
    const modifiers = {};

    // Apply civilization-specific cost bonuses/penalties
    // For example, Solari might have cheaper solar buildings, etc.

    // Then apply tech modifiers
    const unitCostTech = this.researched.find((tech) => tech.effects.unitCost);
    if (unitCostTech) {
      // Apply to all resources for unit training
      modifiers.food = unitCostTech.effects.unitCost;
      modifiers.wood = unitCostTech.effects.unitCost;
      modifiers.gold = unitCostTech.effects.unitCost;
      modifiers.stone = unitCostTech.effects.unitCost;
      modifiers.iron = unitCostTech.effects.unitCost;
    }

    return modifiers;
  }

  getResearchedTechs() {
    return this.researched;
  }

  getResearchedTechsByAge(age) {
    return this.researched.filter((tech) => tech.age === age);
  }

  getAvailableTechs() {
    if (!this.currentCivilization) return [];

    const currentAge = this.engine.gameState.currentAge;
    const allTechs = this.getTechOptions(currentAge);

    // Filter out already researched techs
    return allTechs.filter((tech) => !this.isResearched(tech.name));
  }

  checkForAgeAdvancement() {
    if (!this.currentCivilization) return false;

    const currentAge = this.engine.gameState.currentAge;
    let nextAge = null;

    // Determine next age
    if (currentAge === "stone") nextAge = "bronze";
    else if (currentAge === "bronze") nextAge = "iron";
    else if (currentAge === "iron") nextAge = "golden";
    else if (currentAge === "golden") nextAge = "eternal";

    // No advancement if already at highest age
    if (!nextAge) return false;

    // Get advancement requirements
    const requirements = this.getAgeAdvancementCost(nextAge);
    if (!requirements) return false;

    // Check if player has enough resources
    for (const resourceType in requirements) {
      const required = requirements[resourceType];
      const available =
        this.engine.resourceManager.resources[resourceType] || 0;

      if (available < required) return false;
    }

    // Check for required buildings (could be added to requirements)

    // All requirements met - can advance
    return true;
  }

  advanceToNextAge() {
    if (!this.currentCivilization || !this.checkForAgeAdvancement())
      return false;

    const currentAge = this.engine.gameState.currentAge;
    let nextAge = null;

    if (currentAge === "stone") nextAge = "bronze";
    else if (currentAge === "bronze") nextAge = "iron";
    else if (currentAge === "iron") nextAge = "golden";
    else if (currentAge === "golden") nextAge = "eternal";

    if (!nextAge) return false;

    // Spend resources
    const requirements = this.getAgeAdvancementCost(nextAge);
    if (!this.engine.resourceManager.spendResources(requirements)) {
      return false;
    }

    // Update game state
    this.engine.gameState.currentAge = nextAge;

    // Update civilization for new age
    this.updateCivilizationForAge(nextAge);

    // Notify UI
    this.engine.uiManager.showAlert(`Advanced to ${nextAge} age!`);

    return true;
  }

  getUnitsForAge(age) {
    if (!this.currentCivilization) return [];

    const civData = this.civilizationData[this.currentCivilization];
    const units = [];

    // Check each unit type to see if it's available in this age
    for (const unitType in civData.units) {
      if (civData.units[unitType][age]) {
        // Create a unit entry with properly mapped name
        const genericType = this.getGenericUnitType(unitType);
        units.push({
          type: genericType || unitType,
          specificType: unitType,
          data: civData.units[unitType][age],
        });
      }
    }

    // Check for techs that unlock units
    const techs = this.getResearchedTechs();
    const unlockEffects = {
      unlockCavalry: "cavalry",
      unlockRider: "cavalry",
      unlockCatapult: "siege",
      unlockTrebuchet: "siege",
    };

    // Add units unlocked by tech
    for (const tech of techs) {
      for (const effect in tech.effects) {
        if (unlockEffects[effect] && tech.effects[effect] === true) {
          const unitType = unlockEffects[effect];
          // Check if not already in the list
          if (!units.some((u) => u.type === unitType)) {
            const specificType = this.getSpecificUnitType(unitType);
            const unitData =
              civData.units[specificType] && civData.units[specificType][age];
            if (unitData) {
              units.push({
                type: unitType,
                specificType: specificType,
                data: unitData,
              });
            }
          }
        }
      }
    }

    return units;
  }

  getBuildingsForAge(age) {
    if (!this.currentCivilization) return [];

    const civData = this.civilizationData[this.currentCivilization];
    const buildings = [];

    // Check each building type to see if it's available in this age
    for (const buildingType in civData.buildings) {
      if (civData.buildings[buildingType][age]) {
        // Create a building entry with properly mapped name
        const genericType = this.getGenericBuildingType(buildingType);
        buildings.push({
          type: genericType || buildingType,
          specificType: buildingType,
          data: civData.buildings[buildingType][age],
        });
      }
    }

    return buildings;
  }

  getGenericUnitType(specificType) {
    // Map civilization-specific unit types to generic types
    if (this.currentCivilization === "solari") {
      const mapping = {
        villager: "villager",
        spearman: "spearman",
        archer: "archer",
        cavalry: "cavalry",
        knight: "knight",
        guardian: "guardian",
        catapult: "siege",
        sun_king: "hero1",
        dawn_sage: "hero2",
      };
      return mapping[specificType] || specificType;
    } else if (this.currentCivilization === "lunari") {
      const mapping = {
        villager: "villager",
        skirmisher: "spearman",
        hunter: "archer",
        rider: "cavalry",
        shadow_blade: "knight",
        warden: "guardian",
        trebuchet: "siege",
        moon_priestess: "hero1",
        nightstalker: "hero2",
      };
      return mapping[specificType] || specificType;
    }

    return specificType;
  }

  getSpecificUnitType(genericType) {
    // Map generic unit types to civilization-specific types
    if (this.currentCivilization === "solari") {
      const mapping = {
        villager: "villager",
        spearman: "spearman",
        archer: "archer",
        cavalry: "cavalry",
        knight: "knight",
        guardian: "guardian",
        siege: "catapult",
        hero1: "sun_king",
        hero2: "dawn_sage",
      };
      return mapping[genericType] || genericType;
    } else if (this.currentCivilization === "lunari") {
      const mapping = {
        villager: "villager",
        spearman: "skirmisher",
        archer: "hunter",
        cavalry: "rider",
        knight: "shadow_blade",
        guardian: "warden",
        siege: "trebuchet",
        hero1: "moon_priestess",
        hero2: "nightstalker",
      };
      return mapping[genericType] || genericType;
    }

    return genericType;
  }

  getGenericBuildingType(specificType) {
    // Map civilization-specific building types to generic types
    if (this.currentCivilization === "solari") {
      const mapping = {
        house: "house",
        barracks: "barracks",
        lumber_mill: "lumber_mill",
        granary: "granary",
        market: "market",
        temple: "temple",
        forge: "forge",
        tower: "tower",
        wall: "wall",
      };
      return mapping[specificType] || specificType;
    } else if (this.currentCivilization === "lunari") {
      const mapping = {
        hut: "house",
        training_ground: "barracks",
        sawmill: "lumber_mill",
        storehouse: "granary",
        trade_post: "market",
        shrine: "temple",
        kiln: "forge",
        watchtower: "tower",
        palisade: "wall",
      };
      return mapping[specificType] || specificType;
    }

    return specificType;
  }

  getSpecificBuildingType(genericType) {
    // Map generic building types to civilization-specific types
    if (this.currentCivilization === "solari") {
      const mapping = {
        house: "house",
        barracks: "barracks",
        lumber_mill: "lumber_mill",
        granary: "granary",
        market: "market",
        temple: "temple",
        forge: "forge",
        tower: "tower",
        wall: "wall",
      };
      return mapping[genericType] || genericType;
    } else if (this.currentCivilization === "lunari") {
      const mapping = {
        house: "hut",
        barracks: "training_ground",
        lumber_mill: "sawmill",
        granary: "storehouse",
        market: "trade_post",
        temple: "shrine",
        forge: "kiln",
        tower: "watchtower",
        wall: "palisade",
      };
      return mapping[genericType] || genericType;
    }

    return genericType;
  }

  getUnitTrainingTime(unitType) {
    // Get base training time
    const unitData = this.getUnitData(unitType);
    if (!unitData) return 10; // Default fallback

    let trainingTime = unitData.buildTime || 10;

    // Apply techs that affect training time
    const techs = this.getResearchedTechs();
    for (const tech of techs) {
      if (tech.effects.unitTrainTime) {
        trainingTime *= tech.effects.unitTrainTime;
      }
    }

    // Apply civilization perk if applicable (e.g., Lunari soldiers train faster)
    if (
      unitType !== "villager" &&
      this.currentCivilization === "lunari" &&
      this.getPerk("soldierTrain")
    ) {
      trainingTime /= this.getPerk("soldierTrain");
    }

    return Math.max(1, Math.floor(trainingTime));
  }

  getUnitCost(unitType) {
    // Get base cost
    const unitData = this.getUnitData(unitType);
    if (!unitData || !unitData.cost) return {};

    const baseCost = { ...unitData.cost };

    // Apply techs that affect unit cost
    const techs = this.getResearchedTechs();
    for (const tech of techs) {
      if (tech.effects.unitCost) {
        for (const resource in baseCost) {
          baseCost[resource] = Math.floor(
            baseCost[resource] * tech.effects.unitCost
          );
        }
      }
    }

    return baseCost;
  }

  getBuildingConstructionTime(buildingType) {
    // Get base construction time
    const buildingData = this.getBuildingData(buildingType);
    if (!buildingData) return 30; // Default fallback

    return buildingData.buildTime || 30;
  }

  getBuildingCost(buildingType) {
    // Get base cost
    const buildingData = this.getBuildingData(buildingType);
    if (!buildingData || !buildingData.cost) return {};

    // Apply techs that affect building cost (if any)
    // Currently no specific techs for this, but can be added

    return { ...buildingData.cost };
  }

  getDayNightBonus(isDay) {
    // Apply civilization day/night bonuses
    if (
      this.currentCivilization === "solari" &&
      isDay &&
      this.getPerk("dayBonus")
    ) {
      // Solari get bonuses during daytime
      return {
        resourceGather: 1.2, // 20% faster resource gathering
        soldierAR: 1.15, // 15% more soldier attack
      };
    } else if (
      this.currentCivilization === "lunari" &&
      !isDay &&
      this.getPerk("nightBonus")
    ) {
      // Lunari get bonuses during nighttime
      return {
        unitSpeed: 1.2, // 20% faster unit movement
        soldierAR: 1.15, // 15% more soldier attack
      };
    }

    return null; // No bonus
  }

  applyDayNightBonuses(isDay) {
    const bonus = this.getDayNightBonus(isDay);
    if (!bonus) return;

    // Apply bonuses to relevant entities
    if (bonus.unitSpeed) {
      this.engine.entityManager.entities
        .filter(
          (entity) =>
            entity.owner === "player" &&
            (entity.type === "soldier" ||
              entity.type === "villager" ||
              entity.type === "siege" ||
              entity.type === "hero")
        )
        .forEach((unit) => {
          // Store original speed if not already stored
          if (!unit.originalSpeed) unit.originalSpeed = unit.speed;

          // Apply bonus
          unit.speed = unit.originalSpeed * bonus.unitSpeed;
        });
    }

    if (bonus.soldierAR) {
      this.engine.entityManager.entities
        .filter(
          (entity) =>
            entity.owner === "player" &&
            (entity.type === "soldier" || entity.type === "hero")
        )
        .forEach((unit) => {
          // Store original AR if not already stored
          if (!unit.originalAR) unit.originalAR = unit.ar;

          // Apply bonus
          unit.ar = unit.originalAR * bonus.soldierAR;
        });
    }

    // Resource gathering bonus is applied dynamically during gathering
  }

  resetDayNightBonuses() {
    // Reset all units to their original stats
    this.engine.entityManager.entities
      .filter(
        (entity) =>
          entity.owner === "player" &&
          (entity.type === "soldier" ||
            entity.type === "villager" ||
            entity.type === "siege" ||
            entity.type === "hero")
      )
      .forEach((unit) => {
        // Reset speed if original value stored
        if (unit.originalSpeed) {
          unit.speed = unit.originalSpeed;
        }

        // Reset attack rating if original value stored
        if (unit.originalAR) {
          unit.ar = unit.originalAR;
        }
      });
  }

  getResourceGatheringRate(resourceType, isDay) {
    // Base gather rate
    let rate = 1.0;

    // Apply civilization perk
    if (this.currentCivilization && this.getPerk("resourceGather")) {
      rate *= this.getPerk("resourceGather");
    }

    // Apply day/night bonus
    const bonus = this.getDayNightBonus(isDay);
    if (bonus && bonus.resourceGather) {
      rate *= bonus.resourceGather;
    }

    // Apply tech bonuses
    const techs = this.getResearchedTechs();
    for (const tech of techs) {
      if (tech.effects.resourceGather) {
        rate *= tech.effects.resourceGather;
      }
    }

    return rate;
  }

  getPopulationCapacity() {
    // Calculate max population based on current buildings
    let capacity = 10; // Base capacity

    // Count houses/huts
    const houses = this.engine.entityManager.entities.filter(
      (entity) =>
        entity.owner === "player" &&
        (entity.buildingType === "house" || entity.buildingType === "hut") &&
        !entity.isBuilding // Only count completed buildings
    );

    // Each house adds 5 population
    capacity += houses.length * 5;

    // Town center adds 10 population
    const townCenters = this.engine.entityManager.entities.filter(
      (entity) =>
        entity.owner === "player" &&
        entity.buildingType === "town_center" &&
        !entity.isBuilding
    );

    capacity += townCenters.length * 10;

    // Add age bonus
    const currentAge = this.engine.gameState.currentAge;
    const ageBonus = {
      stone: 0,
      bronze: 5,
      iron: 10,
      golden: 15,
      eternal: 20,
    };

    capacity += ageBonus[currentAge] || 0;

    return capacity;
  }

  getTechCost(techName) {
    if (!this.currentCivilization) return null;

    const currentAge = this.engine.gameState.currentAge;
    const techList = this.getTechOptions(currentAge);

    // Find the tech by name
    const tech = techList.find((t) => t.name === techName);
    if (!tech) return null;

    return tech.cost;
  }

  getCivilizationSummary() {
    if (!this.currentCivilization) return null;

    const civData = this.civilizationData[this.currentCivilization];

    // Create a summary of the civilization
    return {
      name: civData.name,
      color: civData.color,
      perks: Object.entries(civData.perks).map(([key, value]) => {
        let description = "";

        if (key === "resourceGather" && value > 1) {
          description = `${Math.round(
            (value - 1) * 100
          )}% faster resource gathering`;
        } else if (key === "dayBonus" && value === true) {
          description = "Bonuses during daytime";
        } else if (key === "nightBonus" && value === true) {
          description = "Bonuses during nighttime";
        } else if (key === "soldierTrain" && value > 1) {
          description = `${Math.round(
            (value - 1) * 100
          )}% faster soldier training`;
        }

        return {
          key,
          value,
          description,
        };
      }),
      wonderType: this.getWonderType(),
      age: this.engine.gameState.currentAge,
      canAdvance: this.checkForAgeAdvancement(),
      nextAge: this.getNextAge(),
      researched: this.getResearchedTechs().length,
      availableTechs: this.getAvailableTechs().length,
    };
  }

  getNextAge() {
    const currentAge = this.engine.gameState.currentAge;

    if (currentAge === "stone") return "bronze";
    else if (currentAge === "bronze") return "iron";
    else if (currentAge === "iron") return "golden";
    else if (currentAge === "golden") return "eternal";

    return null; // Already at highest age
  }
}

// Export the class if we're in a module environment
if (typeof module !== "undefined") {
  module.exports = { CivilizationManager };
}
