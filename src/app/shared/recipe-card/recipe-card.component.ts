import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Recipe } from '../../core/models/recipe';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss']
})
export class RecipeCardComponent {
  @Input() recipe!: Recipe;
  @Output() favoriteToggled = new EventEmitter<{ id: string | number; favorite: boolean }>();

// Preventing the click from opening the detail page,
  onToggleFavorite(ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    this.favoriteToggled.emit({ id: this.recipe.id, favorite: !this.recipe.favorite });
  }
}
