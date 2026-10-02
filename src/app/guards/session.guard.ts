import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StateService } from '../services/state.service';

export const sessionGuard: CanActivateFn = () => {
  const state = inject(StateService);
  const router = inject(Router);
  return state.state() ? true : router.createUrlTree(['/']);
};
