function gendered(sex: string, m: string, f: string, neutral: string): string {
  return sex === 'F' ? f : sex === 'M' ? m : neutral;
}

function articleFor(label: string, sex: string): string {
  if (sex !== 'M' && sex !== 'F') return '';
  if (/^[aeiouyàâéèêîôûh]/i.test(label)) return "l'";
  return sex === 'F' ? 'la' : 'le';
}

export function computeRelationshipTitle(path: Array<{ relation: string; sex: string }>): { label: string; article: string } {
  const withArticle = (label: string, sex: string) => ({ label, article: articleFor(label, sex) });

  if (path.length === 0) return { label: 'même personne', article: '' };
  if (path.length === 1) {
    const { relation: rel, sex } = path[0];
    if (rel === 'parent') return withArticle(gendered(sex, 'père', 'mère', 'parent'), sex);
    if (rel === 'enfant') return withArticle(gendered(sex, 'fils', 'fille', 'enfant'), sex);
    if (rel === 'conjoint') return withArticle(gendered(sex, 'conjoint', 'conjointe', 'conjoint(e)'), sex);
  }
  if (path.length === 2) {
    const [r1, r2] = path;
    const sex = r2.sex;
    if (r1.relation === 'parent' && r2.relation === 'parent')
      return withArticle(gendered(sex, 'grand-père', 'grand-mère', 'grand-parent'), sex);
    if (r1.relation === 'enfant' && r2.relation === 'enfant')
      return withArticle(gendered(sex, 'petit-fils', 'petite-fille', 'petit-enfant'), sex);
    if ((r1.relation === 'parent' && r2.relation === 'enfant') || (r1.relation === 'enfant' && r2.relation === 'parent'))
      return withArticle(gendered(sex, 'frère', 'sœur', 'frère ou sœur'), sex);
    if ((r1.relation === 'conjoint' && r2.relation === 'parent') || (r1.relation === 'parent' && r2.relation === 'conjoint'))
      return withArticle(gendered(sex, 'beau-père', 'belle-mère', 'beau-parent'), sex);
    if ((r1.relation === 'conjoint' && r2.relation === 'enfant') || (r1.relation === 'enfant' && r2.relation === 'conjoint'))
      return withArticle(gendered(sex, 'beau-fils', 'belle-fille', 'beau-fils ou belle-fille'), sex);
  }
  if (path.length === 3) {
    const [r1, r2, r3] = path;
    const sex = r3.sex;
    if (r1.relation === 'parent' && r2.relation === 'parent' && r3.relation === 'parent')
      return withArticle(gendered(sex, 'arrière-grand-père', 'arrière-grand-mère', 'arrière-grand-parent'), sex);
    if (r1.relation === 'parent' && r2.relation === 'parent' && r3.relation === 'enfant')
      return withArticle(gendered(sex, 'oncle', 'tante', 'oncle ou tante'), sex);
    if (r1.relation === 'enfant' && r2.relation === 'enfant' && r3.relation === 'enfant')
      return withArticle(gendered(sex, 'arrière-petit-fils', 'arrière-petite-fille', 'arrière-petit-enfant'), sex);
    if ((r1.relation === 'enfant' && r2.relation === 'enfant' && r3.relation === 'parent') ||
        (r1.relation === 'parent' && r2.relation === 'enfant' && r3.relation === 'enfant'))
      return withArticle(gendered(sex, 'neveu', 'nièce', 'neveu ou nièce'), sex);
    if (r1.relation === 'parent' && r2.relation === 'parent' && r3.relation === 'conjoint')
      return withArticle(gendered(sex, 'grand-oncle', 'grand-tante', 'grand-oncle ou grand-tante'), sex);
  }
  if (path.length === 4) {
    const [r1, r2, r3, r4] = path;
    const sex = r4.sex;
    if (r1.relation === 'parent' && r2.relation === 'parent' && r3.relation === 'enfant' && r4.relation === 'enfant')
      return withArticle(gendered(sex, 'cousin germain', 'cousine germaine', 'cousin(e) germain(e)'), sex);
    if ((r1.relation === 'parent' && r2.relation === 'parent' && r3.relation === 'parent' && r4.relation === 'enfant') ||
        (r1.relation === 'enfant' && r2.relation === 'enfant' && r3.relation === 'parent' && r4.relation === 'parent'))
      return withArticle(gendered(sex, 'grand-oncle', 'grand-tante', 'grand-oncle ou grand-tante'), sex);
  }

  return { label: `relation au ${path.length}e degré`, article: '' };
}
