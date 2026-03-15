export const AUTOCOMPLETE_PERSONS = `
  MATCH (p:Person)
  WHERE toLower(p.displayName) CONTAINS toLower($query)
     OR toLower(p.surname) CONTAINS toLower($query)
     OR toLower(p.givenNames) CONTAINS toLower($query)
  RETURN p {
    .id, .displayName, .sex, .birthYear, .deathYear, .birthPlace
  } AS person
  ORDER BY
    CASE
      WHEN toLower(p.displayName) STARTS WITH toLower($query) THEN 0
      WHEN toLower(p.givenNames) STARTS WITH toLower($query) THEN 1
      WHEN toLower(p.surname) STARTS WITH toLower($query) THEN 2
      ELSE 3
    END,
    p.surname, p.givenNames
  LIMIT $limit
`;
