import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';

import { RecipeService } from '../../../core/services/recipe.service';
import { Recipe } from '../../../core/models/recipe';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule
  ],
  templateUrl: './recipe-form.component.html',
  styleUrls: ['./recipe-form.component.scss']
})
export class RecipeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recipeService = inject(RecipeService);
  private snack = inject(MatSnackBar);

  id: string | null = null;

  readonly maxUploadMB = 1;
  private readonly maxBytes = this.maxUploadMB * 1024 * 1024;
  private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  private urlLike: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
    const v = (c.value ?? '').toString().trim();
    if (!v) return null; 
    return /^(https?:)?\/\//i.test(v) ? null : { url: true };
  };

  private requireImage: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null => {
    const img = (ctrl.get('imageUrl')?.value ?? '').toString().trim();
    const data = (ctrl.get('thumbnailData')?.value ?? '').toString().trim();
    return img || data ? null : { imageRequired: true };
  };
//lightweight validation
  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    ingredients: ['', [Validators.required]],
    instructions: ['', [Validators.required, Validators.minLength(5)]],
    imageUrl: ['', [this.urlLike]],
    thumbnailData: [''] 
  }, { validators: this.requireImage });

  get previewSrc(): string {
    return this.form.value.thumbnailData || this.form.value.imageUrl || '';
  }

  get f() { return this.form.controls; }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(pm => {
        const pid = pm.get('id');
        if (!pid) return of(null);
        this.id = String(pid);
        return this.recipeService.getById(this.id);
      }),
      take(1)
    ).subscribe((r: Recipe | null) => {
      if (!r) return;

// Non-user recipes aren’t editable
      if (!r.isUser && this.id) {
        this.router.navigate(['/recipes', r.id]);
        return;
      }

// If the existing thumbnail is a data URL, put it into thumbnailData, otherwise imageUrl
      const isData = (r.thumbnailUrl || '').startsWith('data:image/');
      this.form.patchValue({
        title: r.title,
        description: r.description,
        ingredients: Array.isArray(r.ingredients)
          ? r.ingredients.join('\n')
          : String(r.ingredients ?? ''),
        instructions: r.instructions,
        imageUrl:  !isData ? (r.thumbnailUrl || '') : '',
        thumbnailData: isData ? (r.thumbnailUrl || '') : ''
      });
    });
  }

// Create or update based on presence of `id`
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const thumbnail = (v.thumbnailData || v.imageUrl || '').trim();

    const payload: Omit<Recipe, 'id'> = {
      title: v.title!.trim(),
      description: v.description!.trim(),
      ingredients: (v.ingredients ?? '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean),
      instructions: v.instructions!.trim(),
      thumbnailUrl: thumbnail,
      favorite: false, 
      isUser: true     
    };

    const req$ = this.id
      ? this.recipeService.update(this.id, payload)
      : this.recipeService.create(payload);

    req$.pipe(take(1)).subscribe({
      next: (saved: any) => {
        this.snack.open(this.id ? 'Recipe updated' : 'Recipe created', 'OK', { duration: 2000 });
        const targetId = String(saved?.id ?? this.id);
        this.router.navigate(['/recipes', targetId]);
      },
      error: () => {
        this.snack.open('Failed to save recipe. Please try again.', 'Dismiss', { duration: 3000 });
      }
    });
  }
//handling file uploads, type/size checks and then reading as data URL
  async onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!this.allowedTypes.includes(file.type)) {
      this.snack.open('Unsupported file type. Use JPEG/PNG/WebP.', 'Dismiss', { duration: 2500 });
      input.value = '';
      return;
    }
    if (file.size > this.maxBytes) {
      this.snack.open(`File too large. Max ${this.maxUploadMB}MB.`, 'Dismiss', { duration: 2500 });
      input.value = '';
      return;
    }

    try {
      const dataUrl = await this.readAsDataURL(file);
      this.form.patchValue({ thumbnailData: dataUrl });
      this.f.thumbnailData.markAsDirty();
      this.snack.open('Photo added', 'OK', { duration: 1500 });
    } catch {
      this.snack.open('Could not read the file.', 'Dismiss', { duration: 2500 });
    }
  }

  clearThumbnail() {
    this.form.patchValue({ imageUrl: '', thumbnailData: '' });
    this.snack.open('Photo removed', 'OK', { duration: 1200 });
  }

  private readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }
}
