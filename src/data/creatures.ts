import type { CreatureDefinition } from "../types.js";

export const CREATURES: CreatureDefinition[] = [
  {
    id: "mossbun",
    name: "苔团",
    title: "软叶精灵",
    catchRate: 0.72,
    assets: {
      normal: "./src/assets/creatures/mossbun-normal.png",
      shiny: "./src/assets/creatures/mossbun-shiny.png"
    },
    normalPalette: { body: 0x8bcf69, belly: 0xf6efb1, accent: 0x4d8d49, eye: 0x14141d, glow: 0xd8ff8f },
    shinyPalette: { body: 0xf6cf45, belly: 0xfff4b4, accent: 0xff6f6f, eye: 0x14141d, glow: 0xfff06c }
  },
  {
    id: "emberpup",
    name: "炭爪",
    title: "火绒精灵",
    catchRate: 0.62,
    assets: {
      normal: "./src/assets/creatures/emberpup-normal.png",
      shiny: "./src/assets/creatures/emberpup-shiny.png"
    },
    normalPalette: { body: 0xd85c45, belly: 0xffc184, accent: 0x743128, eye: 0x101018, glow: 0xff8a40 },
    shinyPalette: { body: 0x5ed2ff, belly: 0xf0fbff, accent: 0x235a91, eye: 0x101018, glow: 0x66ffff }
  },
  {
    id: "tidetot",
    name: "潮芽",
    title: "水泡精灵",
    catchRate: 0.58,
    assets: {
      normal: "./src/assets/creatures/tidetot-normal.png",
      shiny: "./src/assets/creatures/tidetot-shiny.png"
    },
    normalPalette: { body: 0x56a8ff, belly: 0xcdf2ff, accent: 0x2264aa, eye: 0x111520, glow: 0x7be7ff },
    shinyPalette: { body: 0xd782ff, belly: 0xffdcff, accent: 0x7a35b7, eye: 0x111520, glow: 0xf0a0ff }
  },
  {
    id: "volthorn",
    name: "伏刺",
    title: "电角精灵",
    catchRate: 0.52,
    assets: {
      normal: "./src/assets/creatures/volthorn-normal.png",
      shiny: "./src/assets/creatures/volthorn-shiny.png"
    },
    normalPalette: { body: 0xffd447, belly: 0xfff0a0, accent: 0x2a2a36, eye: 0x101018, glow: 0xffff74 },
    shinyPalette: { body: 0x161824, belly: 0x5960ff, accent: 0xffe35f, eye: 0xffffff, glow: 0x93a0ff }
  },
  {
    id: "moonmew",
    name: "月咕",
    title: "星绒精灵",
    catchRate: 0.45,
    assets: {
      normal: "./src/assets/creatures/moonmew-normal.png",
      shiny: "./src/assets/creatures/moonmew-shiny.png"
    },
    normalPalette: { body: 0xb68cff, belly: 0xf0dcff, accent: 0x52417d, eye: 0x11121a, glow: 0xd7b8ff },
    shinyPalette: { body: 0xff8fbc, belly: 0xffe2ef, accent: 0x6b2546, eye: 0x11121a, glow: 0xffbfd8 }
  }
];

export const getCreature = (id: string) => {
  const creature = CREATURES.find((item) => item.id === id);
  if (!creature) {
    throw new Error(`Unknown creature id: ${id}`);
  }
  return creature;
};
