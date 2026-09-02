// Static definitions for the 9 villagers.
// Each has a role (which locations they gravitate toward), a personality
// blurb fed to the LLM, and a starting grid position.

const VILLAGERS = [
  {
    id: "elin",
    name: "Elin",
    role: "farmer",
    emoji: "🌾",
    color: 0x7cb342,
    personality:
      "Hardworking and practical. Loves the land, worries about the harvest, quietly proud.",
    home: "House 1",
    x: 1,
    y: 1
  },
  {
    id: "bram",
    name: "Bram",
    role: "baker",
    emoji: "🍞",
    color: 0xd2a679,
    personality:
      "Warm and chatty. Wakes before dawn, loves gossip, secretly wants to open a second shop.",
    home: "House 2",
    x: 3,
    y: 1
  },
  {
    id: "mira",
    name: "Mira",
    role: "healer",
    emoji: "🌿",
    color: 0x4db6ac,
    personality:
      "Calm and observant. Studies plants, patient with everyone, a little lonely.",
    home: "House 3",
    x: 5,
    y: 1
  },
  {
    id: "oskar",
    name: "Oskar",
    role: "blacksmith",
    emoji: "⚒️",
    color: 0x8d6e63,
    personality:
      "Gruff but fair. Takes pride in craftsmanship, slow to trust, loyal once he does.",
    home: "House 4",
    x: 1,
    y: 4
  },
  {
    id: "sana",
    name: "Sana",
    role: "merchant",
    emoji: "🧺",
    color: 0xffb300,
    personality:
      "Ambitious and sharp-tongued. Always negotiating, dreams of expanding trade beyond the village.",
    home: "House 5",
    x: 3,
    y: 4
  },
  {
    id: "tobin",
    name: "Tobin",
    role: "fisher",
    emoji: "🎣",
    color: 0x42a5f5,
    personality:
      "Easygoing and a bit of a dreamer. Tells tall tales, avoids conflict, secretly writes poetry.",
    home: "House 6",
    x: 5,
    y: 4
  },
  {
    id: "greta",
    name: "Greta",
    role: "innkeeper",
    emoji: "🍺",
    color: 0xef5350,
    personality:
      "Loud, generous, keeper of everyone's secrets. Runs the tavern, misses her late husband.",
    home: "House 7",
    x: 1,
    y: 7
  },
  {
    id: "finn",
    name: "Finn",
    role: "carpenter",
    emoji: "🪵",
    color: 0xa1887f,
    personality:
      "Restless and inventive. Always improving something, gets bored easily, wants to build something grand.",
    home: "House 8",
    x: 3,
    y: 7
  },
  {
    id: "ivy",
    name: "Ivy",
    role: "teacher",
    emoji: "📚",
    color: 0xab47bc,
    personality:
      "Curious and idealistic. Keeps the village's history, asks a lot of questions, wants to start a library.",
    home: "House 9",
    x: 5,
    y: 7
  }
];

module.exports = { VILLAGERS };
