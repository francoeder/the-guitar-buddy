import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { Training, Exercise } from '../../models/training.model';
import { AuthService } from '../../core/services/auth.service';
import { ExerciseDialogComponent } from '../../components/dialog/exercise-dialog.component';

@Component({
  selector: 'app-training-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule
  ],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <button mat-stroked-button (click)="back()">
          <mat-icon>arrow_back</mat-icon>
          Back
        </button>
        <div class="space-x-2">
          <button mat-raised-button (click)="cancel()">Cancel</button>
          <button mat-raised-button color="primary" (click)="save()">Save</button>
        </div>
      </div>

      <form [formGroup]="form" class="space-y-4">
        <h2 class="text-xl font-semibold">Training</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <mat-form-field appearance="fill" class="w-full">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" />
          </mat-form-field>
          <mat-form-field appearance="fill" class="w-full">
            <mat-label>Owner</mat-label>
            <input matInput formControlName="owner" />
          </mat-form-field>

          <ng-container *ngIf="showCoverPreview(); else coverInput">
            <div class="md:col-span-2 flex items-center gap-3">
              <img [src]="form.get('cover')?.value" alt="Cover" class="h-24 w-auto object-cover rounded border" />
              <button mat-stroked-button (click)="editCover()">
                <mat-icon>edit</mat-icon>
                Edit
              </button>
            </div>
          </ng-container>
          <ng-template #coverInput>
            <mat-form-field appearance="fill" class="w-full md:col-span-2">
              <mat-label>Cover URL</mat-label>
              <input matInput formControlName="cover" />
            </mat-form-field>
          </ng-template>
          <div class="md:col-span-2 flex items-center gap-3" *ngIf="editingCover || !isImage(form.get('cover')?.value || '')">
            <button mat-stroked-button (click)="coverFileInput.click()">Upload Image</button>
            <input #coverFileInput hidden type="file" accept="image/*" (change)="onCoverSelected($event)" />
          </div>
          <mat-checkbox formControlName="active" class="md:col-span-2">Active</mat-checkbox>
        </div>

        <div class="flex items-center justify-between mt-4">
          <h3 class="font-semibold">Exercises</h3>
          <button mat-raised-button color="secondary" (click)="addExercise()">
            <mat-icon>add</mat-icon>
            Add Exercise
          </button>
        </div>

        <div class="grid gap-4 mt-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3" formArrayName="exercises">
          <mat-card class="shadow" *ngFor="let ex of exercises.controls; let i = index" [formGroupName]="i">
            <ng-container *ngIf="isImage(ex.get('resourceLink')?.value || ''); else noImg">
              <img mat-card-image [src]="ex.get('resourceLink')?.value" alt="Exercício" class="h-40 object-cover" />
            </ng-container>
            <ng-template #noImg>
              <div class="h-40 bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-gray-700">{{ ex.get('title')?.value }}</div>
            </ng-template>

            <div class="px-4 pt-3">
              <div class="text-base font-semibold leading-tight truncate">{{ ex.get('title')?.value }}</div>
              <div class="text-sm text-gray-600">BPM: {{ ex.get('bpm')?.value || 0 }}</div>
              <div class="text-sm text-gray-600">Duration: {{ ex.get('durationMinutes')?.value || 0 }}m {{ ex.get('durationSeconds')?.value || 0 }}s</div>
              <div class="text-sm text-gray-600" *ngIf="(ex.get('breakSeconds')?.value || 0) > 0">Break: {{ ex.get('breakSeconds')?.value }}s</div>
            </div>

            <mat-card-actions class="px-4 py-3 mt-1 flex items-center justify-between">
              <button mat-stroked-button (click)="editExercise(i)">
                <mat-icon>edit</mat-icon>
                Edit
              </button>
              <button mat-stroked-button color="warn" (click)="removeExercise(i)">
                <mat-icon>delete</mat-icon>
                Remove
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </form>
    </div>
  `
})
export class TrainingEditorComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(TrainingService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  @ViewChild('content') content?: ElementRef<HTMLElement>;

  editingCover = false;

  form = this.fb.group({
    _id: ['', Validators.required],
    title: ['', Validators.required],
    owner: [''],
    active: [true],
    cover: [''],
    exercises: this.fb.array([] as ReturnType<typeof this.exerciseGroup>[])
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') as string;
      const existing = this.svc.getById(id);
      const email = this.auth.user()?.email ?? '';
      const training: Training = existing ?? { _id: id, title: 'New Training', owner: email, active: true, cover: '', exercises: [] };
      this.form.patchValue({
        _id: training._id,
        title: training.title,
        owner: training.owner,
        active: training.active,
        cover: training.cover ?? ''
      }, { emitEvent: false });
      const arr = this.fb.array(training.exercises.map(e => this.exerciseGroup(e)));
      this.form.setControl('exercises', arr);
      this.form.get('owner')?.disable({ emitEvent: false });
    });
  }

  get exercises() {
    return this.form.get('exercises') as FormArray;
  }

  back() {
    this.router.navigate(['/']);
  }

  cancel() {
    this.back();
  }

  save() {
    const email = this.auth.user()?.email ?? '';
    this.form.get('owner')?.setValue(email);
    if (this.form.valid) {
      const value = this.form.getRawValue() as Training;
      this.svc.save(value);
      this.back();
    }
  }

  addExercise() {
    const id = (this.exercises.length > 0 ? Math.max(...this.exercises.controls.map(g => g.get('id')?.value as number)) + 1 : 1);
    const ex: Exercise = { id, title: 'Exercise', bpm: 0, durationMinutes: 1, durationSeconds: 0, breakSeconds: 10 };
    const ref = this.dialog.open(ExerciseDialogComponent, { data: ex, width: '600px' });
    ref.afterClosed().subscribe(result => {
      if (result) this.exercises.push(this.exerciseGroup(result as Exercise));
    });
  }

  editExercise(index: number) {
    const group = this.exercises.at(index);
    const current: Exercise = {
      id: group.get('id')?.value as number,
      title: group.get('title')?.value as string,
      resourceLink: group.get('resourceLink')?.value as string,
      bpm: group.get('bpm')?.value as number,
      durationMinutes: group.get('durationMinutes')?.value as number,
      durationSeconds: group.get('durationSeconds')?.value as number,
      breakSeconds: group.get('breakSeconds')?.value as number
    };
    const ref = this.dialog.open(ExerciseDialogComponent, { data: current, width: '600px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        const updated = result as Exercise;
        group.patchValue({
          title: updated.title,
          resourceLink: updated.resourceLink ?? '',
          bpm: updated.bpm,
          durationMinutes: updated.durationMinutes,
          durationSeconds: updated.durationSeconds,
          breakSeconds: updated.breakSeconds
        });
      }
    });
  }

  removeExercise(i: number) {
    this.exercises.removeAt(i);
  }

  onCoverSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.form.get('cover')?.setValue(base64);
      this.editingCover = false;
    };
    reader.readAsDataURL(file);
  }

  showCoverPreview() {
    const link = this.form.get('cover')?.value as string;
    return !!link && this.isImage(link) && !this.editingCover;
  }

  editCover() {
    this.editingCover = true;
  }

  isImage(link?: string) {
    if (!link) return false;
    return link.startsWith('data:image') || /(\.jpeg|\.jpg|\.png|\.webp)$/i.test(link);
  }

  private exerciseGroup(e: Exercise) {
    return this.fb.group({
      id: [e.id, Validators.required],
      title: [e.title, Validators.required],
      resourceLink: [e.resourceLink ?? ''],
      bpm: [e.bpm, [Validators.min(0)]],
      durationMinutes: [e.durationMinutes, [Validators.min(0)]],
      durationSeconds: [e.durationSeconds, [Validators.min(0)]],
      breakSeconds: [e.breakSeconds, [Validators.min(5)]]
    });
  }
}

