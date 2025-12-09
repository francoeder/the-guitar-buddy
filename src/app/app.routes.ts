import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { TrainingRunnerComponent } from './components/runner/training-runner.component';
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AuthGuard } from './core/guards/auth.guard';
import { TrainingEditorComponent } from './features/training-editor/training-editor.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'run/:id', component: TrainingRunnerComponent },
  { path: 'training/:id', component: TrainingEditorComponent, canActivate: [AuthGuard] }
];
