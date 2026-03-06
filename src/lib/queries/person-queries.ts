export const GET_PERSON_BY_ID = `
  MATCH (p:Person {id: $id})
  OPTIONAL MATCH (p)-[:CHILD_OF]->(parent:Person)
  OPTIONAL MATCH (p)<-[:CHILD_OF]-(child:Person)
  OPTIONAL MATCH (p)-[sp:SPOUSE_OF]-(spouse:Person)
  OPTIONAL MATCH (p)-[:CHILD_OF]->(sharedParent:Person)<-[:CHILD_OF]-(sibling:Person)
  WHERE sibling.id <> p.id
  RETURN p,
    collect(DISTINCT {
      id: parent.id,
      displayName: parent.displayName,
      sex: parent.sex,
      birthDate: parent.birthDate,
      birthPlace: parent.birthPlace,
      deathDate: parent.deathDate,
      deathPlace: parent.deathPlace,
      occupation: parent.occupation
    }) AS parents,
    collect(DISTINCT {
      id: child.id,
      displayName: child.displayName,
      sex: child.sex,
      birthDate: child.birthDate,
      birthPlace: child.birthPlace,
      deathDate: child.deathDate,
      deathPlace: child.deathPlace,
      occupation: child.occupation
    }) AS children,
    collect(DISTINCT {
      person: {
        id: spouse.id,
        displayName: spouse.displayName,
        sex: spouse.sex,
        birthDate: spouse.birthDate,
        birthPlace: spouse.birthPlace,
        deathDate: spouse.deathDate,
        deathPlace: spouse.deathPlace,
        occupation: spouse.occupation
      },
      familyId: sp.familyId,
      marriageDate: sp.marriageDate,
      marriageDateRaw: sp.marriageDateRaw,
      marriagePlace: sp.marriagePlace
    }) AS spouses,
    collect(DISTINCT {
      id: sibling.id,
      displayName: sibling.displayName,
      sex: sibling.sex,
      birthDate: sibling.birthDate,
      birthPlace: sibling.birthPlace,
      deathDate: sibling.deathDate,
      deathPlace: sibling.deathPlace,
      occupation: sibling.occupation
    }) AS siblings
`;

export const SEARCH_PERSONS = `
  CALL db.index.fulltext.queryNodes('person_search', $query)
  YIELD node, score
  RETURN node {
    .id, .displayName, .sex, .birthDate, .birthPlace,
    .deathDate, .deathPlace, .occupation
  } AS person, score
  ORDER BY score DESC
  SKIP $skip
  LIMIT $limit
`;

export const SEARCH_PERSONS_COUNT = `
  CALL db.index.fulltext.queryNodes('person_search', $query)
  YIELD node
  RETURN count(node) AS total
`;

export const LIST_PERSONS = `
  MATCH (p:Person)
  WHERE ($surname = '' OR p.surname =~ $surname)
    AND ($place = '' OR p.birthPlaceFull CONTAINS $place OR p.deathPlaceFull CONTAINS $place)
    AND ($occupation = '' OR p.occupation CONTAINS $occupation)
  RETURN p {
    .id, .displayName, .sex, .birthDate, .birthPlace,
    .deathDate, .deathPlace, .occupation
  } AS person
  ORDER BY p.surname, p.givenNames
  SKIP $skip
  LIMIT $limit
`;

export const LIST_PERSONS_COUNT = `
  MATCH (p:Person)
  WHERE ($surname = '' OR p.surname =~ $surname)
    AND ($place = '' OR p.birthPlaceFull CONTAINS $place OR p.deathPlaceFull CONTAINS $place)
    AND ($occupation = '' OR p.occupation CONTAINS $occupation)
  RETURN count(p) AS total
`;
