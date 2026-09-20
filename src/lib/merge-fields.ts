export const MERGE_FIELDS = {
  givenNames: 'Prénoms', surname: 'Nom', nickname: 'Surnom', sex: 'Sexe',
  birthDateRaw: 'Date de naissance', birthPlace: 'Lieu de naissance', birthPlaceFull: 'Lieu complet de naissance', birthLat: 'Latitude de naissance', birthLon: 'Longitude de naissance',
  deathDateRaw: 'Date de décès', deathPlace: 'Lieu de décès', deathPlaceFull: 'Lieu complet de décès', deathLat: 'Latitude de décès', deathLon: 'Longitude de décès',
  burialDateRaw: 'Date d’inhumation', burialPlace: 'Lieu d’inhumation', chrDateRaw: 'Date de baptême', chrPlace: 'Lieu de baptême',
  occupation: 'Profession', nationality: 'Nationalité', isAdopted: 'Adoption', photoUrl: 'Photographie', notes: 'Notes biographiques',
} as const;
export type MergeField = keyof typeof MERGE_FIELDS;
