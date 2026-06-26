export const GET_BIRTHPLACES = `
MATCH (p:Person)
WHERE p.birthPlace IS NOT NULL AND p.birthLat IS NOT NULL
RETURN p.birthPlace AS place,
       head(collect(p.birthCountry)) AS region,
       head(collect(p.birthLat)) AS lat,
       head(collect(p.birthLng)) AS lng,
       count(p) AS count
ORDER BY count DESC
`;
