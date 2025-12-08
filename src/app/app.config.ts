import { ApplicationConfig, InjectionToken, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { environment } from '../environments/environment';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
export const FIREBASE_DB = new InjectionToken<Firestore>('FIREBASE_DB');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideNoopAnimations(),
    provideHttpClient(),
    { provide: FIREBASE_APP, useFactory: () => initializeApp(environment.firebase) },
    { provide: FIREBASE_AUTH, useFactory: () => getAuth(inject(FIREBASE_APP)) },
    { provide: FIREBASE_DB, useFactory: () => getFirestore(inject(FIREBASE_APP)) }
  ]
};
