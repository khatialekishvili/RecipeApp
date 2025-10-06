import fs from 'fs';

const API = 'https://www.themealdb.com/api/json/v1/1';

const SEARCH_TERMS = ['pasta', 'beef', 'fish', 'rice', 'soup', 'salad', 'cake'];

const CATEGORIES = ['Seafood', 'Beef', 'Pork', 'Lamb', 'Vegetarian', 'Dessert', 'Pasta'];
const AREAS = ['Spanish', 'Mexican', 'Italian', 'Indian', 'Chinese', 'Japanese', 'Greek', 'Moroccan'];

const MAX_RECIPES = 20;
const MAX_PER_CATEGORY = 2;

async function j(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function collectIngredients(m) {
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (m[`strIngredient${i}`] || '').trim();
    const meas = (m[`strMeasure${i}`] || '').trim();
    if (ing) out.push(meas ? `${ing} - ${meas}` : ing);
  }
  return out;
}

function toRecipe(m) {
  const ingredients = collectIngredients(m);
  const description = [m.strArea, m.strCategory].filter(Boolean).join(' • ') || 'Recipe';
  return {
    title: (m.strMeal || '').trim(),
    description,
    ingredients,
    ingredientsText: ingredients.join(' | '), 
    instructions: (m.strInstructions || '').trim(),
    thumbnailUrl: (m.strMealThumb || '').trim(),
    _category: (m.strCategory || '').trim(), 
    _area: (m.strArea || '').trim(),
    favorite: false
  };
}

function usable(r) {
  return r.title && r.thumbnailUrl && r.instructions && Array.isArray(r.ingredients) && r.ingredients.length > 0;
}

async function searchByName(term) {
  const data = await j(`${API}/search.php?s=${encodeURIComponent(term)}`);
  return (data.meals || []);
}

async function filterIdsBy(kind, term) {
  const key = kind === 'category' ? 'c' : 'a';
  const data = await j(`${API}/filter.php?${key}=${encodeURIComponent(term)}`);
  return (data.meals || []).map(m => m.idMeal);
}

async function lookup(id) {
  const data = await j(`${API}/lookup.php?i=${encodeURIComponent(id)}`);
  return (data.meals && data.meals[0]) || null;
}

async function mapWithConcurrency(items, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function dedupeByTitle(recipes) {
  const seen = new Set();
  const out = [];
  for (const r of recipes) {
    const key = r.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

async function run() {
  const raw = [];

  for (const term of SEARCH_TERMS) {
    try {
      const meals = await searchByName(term);
      raw.push(...meals);
    } catch (e) { console.warn('search', term, e.message); }
  }

  for (const c of CATEGORIES) {
    try {
      const ids = await filterIdsBy('category', c);
      const full = await mapWithConcurrency(ids, 6, lookup);
      raw.push(...full.filter(Boolean));
    } catch (e) { console.warn('category', c, e.message); }
  }

  for (const a of AREAS) {
    try {
      const ids = await filterIdsBy('area', a);
      const full = await mapWithConcurrency(ids, 6, lookup);
      raw.push(...full.filter(Boolean));
    } catch (e) { console.warn('area', a, e.message); }
  }

  let normalized = raw.filter(Boolean).map(toRecipe).filter(usable);
  normalized = dedupeByTitle(normalized);

  let pool = normalized.sort(() => Math.random() - 0.5);

  const final = [];
  const byCatCount = new Map();

  for (const r of pool) {
    if (final.length >= MAX_RECIPES) break;
    const cat = r._category || 'Unknown';
    const used = byCatCount.get(cat) || 0;
    if (used < MAX_PER_CATEGORY) {
      final.push(r);
      byCatCount.set(cat, used + 1);
    }
  }

  if (final.length < MAX_RECIPES) {
    for (const r of pool) {
      if (final.length >= MAX_RECIPES) break;
      if (!final.some(x => x.title.toLowerCase() === r.title.toLowerCase())) {
        final.push(r);
      }
    }
  }

  const cleaned = final.slice(0, MAX_RECIPES).map((r, i) => {
    const { _category, _area, ...clean } = r;
    return { id: i + 1, ...clean };
  });

  fs.writeFileSync('db.json', JSON.stringify({ recipes: cleaned }, null, 2), 'utf-8');
  console.log(`db.json generated with ${cleaned.length} diverse recipes`);
}

run().catch(e => { console.error(e); process.exit(1); });
