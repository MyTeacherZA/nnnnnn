import re
p = 'server.ts'
s = open(p, encoding='utf-8').read()
s = re.sub(r'const matched = files\.filter\([\s\S]*?\)\.slice\(0, pdfLimit\);',
           'const matched = pickPdfs(files, sub, grd).slice(0, pdfLimit);', s)
s = re.sub(r'const subjOk = [^;]*;',
           'const subjOk = matchSubject(fn, subject);', s)
helpers = '''

function matchSubject(fn: string, subject: string) {
  if (!subject) return true;
  const syn: Record<string, string[]> = {
    math: ['math', 'maths', 'mathematics', 'wiskunde'],
    physic: ['physic', 'physical', 'phys', 'science', 'fysise'],
    life: ['life', 'lewe', 'biology'],
    account: ['account', 'rekening'],
    geog: ['geog', 'geography'],
    english: ['english', 'eng'],
  };
  const toks = subject.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const t of toks) {
    const group = syn[t] || [t];
    if (group.some((g) => fn.includes(g))) return true;
  }
  return false;
}

function pickPdfs(files: string[], subject: string, grade: string) {
  const ng = grade.toLowerCase().replace(/[^a-z0-9]/g, '');
  const short = ng.replace('grade', 'gr');
  return files.filter((f) => {
    const fn = f.toLowerCase().replace(/[^a-z0-9]/g, '');
    const gradeOk = !ng || fn.includes(ng) || fn.includes(short) || fn.includes('gr');
    return gradeOk && matchSubject(fn, subject);
  });
}
'''
if 'function pickPdfs' not in s:
    s = s + helpers
open(p, 'w', encoding='utf-8').write(s)
print('patched ok')
