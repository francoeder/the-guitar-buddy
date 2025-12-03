import { Injectable, signal } from '@angular/core';
import { Training } from '../models/training.model';

const STORAGE_KEY = 'guitar-buddy/trainings';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private trainingsSignal = signal<Training[]>(this.readAll());

  getAll() {
    return this.trainingsSignal.asReadonly();
  }

  getById(id: string) {
    return this.trainingsSignal().find(t => t._id === id);
  }

  save(training: Training) {
    const items = this.trainingsSignal().slice();
    const idx = items.findIndex(t => t._id === training._id);
    if (idx >= 0) items[idx] = training; else items.push(training);
    this.trainingsSignal.set(items);
    this.writeAll(items);
  }

  delete(id: string) {
    const items = this.trainingsSignal().filter(t => t._id !== id);
    this.trainingsSignal.set(items);
    this.writeAll(items);
  }

  private readAll(): Training[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeAll(items: Training[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}
