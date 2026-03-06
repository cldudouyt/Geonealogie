export const GET_TREE_CENTERED = `
  MATCH (root:Person {id: $personId})

  // Get ancestors up to specified depth
  OPTIONAL MATCH ancestorPath = (root)-[:CHILD_OF*1..8]->(ancestor:Person)
  WITH root, collect(DISTINCT ancestor) AS ancestors,
       collect(DISTINCT relationships(ancestorPath)) AS ancestorRels

  // Get descendants up to specified depth
  OPTIONAL MATCH descendantPath = (root)<-[:CHILD_OF*1..4]-(descendant:Person)
  WITH root, ancestors,
       collect(DISTINCT descendant) AS descendants,
       ancestorRels,
       collect(DISTINCT relationships(descendantPath)) AS descendantRels

  // Collect all persons (root + ancestors + descendants)
  WITH root,
       [root] + ancestors + descendants AS allPersons,
       ancestorRels, descendantRels

  // Get spouses of all persons in the tree
  UNWIND allPersons AS person
  OPTIONAL MATCH (person)-[sp:SPOUSE_OF]-(spouse:Person)
  WITH root, allPersons,
       collect(DISTINCT spouse) AS spouses,
       collect(DISTINCT {source: person.id, target: spouse.id, type: 'spouse', familyId: sp.familyId}) AS spouseLinks,
       ancestorRels, descendantRels

  // Combine all persons
  WITH root,
       allPersons + spouses AS allWithSpouses,
       spouseLinks, ancestorRels, descendantRels

  // Deduplicate persons
  UNWIND allWithSpouses AS p
  WITH root, collect(DISTINCT p) AS uniquePersons, spouseLinks, ancestorRels, descendantRels

  // Build parent links
  UNWIND uniquePersons AS person
  OPTIONAL MATCH (person)-[:CHILD_OF]->(parent:Person)
  WHERE parent IN uniquePersons
  WITH root, uniquePersons,
       collect(DISTINCT {source: parent.id, target: person.id, type: 'parent'}) AS parentLinks,
       spouseLinks

  RETURN root.id AS rootId,
    [p IN uniquePersons | {
      id: p.id,
      displayName: p.displayName,
      sex: p.sex,
      birthYear: p.birthYear,
      deathYear: p.deathYear,
      occupation: p.occupation
    }] AS nodes,
    parentLinks + [sl IN spouseLinks WHERE sl.source IS NOT NULL] AS links
`;

export const GET_ANCESTORS = `
  MATCH (root:Person {id: $personId})
  OPTIONAL MATCH path = (root)-[:CHILD_OF*1..10]->(ancestor:Person)
  WITH root, collect(DISTINCT ancestor) AS ancestors

  UNWIND [root] + ancestors AS person
  OPTIONAL MATCH (person)-[:CHILD_OF]->(parent:Person)
  WHERE parent IN [root] + ancestors
  OPTIONAL MATCH (person)-[sp:SPOUSE_OF]-(spouse:Person)
  WHERE spouse IN [root] + ancestors

  RETURN
    root.id AS rootId,
    collect(DISTINCT {
      id: person.id,
      displayName: person.displayName,
      sex: person.sex,
      birthYear: person.birthYear,
      deathYear: person.deathYear,
      occupation: person.occupation
    }) AS nodes,
    collect(DISTINCT {source: parent.id, target: person.id, type: 'parent'}) +
    collect(DISTINCT {source: person.id, target: spouse.id, type: 'spouse'}) AS links
`;

export const GET_DESCENDANTS = `
  MATCH (root:Person {id: $personId})
  OPTIONAL MATCH path = (root)<-[:CHILD_OF*1..10]-(descendant:Person)
  WITH root, collect(DISTINCT descendant) AS descendants

  UNWIND [root] + descendants AS person
  OPTIONAL MATCH (person)-[:CHILD_OF]->(parent:Person)
  WHERE parent IN [root] + descendants
  OPTIONAL MATCH (person)-[sp:SPOUSE_OF]-(spouse:Person)

  RETURN
    root.id AS rootId,
    collect(DISTINCT {
      id: person.id,
      displayName: person.displayName,
      sex: person.sex,
      birthYear: person.birthYear,
      deathYear: person.deathYear,
      occupation: person.occupation
    }) AS nodes,
    collect(DISTINCT {source: parent.id, target: person.id, type: 'parent'}) +
    collect(DISTINCT {source: person.id, target: spouse.id, type: 'spouse'}) AS links
`;
