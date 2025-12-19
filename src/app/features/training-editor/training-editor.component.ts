import { Component, inject, ViewChild, ViewChildren, ElementRef, QueryList, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DragDropModule, CdkDragDrop, CdkDragMove } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { Training, Exercise } from '../../models/training.model';
import { AuthService } from '../../core/services/auth.service';
import { ExerciseDialogComponent } from '../../components/dialog/exercise-dialog.component';
import { SharingDialogComponent } from '../../components/dialog/sharing-dialog.component';
import { SafeResourcePipe } from '../../pipes/safe-resource.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { MatMenuModule } from '@angular/material/menu';

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
    MatDialogModule,
    DragDropModule,
    SafeResourcePipe,
    TranslateModule
  ],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <button mat-stroked-button (click)="back()">
          <mat-icon>arrow_back</mat-icon>
          {{ 'common.back' | translate }}
        </button>
        <div class="space-x-2 flex items-center">
          <button mat-icon-button (click)="share()" *ngIf="canShare()">
             <mat-icon>share</mat-icon>
          </button>
          <button mat-raised-button (click)="cancel()">{{ 'common.cancel' | translate }}</button>
          <button mat-raised-button color="primary" (click)="save()">{{ 'common.save' | translate }}</button>
        </div>
      </div>

      <form [formGroup]="form" class="space-y-4">
        <h2 class="text-xl font-semibold">{{ 'dialogs.training.title' | translate }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <mat-form-field appearance="fill" class="w-full">
            <mat-label>{{ 'common.title' | translate }}</mat-label>
            <input matInput formControlName="title" />
          </mat-form-field>
          <mat-form-field appearance="fill" class="w-full">
            <mat-label>{{ 'common.owner' | translate }}</mat-label>
            <input matInput formControlName="owner" />
          </mat-form-field>

          <ng-container *ngIf="showCoverPreview(); else coverInput">
            <div class="md:col-span-2 flex items-center gap-3">
              <img [src]="form.get('cover')?.value" [alt]="'common.cover' | translate" class="h-24 w-auto object-cover rounded border" />
              <button mat-stroked-button (click)="editCover()">
                <mat-icon>edit</mat-icon>
                {{ 'common.edit' | translate }}
              </button>
            </div>
          </ng-container>
          <ng-template #coverInput>
            <mat-form-field appearance="fill" class="w-full md:col-span-2">
              <mat-label>{{ 'common.coverUrl' | translate }}</mat-label>
              <input matInput formControlName="cover" />
            </mat-form-field>
          </ng-template>
          <div class="md:col-span-2 flex items-center gap-3" *ngIf="editingCover || !isImage(form.get('cover')?.value || '')">
            <button mat-stroked-button (click)="coverFileInput.click()">{{ 'common.uploadImage' | translate }}</button>
            <input #coverFileInput hidden type="file" accept="image/*" (change)="onCoverSelected($event)" />
          </div>
          <mat-checkbox formControlName="active" class="md:col-span-2">{{ 'common.active' | translate }}</mat-checkbox>
        </div>

        <div class="flex items-center justify-between mt-4">
          <h3 class="font-semibold">{{ 'common.exercises' | translate }}</h3>
          <button mat-raised-button color="secondary" (click)="addExercise()">
            <mat-icon>add</mat-icon>
            {{ 'common.addExercise' | translate }}
          </button>
        </div>

        <div class="flex flex-col gap-4 mt-3" formArrayName="exercises" cdkDropList (cdkDropListDropped)="drop($event)">
          <ng-container *ngFor="let ex of exercises.controls; let i = index">
            <mat-card class="shadow" [formGroupName]="i" cdkDrag #cardEl>
              <ng-template cdkDragPlaceholder>
                <div class="slot-placeholder"></div>
              </ng-template>

              <div class="p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div class="w-full h-24 md:h-32 overflow-hidden rounded">
                  <ng-container *ngIf="isImage(ex.get('resourceLink')?.value || ''); else mediaIframe">
                    <img [src]="ex.get('resourceLink')?.value" [alt]="'common.exercise' | translate" class="w-full h-full object-cover" />
                  </ng-container>
                  <ng-template #mediaIframe>
                    <ng-container *ngIf="ex.get('resourceLink')?.value; else mediaPlaceholder">
                      <iframe class="w-full h-full" [src]="resolveMediaSrc(ex.get('resourceLink')?.value) | safeResource" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </ng-container>
                    <ng-template #mediaPlaceholder>
                      <div class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-gray-700">{{ ex.get('title')?.value }}</div>
                    </ng-template>
                  </ng-template>
                </div>

                <div class="space-y-1">
                  <div class="text-base font-semibold leading-tight truncate">{{ ex.get('title')?.value }}</div>
                  <div class="text-sm text-gray-600">{{ 'common.bpm' | translate }}: {{ ex.get('bpm')?.value || 0 }}</div>
                  <div class="text-sm text-gray-600">{{ 'common.duration' | translate }}: {{ ex.get('durationMinutes')?.value || 0 }}m {{ ex.get('durationSeconds')?.value || 0 }}s</div>
                  <div class="text-sm text-gray-600" *ngIf="(ex.get('breakSeconds')?.value || 0) > 0">{{ 'common.break' | translate }}: {{ ex.get('breakSeconds')?.value }}s</div>
                  <div class="text-sm text-gray-600">{{ 'common.beatAccent' | translate }}: {{ ex.get('beatStyle')?.value || 'none' }}</div>
                  <div class="text-sm text-gray-600">{{ 'dialogs.exercise.prepMeasures' | translate }}: {{ ex.get('prepMeasures')?.value ?? 2 }} {{ 'common.measures' | translate }}</div>
                </div>

                <div class="flex flex-col gap-2 items-end">
                  <button mat-stroked-button (click)="editExercise(i)">
                    <mat-icon>edit</mat-icon>
                    {{ 'common.edit' | translate }}
                  </button>
                  <button mat-stroked-button color="warn" (click)="removeExercise(i)">
                    <mat-icon>delete</mat-icon>
                    {{ 'common.remove' | translate }}
                  </button>
                </div>
              </div>
            </mat-card>
          </ng-container>
        </div>
      </form>
    </div>
  `,
  styles: [
    `.slot-placeholder{min-height:120px;border:2px dashed #60a5fa;background:#eff6ff;border-radius:8px}`,
    `.origin-placeholder{min-height:0 !important;height:0 !important;padding:0 !important;margin:0 !important;border:none !important}`
  ]
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
  unsaved = signal(false);
  private bootstrapping = true;
  private trackingSetup = false;

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
      const applyTraining = (training: Training) => {
        this.form.patchValue({
          _id: training._id,
          title: training.title,
          owner: training.owner,
          active: training.active,
          cover: training.cover ?? ''
        }, { emitEvent: false });
        const arr = this.fb.array(training.exercises.map(e => this.exerciseGroup(e)));
        this.form.setControl('exercises', arr);
        arr.controls.forEach(g => this.tryAutoFillDuration(g as FormGroup));
        this.form.get('owner')?.disable({ emitEvent: false });
        if (!this.trackingSetup) {
          this.form.valueChanges.subscribe(() => {
            if (!this.bootstrapping) this.unsaved.set(true);
          });
          (this.form.get('exercises') as FormArray).valueChanges.subscribe(() => {
            if (!this.bootstrapping) this.unsaved.set(true);
          });
          this.trackingSetup = true;
        }
        this.bootstrapping = false;
      };
      if (existing) {
        applyTraining(existing);
      } else {
        this.svc.getByIdOnce(id).then(t => {
          if (t) {
            applyTraining(t);
          } else {
            applyTraining({ _id: id, title: 'New Training', owner: email, active: true, cover: '', exercises: [] });
          }
        });
      }
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(ev: BeforeUnloadEvent) {
    if (this.form.dirty || this.unsaved()) {
      ev.preventDefault();
      ev.returnValue = '';
    }
  }

  get exercises() {
    return this.form.get('exercises') as FormArray;
  }

  back() {
    this.router.navigate(['/']);
  }

  canShare() {
    const data = this.form.getRawValue();
    const isOwner = !data.owner || data.owner === (this.auth.user()?.email ?? '');
    return !!data._id && !this.unsaved() && isOwner;
  }

  share() {
     const data = this.form.getRawValue();
     this.dialog.open(SharingDialogComponent, {
       data: { ...data } as any,
       width: '450px'
     });
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
      this.unsaved.set(false);
      this.form.markAsPristine();
      this.back();
    }
  }

  addExercise() {
    const id = (this.exercises.length > 0 ? Math.max(...this.exercises.controls.map(g => g.get('id')?.value as number)) + 1 : 1);
    const ex: Exercise = { id, title: 'Exercise', bpm: 0, durationMinutes: 0, durationSeconds: 0, breakSeconds: 10, beatStyle: 'none', prepMeasures: 2 };
    const ref = this.dialog.open(ExerciseDialogComponent, { data: ex, width: '95vw', maxWidth: '750px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        const g = this.exerciseGroup(result as Exercise);
        this.exercises.push(g);
        this.tryAutoFillDuration(g);
        this.unsaved.set(true);
        this.form.markAsDirty();
      }
    });
  }

  editExercise(index: number) {
    const group = this.exercises.at(index) as FormGroup;
    const current: Exercise = {
      id: group.get('id')?.value as number,
      title: group.get('title')?.value as string,
      resourceLink: group.get('resourceLink')?.value as string,
      bpm: group.get('bpm')?.value as number,
      durationMinutes: group.get('durationMinutes')?.value as number,
      durationSeconds: group.get('durationSeconds')?.value as number,
      breakSeconds: group.get('breakSeconds')?.value as number,
      beatStyle: group.get('beatStyle')?.value as Exercise['beatStyle'],
      prepMeasures: group.get('prepMeasures')?.value as 0 | 1 | 2
    };
    const ref = this.dialog.open(ExerciseDialogComponent, { data: current, width: '95vw', maxWidth: '750px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        const updated = result as Exercise;
        group.patchValue({
          title: updated.title,
          resourceLink: updated.resourceLink ?? '',
          bpm: updated.bpm,
          durationMinutes: updated.durationMinutes,
          durationSeconds: updated.durationSeconds,
          breakSeconds: updated.breakSeconds,
          beatStyle: updated.beatStyle ?? 'none'
          , prepMeasures: updated.prepMeasures ?? 2
        });
        this.tryAutoFillDuration(group);
        this.unsaved.set(true);
        this.form.markAsDirty();
      }
    });
  }

  private async tryAutoFillDuration(group: FormGroup) {
    const link = (group.get('resourceLink')?.value as string) || '';
    const mins = (group.get('durationMinutes')?.value as number) || 0;
    const secs = (group.get('durationSeconds')?.value as number) || 0;
    if (!link || (mins > 0 || secs > 0)) return;
    const duration = await this.fetchDurationFromProvider(link);
    if (duration && duration > 0) {
      const m = Math.floor(duration / 60);
      const s = Math.round(duration % 60);
      group.patchValue({ durationMinutes: m, durationSeconds: s });
    }
  }

  private async fetchDurationFromProvider(link: string): Promise<number | null> {
    try {
      if (this.isVimeoLink(link)) {
        const url = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(link)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json() as { duration?: number };
        return typeof data.duration === 'number' ? data.duration : null;
      }
      if (this.isDailymotionLink(link)) {
        const url = `https://www.dailymotion.com/services/oembed?format=json&url=${encodeURIComponent(link)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json() as { duration?: number };
        return typeof data.duration === 'number' ? data.duration : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  removeExercise(i: number) {
    this.exercises.removeAt(i);
    this.unsaved.set(true);
    this.form.markAsDirty();
  }

  drop(event: CdkDragDrop<FormGroup[]>) {
    const prev = event.previousIndex;
    let curr = event.currentIndex;
    if (prev === curr) return;
    const ctrl = this.exercises.at(prev);
    this.exercises.removeAt(prev);
    if (prev < curr) curr--; // adjust target after removal
    this.exercises.insert(curr, ctrl);
    this.unsaved.set(true);
    this.form.markAsDirty();
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
      this.unsaved.set(true);
      this.form.markAsDirty();
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
      breakSeconds: [e.breakSeconds, [Validators.min(5)]],
      beatStyle: [e.beatStyle ?? 'none'],
      prepMeasures: [e.prepMeasures ?? 2]
    });
  }

  resolveMediaSrc(link?: string): string {
    if (!link) return '';
    if (this.isYouTubeLink(link)) {
      const embed = this.toYouTubeEmbed(link);
      return embed || link;
    }
    if (this.isVimeoLink(link)) {
      const embed = this.toVimeoEmbed(link);
      return embed || link;
    }
    if (this.isDailymotionLink(link)) {
      const embed = this.toDailymotionEmbed(link);
      return embed || link;
    }
    if (this.isFacebookLink(link)) {
      const embed = this.toFacebookEmbed(link);
      return embed || link;
    }
    if (this.isGoogleDriveLink(link)) {
      const embed = this.toGoogleDriveEmbed(link);
      return embed || link;
    }
    return link;
  }

  private isYouTubeLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)youtube\.com$/i.test(u.hostname) || /(^|\.)youtu\.be$/i.test(u.hostname);
    } catch {
      return /youtube\.com|youtu\.be/i.test(link);
    }
  }

  private toYouTubeEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      const host = u.hostname;
      if (/(^|\.)youtube\.com$/i.test(host)) {
        if (u.pathname.startsWith('/embed/')) return link;
        const vid = u.searchParams.get('v');
        if (vid) return `https://www.youtube.com/embed/${vid}`;
        const m = u.pathname.match(/\/shorts\/([\w-]+)/i);
        if (m) return `https://www.youtube.com/embed/${m[1]}`;
      }
      if (/(^|\.)youtu\.be$/i.test(host)) {
        const id = u.pathname.replace(/^\//, '');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      return null;
    } catch {
      const be = link.match(/youtu\.be\/([\w-]+)/i);
      if (be) return `https://www.youtube.com/embed/${be[1]}`;
      const yt = link.match(/[?&]v=([\w-]+)/i);
      if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
      return null;
    }
  }

  private isVimeoLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)vimeo\.com$/i.test(u.hostname);
    } catch {
      return /vimeo\.com/i.test(link);
    }
  }

  private toVimeoEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      const p = u.pathname;
      const albumVideo = p.match(/\/album\/\d+\/video\/(\d+)/i);
      if (albumVideo && albumVideo[1]) return `https://player.vimeo.com/video/${albumVideo[1]}`;
      const channelsVideo = p.match(/\/channels\/[^/]+\/(\d+)/i);
      if (channelsVideo && channelsVideo[1]) return `https://player.vimeo.com/video/${channelsVideo[1]}`;
      const directId = p.match(/\/(\d+)/);
      if (directId && directId[1]) return `https://player.vimeo.com/video/${directId[1]}`;
      return null;
    } catch {
      const m = link.match(/vimeo\.com\/(\d+)/i);
      if (m && m[1]) return `https://player.vimeo.com/video/${m[1]}`;
      const av = link.match(/album\/\d+\/video\/(\d+)/i);
      if (av && av[1]) return `https://player.vimeo.com/video/${av[1]}`;
      return null;
    }
  }

  private isDailymotionLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)dailymotion\.com$/i.test(u.hostname) || /(^|\.)dai\.ly$/i.test(u.hostname);
    } catch {
      return /dailymotion\.com|dai\.ly/i.test(link);
    }
  }

  private toDailymotionEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      if (/(^|\.)dai\.ly$/i.test(u.hostname)) {
        const id = u.pathname.replace(/^\//, '');
        if (id) return `https://www.dailymotion.com/embed/video/${id}`;
      }
      const m = u.pathname.match(/\/video\/([\w-]+)/i);
      if (m && m[1]) return `https://www.dailymotion.com/embed/video/${m[1]}`;
      return null;
    } catch {
      const short = link.match(/dai\.ly\/([\w-]+)/i);
      if (short && short[1]) return `https://www.dailymotion.com/embed/video/${short[1]}`;
      const long = link.match(/dailymotion\.com\/video\/([\w-]+)/i);
      if (long && long[1]) return `https://www.dailymotion.com/embed/video/${long[1]}`;
      return null;
    }
  }

  private isFacebookLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)facebook\.com$/i.test(u.hostname);
    } catch {
      return /facebook\.com/i.test(link);
    }
  }

  private toFacebookEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      const href = encodeURIComponent(u.toString());
      return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=0`;
    } catch {
      const href = encodeURIComponent(link);
      return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=0`;
    }
  }

  private isGoogleDriveLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)drive\.google\.com$/i.test(u.hostname) || /(^|\.)docs\.google\.com$/i.test(u.hostname);
    } catch {
      return /drive\.google\.com|docs\.google\.com/i.test(link);
    }
  }

  private toGoogleDriveEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      if (/drive\.google\.com$/i.test(u.hostname) || /docs\.google\.com$/i.test(u.hostname)) {
        const fileIdPath = u.pathname.match(/\/file\/d\/([^/]+)/i);
        if (fileIdPath && fileIdPath[1]) return `https://drive.google.com/file/d/${fileIdPath[1]}/preview`;
        const idParam = u.searchParams.get('id');
        if (idParam) return `https://drive.google.com/file/d/${idParam}/preview`;
      }
      return null;
    } catch {
      const pathId = link.match(/\/file\/d\/([^/]+)/i);
      if (pathId && pathId[1]) return `https://drive.google.com/file/d/${pathId[1]}/preview`;
      const queryId = link.match(/[?&]id=([^&]+)/i);
      if (queryId && queryId[1]) return `https://drive.google.com/file/d/${queryId[1]}/preview`;
      return null;
    }
  }
}
