import { Injectable, inject, signal, effect } from '@angular/core';
import { Training } from '../models/training.model';
import { FIREBASE_DB } from '../app.config';
import { AuthService } from '../core/services/auth.service';
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
  arrayRemove 
} from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private db: Firestore = inject(FIREBASE_DB);
  private auth = inject(AuthService);
  private trainingsSignal = signal<Training[]>([]);
  private unsubscribe: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      if (!user) {
        this.trainingsSignal.set([]);
        return;
      }

      const myTrainingsRef = collection(this.db, 'users', user.uid, 'trainings');
      // Ensure email is available for the query
      const email = user.email;
      let sharedQuery = null;
      
      if (email) {
        sharedQuery = query(
          collectionGroup(this.db, 'trainings'),
          where('sharedWith', 'array-contains', email)
        );
      }

      let myTrainings: Training[] = [];
      let sharedTrainings: Training[] = [];

      const update = () => {
        // Simple merge. IDs should be unique enough.
        this.trainingsSignal.set([...myTrainings, ...sharedTrainings]);
      };

      const mapDoc = (d: any): Training => {
        const data = d.data();
        return { 
          _id: d.id, 
          ...data,
          ownerId: d.ref.parent.parent?.id 
        };
      };

      const unsub1 = onSnapshot(myTrainingsRef, (snap) => {
        myTrainings = snap.docs.map(mapDoc);
        update();
      });

      let unsub2 = () => {};
      if (sharedQuery) {
        unsub2 = onSnapshot(sharedQuery, {
          next: (snap) => {
            sharedTrainings = snap.docs.map(mapDoc);
            update();
          },
          error: (err) => {
            console.error('Error fetching shared trainings:', err);
            // If the error is about missing index, we might want to notify dev or user, 
            // but for now logging is better than crashing.
          }
        });
      }

      this.unsubscribe = () => {
        unsub1();
        unsub2();
      };
    });
  }

  getAll() {
    return this.trainingsSignal.asReadonly();
  }

  getById(id: string) {
    return this.trainingsSignal().find(t => t._id === id);
  }

  async getByIdOnce(id: string, ownerId?: string): Promise<Training | null> {
    const user = this.auth.user();
    if (!user) return null;

    const targetOwnerId = ownerId || user.uid;
    const ref = doc(this.db, 'users', targetOwnerId, 'trainings', id);
    
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Omit<Training, '_id'>;
    return { _id: id, ...data, ownerId: targetOwnerId };
  }

  async save(training: Training) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'users', user.uid, 'trainings', training._id);
    await setDoc(ref, {
      title: training.title,
      owner: training.owner,
      ownerId: user.uid,
      active: training.active,
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
    const ref = doc(this.db, 'users', user.uid, 'trainings', id);
    await deleteDoc(ref);
  }

  async shareWithEmail(trainingId: string, email: string) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'users', user.uid, 'trainings', trainingId);
    await updateDoc(ref, {
      sharedWith: arrayUnion(email.toLowerCase())
    });
  }

  async revokeAccess(trainingId: string, email: string) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'users', user.uid, 'trainings', trainingId);
    await updateDoc(ref, {
      sharedWith: arrayRemove(email)
    });
  }
}
