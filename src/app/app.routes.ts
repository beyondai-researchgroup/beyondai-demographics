import { Routes } from '@angular/router';
import { sessionGuard } from './guards/session.guard';

export const routes: Routes = [
  // Participants arrive exclusively via the emailed /link/:token — the bare root shows an
  // explanation instead of a login form, same pattern as REI-40/Big Five's own AccessInfo page.
  {
    path: '',
    loadComponent: () => import('./access-info/access-info.component').then(m => m.AccessInfoComponent),
  },
  {
    path: 'link/:token',
    loadComponent: () => import('./link-access/link-access.component').then(m => m.LinkAccessComponent),
  },
  {
    path: 'form',
    loadComponent: () => import('./form/form.component').then(m => m.FormComponent),
    canActivate: [sessionGuard],
  },
  {
    path: 'done',
    loadComponent: () => import('./done/done.component').then(m => m.DoneComponent),
  },
  { path: '**', redirectTo: '' },
];
