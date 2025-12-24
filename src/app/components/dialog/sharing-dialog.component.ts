import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TrainingService } from '../../services/training.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Training } from '../../models/training.model';

interface AccessUser {
  email: string;
  name?: string;
  role: 'owner' | 'editor';
  isCurrentUser: boolean;
  avatarLetter: string;
  isPendingRemoval?: boolean;
}

@Component({
  selector: 'app-sharing-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatDialogModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule, 
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <div class="flex flex-col h-full max-h-[80vh]">
      <!-- Header -->
      <div class="flex justify-between items-start mb-4 px-6 pt-6">
        <h2 class="text-2xl font-normal text-gray-800 m-0 line-clamp-1" [title]="training()?.title">
          {{ training()?.title }}
        </h2>
      </div>

      <mat-dialog-content class="!px-6 !pb-2 flex-1">
        <!-- Add People Input -->
        <div class="mb-6">
          <div class="relative" [formGroup]="form">
            <input 
              type="text" 
              formControlName="email"
              (keyup.enter)="add()"
              [placeholder]="'dialogs.sharing.addPeoplePlaceholder' | translate"
              class="w-full border border-gray-300 rounded p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              [class.border-red-500]="form.get('email')?.invalid && form.get('email')?.touched"
            >
            <div class="absolute right-2 top-1/2 -translate-y-1/2" *ngIf="form.get('email')?.valid && form.get('email')?.value">
               <button mat-icon-button (click)="add()" [disabled]="processing()">
                 <mat-icon>person_add</mat-icon>
               </button>
            </div>
          </div>
          <div class="text-red-500 text-xs mt-1" *ngIf="form.get('email')?.hasError('pattern') && form.get('email')?.touched">
            {{ 'dialogs.sharing.gmailRequired' | translate }}
          </div>
        </div>

        <!-- People with access -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-600 mb-2">{{ 'dialogs.sharing.whoHasAccess' | translate }}</h3>
          
          <div class="flex flex-col gap-3">
            @for (user of peopleWithAccess(); track user.email) {
              <div class="flex items-center justify-between group" [class.opacity-50]="user.isPendingRemoval">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-sm">
                    {{ user.avatarLetter }}
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-gray-900" [class.line-through]="user.isPendingRemoval">
                      {{ user.name || user.email.split('@')[0] }} 
                      <span *ngIf="user.isCurrentUser" class="text-gray-500 font-normal">({{ 'dialogs.sharing.you' | translate }})</span>
                    </span>
                    <span class="text-xs text-gray-500" [class.line-through]="user.isPendingRemoval">{{ user.email }}</span>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500 italic mr-2">
                    {{ user.role === 'owner' ? ('dialogs.sharing.owner' | translate) : '' }}
                  </span>
                  
                  @if (user.role !== 'owner') {
                    <button mat-icon-button 
                            class="text-gray-400 hover:text-gray-600 transition-opacity" 
                            [class.opacity-0]="!user.isPendingRemoval"
                            [class.group-hover:opacity-100]="!user.isPendingRemoval"
                            (click)="remove(user.email)" 
                            [disabled]="processing()"
                            [title]="(user.isPendingRemoval ? 'dialogs.sharing.undo' : 'common.remove') | translate">
                      <mat-icon>{{ user.isPendingRemoval ? 'undo' : 'delete' }}</mat-icon>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- General Access -->
        <div class="mb-4">
          <h3 class="text-sm font-medium text-gray-600 mb-2">{{ 'dialogs.sharing.generalAccess' | translate }}</h3>
          
          <div class="flex items-center gap-3 p-1 pl-2 -ml-2 rounded hover:bg-gray-100 transition-colors">
            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 shrink-0">
              <mat-icon class="!w-5 !h-5 text-[20px]">{{ isPublic() ? 'public' : 'lock' }}</mat-icon>
            </div>
            
            <div class="flex-1 min-w-0">
              <mat-form-field appearance="outline" class="w-full dense-form-field -mb-4">
                <mat-select [formControl]="accessControl" (selectionChange)="onAccessChange($event)" panelClass="sharing-select-panel" [disabled]="processing()">
                  <mat-select-trigger>
                    <span class="font-medium text-sm">{{ (isPublic() ? 'dialogs.sharing.public' : 'dialogs.sharing.restricted') | translate }}</span>
                  </mat-select-trigger>
                  <mat-option value="restricted" class="!h-10 !text-sm">
                    <div class="flex items-center gap-2">
                       <mat-icon class="!w-4 !h-4 text-[16px] opacity-0" [class.opacity-100]="accessControl.value === 'restricted'">check</mat-icon>
                       <span class="font-medium">{{ 'dialogs.sharing.restricted' | translate }}</span>
                    </div>
                  </mat-option>
                  <mat-option value="public" class="!h-10 !text-sm">
                    <div class="flex items-center gap-2">
                       <mat-icon class="!w-4 !h-4 text-[16px] opacity-0" [class.opacity-100]="accessControl.value === 'public'">check</mat-icon>
                       <span class="font-medium">{{ 'dialogs.sharing.public' | translate }}</span>
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <p class="text-xs text-gray-500 mt-1 ml-1 truncate">
                {{ (isPublic() ? 'dialogs.sharing.publicDescription' : 'dialogs.sharing.restrictedDescription') | translate }}
              </p>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <!-- Footer -->
      <div class="p-4 px-6 flex justify-between items-center border-t border-gray-200 mt-auto">
        <button mat-stroked-button class="!rounded-full border-gray-300 text-blue-600" (click)="copyLink()">
          <mat-icon class="!mr-1">link</mat-icon> {{ 'dialogs.sharing.copyLink' | translate }}
        </button>
        
        <div class="flex items-center gap-4">
            <div *ngIf="pendingRemovals().size > 0" class="text-sm text-gray-500 italic">
                {{ 'dialogs.sharing.pendingChanges' | translate }}
            </div>
            <button mat-flat-button color="primary" class="!rounded-full !px-6" (click)="saveChanges()">
              {{ (pendingRemovals().size > 0 ? 'dialogs.sharing.save' : 'dialogs.sharing.done') | translate }}
            </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      /* Remove default padding from mat-dialog-container if possible via global styles, but here we use classes */
    }
    ::ng-deep .dense-form-field .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
    ::ng-deep .dense-form-field .mat-mdc-text-field-wrapper {
      padding: 0;
      background: transparent;
    }
    ::ng-deep .dense-form-field .mat-mdc-form-field-flex {
      background-color: transparent !important;
      padding: 0 !important;
      align-items: center;
      height: auto !important;
    }
    ::ng-deep .dense-form-field .mdc-notched-outline {
      display: none !important;
    }
    ::ng-deep .dense-form-field .mat-mdc-form-field-infix {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      min-height: unset !important;
      border-top: none !important;
      width: auto !important;
    }
    ::ng-deep .dense-form-field .mat-mdc-select-trigger {
      font-weight: 500;
      color: #374151; /* gray-700 */
    }
    ::ng-deep .dense-form-field .mat-mdc-select-arrow {
      color: #374151; /* gray-700 */
    }
    /* Custom input styling to remove Material underline/box if we used native input inside container */
  `]
})
export class SharingDialogComponent {
  private fb = inject(FormBuilder);
  private svc = inject(TrainingService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private dialogRef = inject(MatDialogRef<SharingDialogComponent>);
  private data = inject<Training>(MAT_DIALOG_DATA);
  
  // Reactively track the training
  training = computed(() => this.svc.getById(this.data._id));
  sharedWith = computed(() => this.training()?.sharedWith ?? []);
  isPublic = computed(() => this.training()?.isPublic ?? false);
  
  processing = signal(false);
  pendingRemovals = signal<Set<string>>(new Set());

  // Access Control (Restricted vs Public)
  accessControl = this.fb.control('restricted');

  form = this.fb.group({
    email: ['', [Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)]]
  });

  peopleWithAccess = computed<AccessUser[]>(() => {
    const t = this.training();
    if (!t) return [];

    const currentUserEmail = this.auth.user()?.email;
    const pending = this.pendingRemovals();
    const users: AccessUser[] = [];

    // Owner
    if (t.owner) {
      users.push({
        email: t.owner,
        name: t.ownerName,
        role: 'owner',
        isCurrentUser: t.owner === currentUserEmail,
        avatarLetter: (t.ownerName?.[0] || t.owner[0]).toUpperCase()
      });
    }

    // Shared Users
    const shared = t.sharedWith || [];
    shared.forEach(email => {
      // Avoid duplicate if owner is somehow in sharedWith list (shouldn't happen but safe to check)
      if (email !== t.owner) {
        users.push({
          email: email,
          role: 'editor',
          isCurrentUser: email === currentUserEmail,
          avatarLetter: email[0].toUpperCase(),
          isPendingRemoval: pending.has(email)
        });
      }
    });

    return users;
  });

  constructor() {
    effect(() => {
      const pub = this.isPublic();
      this.accessControl.setValue(pub ? 'public' : 'restricted', { emitEvent: false });
    });
  }

  async onAccessChange(event: any) {
    const isPublic = event.value === 'public';
    await this.togglePublic(isPublic);
  }

  async togglePublic(isPublic: boolean) {
    if (this.processing()) return;
    this.processing.set(true);
    try {
      await this.svc.updatePublicStatus(this.data._id, isPublic);
      this.snack.open(
        this.translate.instant('common.done'), 
        this.translate.instant('common.close'), 
        { duration: 2000 }
      );
    } catch (err) {
      console.error(err);
      this.snack.open(
        this.translate.instant('dialogs.sharing.errorUpdating'), 
        this.translate.instant('common.close'), 
        { duration: 3000 }
      );
      // Revert if error
      this.accessControl.setValue(isPublic ? 'restricted' : 'public', { emitEvent: false });
    } finally {
      this.processing.set(false);
    }
  }

  async add() {
    if (this.form.invalid || !this.form.value.email) return;
    
    const email = this.form.value.email;
    if (this.processing()) return;

    // Check if user is in pending removals list, if so, just restore them
    if (this.pendingRemovals().has(email)) {
        this.remove(email); // Toggle back (restore)
        this.form.reset();
        return;
    }

    // Check if already shared or owner
    const t = this.training();
    if (t?.owner === email || t?.sharedWith?.includes(email)) {
       this.form.reset();
       return;
    }

    this.processing.set(true);
    try {
      await this.svc.share(this.data._id, email);
      this.snack.open(
        this.translate.instant('dialogs.sharing.accessGranted'), 
        this.translate.instant('common.close'), 
        { duration: 3000 }
      );
      this.form.reset();
    } catch (err) {
      console.error(err);
      this.snack.open(
        this.translate.instant('dialogs.sharing.errorSharing'), 
        this.translate.instant('common.close'), 
        { duration: 3000 }
      );
    } finally {
      this.processing.set(false);
    }
  }

  remove(email: string) {
    this.pendingRemovals.update(set => {
        const newSet = new Set(set);
        if (newSet.has(email)) {
            newSet.delete(email);
        } else {
            newSet.add(email);
        }
        return newSet;
    });
  }

  async saveChanges() {
      const pending = this.pendingRemovals();
      
      // If no pending changes, just close
      if (pending.size === 0) {
          this.dialogRef.close();
          return;
      }

      this.processing.set(true);
      try {
          const promises = Array.from(pending).map(email => this.svc.unshare(this.data._id, email));
          await Promise.all(promises);
          
          this.snack.open(
            this.translate.instant('dialogs.sharing.accessRevoked'), 
            this.translate.instant('common.close'), 
            { duration: 3000 }
          );
          this.dialogRef.close();
      } catch (err) {
          console.error(err);
          this.snack.open(
            this.translate.instant('dialogs.sharing.errorRevoking'), 
            this.translate.instant('common.close'), 
            { duration: 3000 }
          );
      } finally {
          this.processing.set(false);
      }
  }

  copyLink() {
    const url = `${window.location.origin}/trainings?shared=${this.data._id}`;
    navigator.clipboard.writeText(url);
    this.snack.open(
      this.translate.instant('dialogs.sharing.linkCopied'), 
      this.translate.instant('common.close'), 
      { duration: 3000 }
    );
  }
}
