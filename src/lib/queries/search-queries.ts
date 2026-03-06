export const AUTOCOMPLETE_PERSONS = `
  MATCH (p:Person)
  WHERE toLower(p.displayName) CONTAINS toLower($query)
     OR toLower(p.surname) CONTAINS toLower($query)
     OR toLower(p.givenNames) CONTAINS toLower($query)
  RETURN p {
    .id, .displayName, .sex, .birthYear, .deathYear, .birthPlace
  } AS person
  ORDER BY
    CASE WHEN toLower(p.surname) STARTS WITH toLower($query) THEN 0 ELSE 1 END,
    p.surname, p.givenNames
  LIMIT $limit
`;
