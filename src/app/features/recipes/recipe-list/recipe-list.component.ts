import { Component, OnInit, HostListener, inject, computed } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { RecipeService } from '../../../core/services/recipe.service';
import { RecipeCardComponent } from '../../../shared/recipe-card/recipe-card.component';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [
    RouterModule, RecipeCardComponent,
    MatButtonToggleModule, MatButtonModule,
    MatIconModule, MatDividerModule
  ],
  templateUrl: './recipe-list.component.html',
  styleUrls: ['./recipe-list.component.scss']
})
export class RecipeListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recipeService = inject(RecipeService);

// Reading filters from URL query params converting it to signals for instant UI
  private q$ = this.route.queryParamMap.pipe(
    map(pm => (pm.get('q') ?? '').trim().toLowerCase())
  );
  private fav$ = this.route.queryParamMap.pipe(
    map(pm => {
      const v = (pm.get('fav') ?? '').toLowerCase();
      return pm.has('fav') || v === '1' || v === 'true';
    })
  );
  private added$ = this.route.queryParamMap.pipe(
    map(pm => {
      const v = (pm.get('added') ?? '').toLowerCase();
      return pm.has('added') || v === '1' || v === 'true';
    })
  );

  qSig     = toSignal(this.q$,     { initialValue: '' });
  favSig   = toSignal(this.fav$,   { initialValue: false });
  addedSig = toSignal(this.added$, { initialValue: false });

  showTop = false;

  ngOnInit(): void {
// template just reacts when recipesSig updates.
    if ((this.recipeService.recipesSig() ?? []).length === 0) {
      this.recipeService.getAll().pipe(
        catchError(e => {
          console.error(e?.message || 'Failed to load recipes.');
          return of([]);
        })
      ).subscribe();
    }
  }

  pageTitle = computed(() =>
    this.favSig() ? 'Saved Recipes'
      : this.addedSig() ? 'Added Recipes'
      : 'All Recipes'
  );

// search (q), then optional Added/Saved filters
  filtered = computed(() => {
    const list  = this.recipeService.recipesSig() ?? [];
    const q     = this.qSig();
    const added = this.addedSig();
    const fav   = this.favSig();

    let out = q
      ? list.filter(r => {
          const t = (r.title ?? '').toLowerCase();
          const d = (r.description ?? '').toLowerCase();
          const ing = Array.isArray(r.ingredients)
            ? r.ingredients.some(i => (i ?? '').toLowerCase().includes(q))
            : String(r.ingredients ?? '').toLowerCase().includes(q);
          return t.includes(q) || d.includes(q) || ing;
        })
      : list;

    if (added) out = out.filter(r => !!r.isUser);
    if (fav)   out = out.filter(r => !!r.favorite);

    return out;
  });

  onFavoriteToggled(e: { id: string | number; favorite: boolean }) {
    this.recipeService.toggleFavorite(e.id, e.favorite).subscribe();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.showTop = (window.scrollY || document.documentElement.scrollTop) > 400;
  }

  scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

// Toggling “Added Recipes” through the URL so it’s bookmarkable
  onAddedToggle(value: 'all' | 'added') {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { added: value === 'added' ? '1' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
