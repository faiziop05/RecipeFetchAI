export function getRecipeEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("pasta") || t.includes("noodle") || t.includes("spaghetti"))
    return "🍝";
  if (t.includes("pizza")) return "🍕";
  if (t.includes("burger") || t.includes("sandwich")) return "🍔";
  if (t.includes("salad")) return "🥗";
  if (t.includes("soup") || t.includes("stew") || t.includes("broth"))
    return "🍲";
  if (
    t.includes("cake") ||
    t.includes("dessert") ||
    t.includes("cookie") ||
    t.includes("brownie")
  )
    return "🎂";
  if (t.includes("chicken") || t.includes("poultry") || t.includes("turkey"))
    return "🍗";
  if (
    t.includes("fish") ||
    t.includes("salmon") ||
    t.includes("tuna") ||
    t.includes("shrimp")
  )
    return "🐟";
  if (t.includes("taco") || t.includes("burrito") || t.includes("mexican"))
    return "🌮";
  if (t.includes("sushi") || t.includes("rice") || t.includes("japanese"))
    return "🍱";
  if (t.includes("curry") || t.includes("indian") || t.includes("masala"))
    return "🍛";
  if (t.includes("bread") || t.includes("toast") || t.includes("muffin"))
    return "🍞";
  if (t.includes("egg") || t.includes("omelette") || t.includes("scramble"))
    return "🍳";
  if (t.includes("smoothie") || t.includes("juice") || t.includes("drink"))
    return "🥤";
  if (t.includes("steak") || t.includes("beef") || t.includes("meat"))
    return "🥩";
  if (t.includes("vegetable") || t.includes("vegan") || t.includes("veggie"))
    return "🥦";
  return "🍽️";
}

export function getIngredientEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("chicken") || n.includes("turkey") || n.includes("poultry"))
    return "🍗";
  if (n.includes("beef") || n.includes("steak") || n.includes("meat"))
    return "🥩";
  if (n.includes("egg")) return "🥚";
  if (n.includes("milk") || n.includes("cream") || n.includes("butter"))
    return "🧈";
  if (n.includes("tomato")) return "🍅";
  if (n.includes("onion") || n.includes("garlic")) return "🧅";
  if (n.includes("lemon") || n.includes("lime")) return "🍋";
  if (n.includes("carrot")) return "🥕";
  if (n.includes("pepper") || n.includes("chili")) return "🌶️";
  if (n.includes("mushroom")) return "🍄";
  if (n.includes("cheese")) return "🧀";
  if (n.includes("flour") || n.includes("bread") || n.includes("wheat"))
    return "🌾";
  if (n.includes("salt") || n.includes("sugar") || n.includes("spice"))
    return "🧂";
  if (n.includes("oil") || n.includes("vinegar")) return "🫙";
  if (n.includes("fish") || n.includes("salmon") || n.includes("tuna"))
    return "🐟";
  return "🌿";
}
