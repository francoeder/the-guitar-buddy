export interface Exercise {
  id: number;
  title: string;
  resourceLink?: string;
  bpm: number;
  durationMinutes: number;
  durationSeconds: number;
  breakSeconds: number;
  beatStyle?: 'none' | '4/4' | '3/4' | '2/4';
  prepMeasures?: 0 | 1 | 2;
}

export interface Training {
  _id: string;
  title: string;
  owner: string; // email
  ownerName?: string; // display name
  ownerId?: string; // uid
  active: boolean;
  isPublic?: boolean;
  createdAt?: any;
  cover?: string;
  sharedWith?: string[];
  exercises: Exercise[];
}
