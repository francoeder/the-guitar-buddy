  import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { Training } from '../models/training.model';
import { FIREBASE_DB } from '../app.config';
import { AuthService } from '../core/services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { 
  type Firestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  collectionGroup, 
  query, 
  where, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  orderBy, 
  limit,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private db: Firestore = inject(FIREBASE_DB);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private trainingsSignal = signal<Training[]>([]);
  private publicTrainingsSignal = signal<Training[]>([]);
  private unsubscribe: (() => void) | null = null;
  private unsubscribePublic: (() => void) | null = null;

  constructor() {
    const mapDoc = (d: any): Training => {
      const data = d.data();
      return { 
        _id: d.id, 
        ...data
      };
    };

    // Start Public Trainings listener
    // We use a single persistent subscription.
    // Since we updated firestore.rules to allow public read, we don't need to restart on auth change.
    const publicQuery = query(
      collectionGroup(this.db, 'trainings'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(6)
    );

    const unsub = onSnapshot(publicQuery, {
      next: (snap) => {
        const publicTrainings = snap.docs.map(mapDoc);
        this.publicTrainingsSignal.set(publicTrainings);
      },
      error: (err) => {
        console.error('Error fetching public trainings:', err);
      }
    });

    this.unsubscribePublic = () => unsub();


    effect(() => {
      const user = this.auth.user();
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      if (!user) {
        this.trainingsSignal.set([]);
        // Do NOT clear public trainings here
        return;
      }

      // My Trainings (Legacy Path): users/{uid}/trainings
      const legacyRef = collection(this.db, 'users', user.uid, 'trainings');
      
      // My Trainings (New Path): trainings where ownerId == uid
      const newRef = query(
        collection(this.db, 'trainings'),
        where('ownerId', '==', user.uid)
      );
      
      // Ensure email is available for the query
      const email = user.email;
      let sharedQuery = null;
      
      if (email) {
        // Shared Trainings (New Path)
        sharedQuery = query(
          collection(this.db, 'trainings'),
          where('sharedWith', 'array-contains', email)
        );
      }

      let legacyTrainings: Training[] = [];
      let newTrainings: Training[] = [];
      let sharedTrainings: Training[] = [];

      const update = () => {
        // Merge all sources, removing duplicates by ID
        const all = [...legacyTrainings, ...newTrainings, ...sharedTrainings];
        const unique = new Map();
        all.forEach(t => unique.set(t._id, t));
        
        // Sort by createdAt desc if available
        const sorted = Array.from(unique.values()).sort((a, b) => {
           const ta = a.createdAt?.seconds ?? 0;
           const tb = b.createdAt?.seconds ?? 0;
           return tb - ta;
        });
        
        this.trainingsSignal.set(sorted);
      };

      const unsubLegacy = onSnapshot(legacyRef, (snap) => {
        legacyTrainings = snap.docs.map(mapDoc);
        update();
      });

      const unsubNew = onSnapshot(newRef, (snap) => {
        newTrainings = snap.docs.map(mapDoc);
        update();
      });

      let unsubShared = () => {};
      if (sharedQuery) {
        unsubShared = onSnapshot(sharedQuery, {
          next: (snap) => {
            sharedTrainings = snap.docs.map(mapDoc);
            update();
          },
          error: (err) => {
            console.error('Error fetching shared trainings:', err);
          }
        });
      }

      this.unsubscribe = () => {
        unsubLegacy();
        unsubNew();
        unsubShared();
      };
    });
  }

  getAll() {
    return this.trainingsSignal.asReadonly();
  }

  getPublicTrainings() {
    return computed(() => {
      const raw = this.publicTrainingsSignal();
      const distinct = Array.from(new Map(raw.map(t => [t._id, t])).values());
      return distinct;
    });
  }

  getById(id: string) {
    return this.trainingsSignal().find(t => t._id === id);
  }

  async getByIdOnce(id: string, ownerId?: string): Promise<Training | null> {
    const user = this.auth.user();
    if (!user && !ownerId) return null;

    // Try new root path first
    const refNew = doc(this.db, 'trainings', id);
    const snapNew = await getDoc(refNew);
    
    if (snapNew.exists()) {
      const data = snapNew.data() as Omit<Training, '_id'>;
      return { _id: id, ...data };
    }

    // Fallback to legacy path
    const targetOwnerId = ownerId || user?.uid;
    if (!targetOwnerId) return null;

    const refLegacy = doc(this.db, 'users', targetOwnerId, 'trainings', id);
    const snapLegacy = await getDoc(refLegacy);
    
    if (snapLegacy.exists()) {
      const data = snapLegacy.data() as Omit<Training, '_id'>;
      return { _id: id, ...data, ownerId: targetOwnerId };
    }

    return null;
  }

  async getPublicTrainingById(id: string): Promise<Training | null> {
    // Direct fetch from root collection
    const ref = doc(this.db, 'trainings', id);
    
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      
      const data = snap.data() as any;
      if (!data.isPublic) return null;

      return { 
        _id: snap.id, 
        ...data
      } as Training;
    } catch (err) {
      console.error('Error fetching public training:', err);
      return null;
    }
  }

  async save(training: Training) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'trainings', training._id);
    await setDoc(ref, {
      id: training._id, // Ensure ID is queryable
      title: training.title,
      owner: training.owner,
      ownerName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      ownerId: user.uid,
      active: training.active,
      isPublic: training.isPublic || false,
      createdAt: training.createdAt || serverTimestamp(),
      cover: training.cover ?? '',
      exercises: training.exercises
      // sharedWith is not overwritten here if we use merge: true, 
      // BUT we are passing specific fields. If sharedWith is not in this list, it won't be touched if merge is true?
      // Actually setDoc with { merge: true } merges the data. 
      // If I only pass these fields, existing 'sharedWith' in DB will persist.
    }, { merge: true });
  }

  async delete(id: string) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'trainings', id);
    await deleteDoc(ref);
  }

  async updatePublicStatus(trainingId: string, isPublic: boolean) {
    console.log(`[TrainingService] updatePublicStatus id=${trainingId} public=${isPublic}`);
    const user = this.auth.user();
    if (!user) {
        throw new Error('Must be logged in');
    }
    
    try {
      const ref = doc(this.db, 'trainings', trainingId);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
          // Document exists in Root. Update it.
          const data = snap.data();
          const updates: any = {
              isPublic: isPublic,
              id: trainingId // Ensure ID is set
          };
          
          // Only update createdAt if becoming public (to show at top of feed)
          if (isPublic) {
              updates.createdAt = serverTimestamp();
          }
          
          // Ensure ownerId if missing (repair data)
          if (!data['ownerId']) {
              updates.ownerId = user.uid;
          }
  
          // Use setDoc with merge instead of updateDoc to be more robust
          await setDoc(ref, updates, { merge: true });
          console.log('[TrainingService] updatePublicStatus: Updated existing doc');
          return;
      }
      
      // Document not in Root. Check Legacy.
      console.log(`[TrainingService] Document not found in root, checking legacy for ${trainingId}`);
      const legacyRef = doc(this.db, 'users', user.uid, 'trainings', trainingId);
      const legacySnap = await getDoc(legacyRef);
      
      if (legacySnap.exists()) {
        console.log(`[TrainingService] Found legacy document, migrating...`);
        // Migrate to new path
        const legacyData = legacySnap.data();
        const newDocData = {
            ...legacyData,
            id: trainingId,
            isPublic: isPublic,
            ownerId: user.uid, // Explicitly set owner
            createdAt: isPublic ? serverTimestamp() : (legacyData['createdAt'] || serverTimestamp())
        };
        
        await setDoc(ref, newDocData);
        
        // Delete legacy to avoid duplication issues
        try {
           await deleteDoc(legacyRef);
           console.log(`[TrainingService] Legacy document deleted`);
        } catch (e) {
            console.warn('Failed to delete legacy doc', e);
        }
        return;
      }

      console.error('Training not found for updatePublicStatus', trainingId);
      throw new Error('Training not found');
    } catch (err) {
      console.error('[TrainingService] updatePublicStatus error:', err);
      throw err;
    }
  }

  async shareWithEmail(trainingId: string, email: string) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'trainings', trainingId);
    await updateDoc(ref, {
      sharedWith: arrayUnion(email.toLowerCase()),
      owner: user.email, // Ensure owner email is set when sharing
      ownerName: user.displayName || user.email?.split('@')[0] || this.translate.instant('common.unknown') // Ensure owner name is set
    });
  }

  async revokeAccess(trainingId: string, email: string) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'trainings', trainingId);
    await updateDoc(ref, {
      sharedWith: arrayRemove(email)
    });
  }

  async share(trainingId: string, email: string) {
    return this.shareWithEmail(trainingId, email);
  }

  async unshare(trainingId: string, email: string) {
    return this.revokeAccess(trainingId, email);
  }
}
