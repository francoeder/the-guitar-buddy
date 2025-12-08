import { Injectable, inject, signal, effect } from '@angular/core';
import { Training } from '../models/training.model';
import { FIREBASE_DB } from '../app.config';
import { AuthService } from '../core/services/auth.service';
import { type Firestore, collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

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
      const colRef = collection(this.db, 'users', user.uid, 'trainings');
      this.unsubscribe = onSnapshot(colRef, (snap) => {
        const items: Training[] = snap.docs.map(d => ({ _id: d.id, ...(d.data() as Omit<Training, '_id'>) }));
        this.trainingsSignal.set(items);
      });
    });
  }

  getAll() {
    return this.trainingsSignal.asReadonly();
  }

  getById(id: string) {
    return this.trainingsSignal().find(t => t._id === id);
  }

  async save(training: Training) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'users', user.uid, 'trainings', training._id);
    await setDoc(ref, {
      title: training.title,
      owner: training.owner,
      active: training.active,
      cover: training.cover ?? '',
      exercises: training.exercises
    }, { merge: true });
  }

  async delete(id: string) {
    const user = this.auth.user();
    if (!user) return;
    const ref = doc(this.db, 'users', user.uid, 'trainings', id);
    await deleteDoc(ref);
  }
}
