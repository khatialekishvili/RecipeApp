import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap, switchMap, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { Recipe } from '../models/recipe';

const BASE_URL = 'http://localhost:3000/recipes';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private http = inject(HttpClient);

// In-memory cache + public stream/signal
  private recipesSubject = new BehaviorSubject<Recipe[]>([]);
  readonly recipes$ = this.recipesSubject.asObservable();
  readonly recipesSig = toSignal(this.recipes$, { initialValue: [] as Recipe[] });

getAll(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(BASE_URL).pipe(
      tap(list => this.recipesSubject.next(list)),
      catchError(this.handleError)
    );
  }

  getById(id: number | string): Observable<Recipe> {
    const idStr = String(id);
    return this.http
      .get<Recipe>(`${BASE_URL}/${encodeURIComponent(idStr)}`)
      .pipe(catchError(this.handleError));
  }

// Client-side search (using cache if present, otherwise loads then filters)
  search(term: string): Observable<Recipe[]> {
    const t = (term ?? '').trim().toLowerCase();
    if (!t) return this.getAll();

    const source$ = this.recipesSubject.value.length ? of(this.recipesSubject.value) : this.getAll();
    return source$.pipe(
      map(list => list.filter(r => {
        const title = (r.title ?? '').toLowerCase();
        const desc  = (r.description ?? '').toLowerCase();
        const ingr  = Array.isArray(r.ingredients)
          ? r.ingredients.some(i => (i ?? '').toLowerCase().includes(t))
          : String(r.ingredients ?? '').toLowerCase().includes(t);
        return title.includes(t) || desc.includes(t) || ingr;
      })),
      catchError(this.handleError)
    );
  }

  create(payload: Omit<Recipe, 'id'>): Observable<Recipe> {
    const withFlag = { ...payload, isUser: true };
    return this.http.post<Recipe>(BASE_URL, withFlag).pipe(
      tap(newItem => this.recipesSubject.next([...this.recipesSubject.value, newItem])),
      catchError(this.handleError)
    );
  }

  update(id: number | string, changes: Partial<Recipe>): Observable<Recipe> {
    const idStr = String(id);
    return this.http.patch<Recipe>(`${BASE_URL}/${encodeURIComponent(idStr)}`, changes).pipe(
      tap(updated => this.recipesSubject.next(
        this.recipesSubject.value.map(r => String(r.id) === idStr ? { ...r, ...updated } : r)
      )),
      catchError(this.handleError)
    );
  }

// DELETE for user-created items
  delete(id: number | string): Observable<void> {
    const idStr = String(id);
    return this.getById(idStr).pipe(
      switchMap(item => {
        if (item?.isUser) {
          return this.http.delete<void>(`${BASE_URL}/${encodeURIComponent(idStr)}`).pipe(
            tap(() => this.recipesSubject.next(
              this.recipesSubject.value.filter(r => String(r.id) !== idStr)
            ))
          );
        } else {
          this.recipesSubject.next(
            this.recipesSubject.value.filter(r => String(r.id) !== idStr)
          );
          return of(void 0);
        }
      }),
      catchError(this.handleError)
    );
  }

  toggleFavorite(id: number | string, favorite: boolean): Observable<Recipe> {
    const idStr = String(id);
    return this.http.patch<Recipe>(`${BASE_URL}/${encodeURIComponent(idStr)}`, { favorite }).pipe(
      tap(updated => this.recipesSubject.next(
        this.recipesSubject.value.map(r =>
          String(r.id) === idStr ? { ...r, favorite: updated.favorite } : r
        )
      )),
      catchError(this.handleError)
    );
  }

  private handleError(err: HttpErrorResponse) {
    const status = err?.status ?? 'Unknown';
    const text = err?.statusText || 'Error';
    const fromBody = typeof err?.error === 'string' ? err.error : err?.error?.message;
    const msg = fromBody || `Request failed (${status} ${text}).`;
    return throwError(() => new Error(msg));
  }
}
