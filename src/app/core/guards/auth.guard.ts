import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  const user = await auth.authStateOnce();
  return user ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
