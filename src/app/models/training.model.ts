export interface Exercise {
  id: number;
  title: string;
  resourceLink?: string;
  bpm: number;
  durationMinutes: number;
  durationSeconds: number;
  breakSeconds: number;
}

export interface Training {
  _id: string;
  title: string;
  owner: string;
  active: boolean;
  cover?: string;
  exercises: Exercise[];
}
