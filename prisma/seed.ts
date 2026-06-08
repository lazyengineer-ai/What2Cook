import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

const DEFAULT_CATEGORIES = [
  { name: "Spices", icon: "🌶️", sortOrder: 1 },
  { name: "Veggies", icon: "🥬", sortOrder: 2 },
  { name: "Meat", icon: "🥩", sortOrder: 3 },
  { name: "Seafood", icon: "🐟", sortOrder: 4 },
  { name: "Poultry", icon: "🍗", sortOrder: 5 },
  { name: "Grain", icon: "🌾", sortOrder: 6 },
  { name: "Flour", icon: "🫙", sortOrder: 7 },
  { name: "Dairy", icon: "🥛", sortOrder: 8 },
  { name: "Frozen", icon: "🧊", sortOrder: 9 },
  { name: "Canned", icon: "🥫", sortOrder: 10 },
  { name: "Beverages", icon: "🥤", sortOrder: 11 },
  { name: "Other", icon: "📦", sortOrder: 12 },
];

const DEFAULT_INGREDIENTS = [
  { name: "Salt", category: "Spices", unit: "g" },
  { name: "Black Pepper", category: "Spices", unit: "g" },
  { name: "Cumin", category: "Spices", unit: "g" },
  { name: "Turmeric", category: "Spices", unit: "g" },
  { name: "Paprika", category: "Spices", unit: "g" },
  { name: "Garlic", category: "Spices", unit: "pieces" },
  { name: "Ginger", category: "Spices", unit: "g" },
  { name: "Onion", category: "Veggies", unit: "pieces" },
  { name: "Tomato", category: "Veggies", unit: "pieces" },
  { name: "Potato", category: "Veggies", unit: "pieces" },
  { name: "Carrot", category: "Veggies", unit: "pieces" },
  { name: "Bell Pepper", category: "Veggies", unit: "pieces" },
  { name: "Spinach", category: "Veggies", unit: "g" },
  { name: "Broccoli", category: "Veggies", unit: "g" },
  { name: "Mushroom", category: "Veggies", unit: "g" },
  { name: "Chicken Breast", category: "Poultry", unit: "g" },
  { name: "Ground Beef", category: "Meat", unit: "g" },
  { name: "Salmon", category: "Seafood", unit: "g" },
  { name: "Shrimp", category: "Seafood", unit: "g" },
  { name: "Rice", category: "Grain", unit: "g" },
  { name: "Pasta", category: "Grain", unit: "g" },
  { name: "Bread", category: "Grain", unit: "pieces" },
  { name: "All-Purpose Flour", category: "Flour", unit: "g" },
  { name: "Milk", category: "Dairy", unit: "ml" },
  { name: "Butter", category: "Dairy", unit: "g" },
  { name: "Eggs", category: "Dairy", unit: "pieces" },
  { name: "Cheese", category: "Dairy", unit: "g" },
  { name: "Yogurt", category: "Dairy", unit: "g" },
  { name: "Olive Oil", category: "Other", unit: "ml" },
  { name: "Soy Sauce", category: "Other", unit: "ml" },
];

async function main() {
  console.log("Seeding categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.ingredientCategory.upsert({
      where: { slug: slugify(cat.name) },
      update: {},
      create: {
        name: cat.name,
        slug: slugify(cat.name),
        icon: cat.icon,
        sortOrder: cat.sortOrder,
      },
    });
  }

  const categories = await prisma.ingredientCategory.findMany();
  const categoryMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  console.log("Seeding default ingredients...");
  for (const ing of DEFAULT_INGREDIENTS) {
    const categoryId = categoryMap[ing.category];
    if (!categoryId) continue;

    const existing = await prisma.ingredient.findFirst({
      where: { name: ing.name, householdId: null },
    });

    if (!existing) {
      await prisma.ingredient.create({
        data: {
          name: ing.name,
          defaultUnit: ing.unit,
          categoryId,
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
