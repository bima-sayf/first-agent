// The village map: a small grid of named locations. Coordinates are in
// grid cells (the client multiplies by TILE_SIZE to get pixels).

const GRID_W = 8;
const GRID_H = 9;
const TILE_SIZE = 72;

const LOCATIONS = [
  { name: "Farm", type: "work", x: 1, y: 0 },
  { name: "Bakery", type: "work", x: 3, y: 0 },
  { name: "Herb Garden", type: "work", x: 5, y: 0 },
  { name: "Forge", type: "work", x: 1, y: 3 },
  { name: "Market", type: "work", x: 3, y: 3 },
  { name: "Lake", type: "work", x: 5, y: 3 },
  { name: "Tavern", type: "social", x: 3, y: 6 },
  { name: "Workshop", type: "work", x: 1, y: 6 },
  { name: "School", type: "work", x: 5, y: 6 },
  { name: "Town Square", type: "social", x: 3, y: 8.5 },
  { name: "House 1", type: "home", x: 1, y: 1 },
  { name: "House 2", type: "home", x: 3, y: 1 },
  { name: "House 3", type: "home", x: 5, y: 1 },
  { name: "House 4", type: "home", x: 1, y: 4 },
  { name: "House 5", type: "home", x: 3, y: 4 },
  { name: "House 6", type: "home", x: 5, y: 4 },
  { name: "House 7", type: "home", x: 1, y: 7 },
  { name: "House 8", type: "home", x: 3, y: 7 },
  { name: "House 9", type: "home", x: 5, y: 7 }
];

function locationByName(name) {
  return LOCATIONS.find((l) => l.name.toLowerCase() === String(name).toLowerCase());
}

module.exports = { GRID_W, GRID_H, TILE_SIZE, LOCATIONS, locationByName };
