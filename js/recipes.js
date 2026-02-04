/**
 * Recipes — Search for recipes using TheMealDB free API.
 */
const Recipes = (() => {
  const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
  const cache = new Map();

  /**
   * Search recipes by ingredient name.
   * Returns array of { id, name, thumb, category, area }.
   */
  async function searchByIngredient(ingredient) {
    const key = ingredient.toLowerCase().trim();
    if (cache.has(key)) return cache.get(key);

    try {
      const res = await fetch(`${BASE_URL}/filter.php?i=${encodeURIComponent(key)}`);
      const data = await res.json();

      if (!data.meals) {
        cache.set(key, []);
        return [];
      }

      const meals = data.meals.map(m => ({
        id: m.idMeal,
        name: m.strMeal,
        thumb: m.strMealThumb,
      }));

      cache.set(key, meals);
      return meals;
    } catch {
      return [];
    }
  }

  /**
   * Get full recipe details by meal ID.
   */
  async function getRecipeDetail(mealId) {
    const cacheKey = 'detail_' + mealId;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
      const res = await fetch(`${BASE_URL}/lookup.php?i=${mealId}`);
      const data = await res.json();

      if (!data.meals || !data.meals[0]) return null;

      const m = data.meals[0];

      // Extract ingredients and measures
      const ingredients = [];
      for (let i = 1; i <= 20; i++) {
        const ing = m['strIngredient' + i];
        const measure = m['strMeasure' + i];
        if (ing && ing.trim()) {
          ingredients.push({
            ingredient: ing.trim(),
            measure: measure ? measure.trim() : '',
          });
        }
      }

      const detail = {
        id: m.idMeal,
        name: m.strMeal,
        category: m.strCategory || '',
        area: m.strArea || '',
        instructions: m.strInstructions || '',
        thumb: m.strMealThumb || '',
        tags: m.strTags ? m.strTags.split(',').map(t => t.trim()) : [],
        youtube: m.strYoutube || '',
        source: m.strSource || '',
        ingredients,
      };

      cache.set(cacheKey, detail);
      return detail;
    } catch {
      return null;
    }
  }

  /**
   * Search recipes for multiple ingredients and return deduplicated results.
   * Each result is tagged with which queried ingredient matched.
   */
  async function searchMultipleIngredients(ingredientList) {
    const results = new Map();

    const searches = ingredientList.map(async (ingredient) => {
      const meals = await searchByIngredient(ingredient);
      meals.forEach(meal => {
        if (results.has(meal.id)) {
          results.get(meal.id).matchedIngredients.push(ingredient);
        } else {
          results.set(meal.id, {
            ...meal,
            matchedIngredients: [ingredient],
          });
        }
      });
    });

    await Promise.all(searches);

    // Sort by number of matched ingredients (most matches first)
    return Array.from(results.values())
      .sort((a, b) => b.matchedIngredients.length - a.matchedIngredients.length);
  }

  return {
    searchByIngredient,
    getRecipeDetail,
    searchMultipleIngredients,
  };
})();
