import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { GlobalHeaderComponent } from './global-header/global-header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalHeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private translate = inject(TranslateService);

  constructor() {
    this.translate.setDefaultLang('sr');
    let lang = 'sr';
    try { lang = localStorage.getItem('demographicsapp-lang') === 'en' ? 'en' : 'sr'; } catch { /* ignore */ }
    this.translate.use(lang);
  }
}