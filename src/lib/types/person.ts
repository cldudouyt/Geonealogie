export interface Person {
  id: string;
  gedcomId: string;
  givenNames: string;
  surname: string;
  displayName: string;
  nickname?: string;
  sex: 'M' | 'F' | 'U';
  birthDate?: string;
  birthDateRaw?: string;
  birthPlace?: string;
  birthLat?: number;
  birthLon?: number;
  deathDate?: string;
  deathDateRaw?: string;
  deathPlace?: string;
  deathLat?: number;
  deathLon?: number;
  occupation?: string;
  occupations?: string[];
  nationality?: string;
  isAdopted: boolean;
  notes?: string;
  photoUrl?: string;
}

export interface PersonSummary {
  id: string;
  displayName: string;
  sex: 'M' | 'F' | 'U';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
}

export interface PersonDetail extends Person {
  events: PersonEvent[];
  spouses: SpouseInfo[];
  children: PersonSummary[];
  parents: PersonSummary[];
  siblings: PersonSummary[];
}

export interface SpouseInfo {
  person: PersonSummary;
  marriageDate?: string;
  marriageDateRaw?: string;
  marriagePlace?: string;
  familyId: string;
}

export interface PersonEvent {
  id: string;
  type: string;
  date?: string;
  dateRaw?: string;
  place?: string;
  lat?: number;
  lon?: number;
  description?: string;
  cause?: string;
}
