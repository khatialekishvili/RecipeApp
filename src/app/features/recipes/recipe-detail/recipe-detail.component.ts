import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe } from '../../../core/models/recipe';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [
    AsyncPipe, RouterModule,
    MatButtonModule, MatIconModule,
    MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule,
  ],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss']
})
export class RecipeDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recipeService = inject(RecipeService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  isDeleting = false; // loading flag during delete
  @ViewChild('confirmDeleteDialog') confirmDeleteDialog!: TemplateRef<any>;
  private pendingDelete: Recipe | null = null;

// Loading recipe based on route param, navigate to /not-found if fails
  recipe$ = this.route.paramMap.pipe(
    switchMap(p => this.recipeService.getById(p.get('id')!)),
    catchError(() => {
      this.router.navigate(['/not-found']);
      return of(null as unknown as Recipe);
    })
  );

  openConfirmDelete(r: Recipe) {
    this.pendingDelete = r;
    this.dialog.open(this.confirmDeleteDialog, { autoFocus: false, restoreFocus: true });
  }

// Handles actual delete (with error snackbar + redirect)
  confirmDelete() {
    if (!this.pendingDelete) return;
    this.isDeleting = true;

    this.recipeService.delete(this.pendingDelete.id).pipe(
      catchError(() => {
        this.snack.open('Failed to delete. Please try again.', 'Dismiss', { duration: 3000 });
        return of(null);
      })
    ).subscribe(ok => {
      this.isDeleting = false;
      if (!ok) return;
      this.dialog.closeAll();
      this.snack.open('Recipe deleted', 'OK', { duration: 2000 });
      this.router.navigate(['/recipes']);
    });
  }

// Toggle favorite state and update on backend
  toggleFavorite(r: Recipe) {
    const next = !r.favorite;
    this.recipeService.toggleFavorite(r.id, next).subscribe({
      next: () => (r.favorite = next),
      error: () => this.snack.open('Failed to update favorite', 'Dismiss', { duration: 2500 })
    });
  }
}
