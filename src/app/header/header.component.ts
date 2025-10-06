import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  searchCtrl = new FormControl('', { nonNullable: true });
  favOn = false;

  private sub = new Subscription();

   get showSearch(): boolean {
    const tree = this.router.parseUrl(this.router.url);
    const segs = tree.root.children['primary']?.segments.map(s => s.path) ?? [];
    return !(segs[0] === 'recipes' && segs.length >= 2);
  }

  ngOnInit(): void {
// URL → component state 
    const qp$ = this.route.queryParamMap.pipe(
      startWith(this.route.snapshot.queryParamMap)
    );
    this.sub.add(
      qp$.subscribe(p => {
        const q = (p.get('q') ?? '').trim();
        const fav = (p.get('fav') ?? '').toLowerCase();
// seting input without looping back into valueChanges
        this.searchCtrl.setValue(q, { emitEvent: false });
        this.favOn = fav === '1' || fav === 'true' || p.has('fav');
      })
    );

// input → URL 
    this.sub.add(
      this.searchCtrl.valueChanges
        .pipe(debounceTime(200), distinctUntilChanged())
        .subscribe(val => {
          const q = (val ?? '').trim();
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { q: q || null },   
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        })
    );
  }

// Toggling favorites filter in URL while preserving current search text
  toggleFav(): void {
    const q = (this.searchCtrl.value ?? '').trim() || null;
    if (this.favOn) {
      this.router.navigate(['/recipes'], {
        queryParams: { q, fav: null },      
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    } else {
      this.router.navigate(['/recipes'], {
        queryParams: { q, fav: 1 },       
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

// Clears the search box and removes ?q from URL
  clearSearch(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
