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

export const CREATE_FULLTEXT_INDEX = `
  CREATE FULLTEXT INDEX personIndex IF NOT EXISTS
  FOR (p:Person) ON EACH [p.fullName, p.givenNames, p.surname, p.occupation, p.birthPlace]
`;

export const FULLTEXT_SEARCH_PERSONS = `
  CALL db.index.fulltext.queryNodes("personIndex", $q + "*")
  YIELD node, score
  RETURN node.id AS id, node.fullName AS name,
         node.birthYear AS birthYear, node.birthPlace AS birthPlace,
         node.occupation AS occupation, node.sex AS sex, score
  ORDER BY score DESC LIMIT 20
`;
