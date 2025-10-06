import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'recipes', pathMatch: 'full' },

  {
    path: 'recipes',
    loadComponent: () =>
      import('./features/recipes/recipe-list/recipe-list.component')
        .then(m => m.RecipeListComponent)
  },
  {
    path: 'recipes/new',
    loadComponent: () =>
      import('./features/recipes/recipe-form/recipe-form.component')
        .then(m => m.RecipeFormComponent)
  },
  {
    path: 'recipes/:id',
    loadComponent: () =>
      import('./features/recipes/recipe-detail/recipe-detail.component')
        .then(m => m.RecipeDetailComponent)
  },
  {
    path: 'recipes/:id/edit',
    loadComponent: () =>
      import('./features/recipes/recipe-form/recipe-form.component')
        .then(m => m.RecipeFormComponent)
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./not-found/not-found.component')
        .then(m => m.NotFoundComponent)
  },

  { path: '**', redirectTo: 'not-found' }
];
