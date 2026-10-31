import re
p = 'server.ts'
s = open(p, encoding='utf-8').read()
orig = s
s = re.sub(r"const matched = files\.filter\(f: string\) => \{.*?\}\)\.slice\(0, pdfLimit\);",
           "const matched = pickPdfs(files, sub, grd).slice(0, pdfLimit);", s, flags=re.S)
s = re.sub(r"const subjOk = [^;]*;", "const subjOk = matchSubject(fn, subject);", s)
if 'function pickPdfs' not in s:
    s += '''

function matchSubject(fn: string, subject: string): boolean {
  if (!subject) return true;
  const syn: Record<string, string[]> = {
    math: ['math','maths','mathematics','wiskunde'],
    physic: ['physic','physical','phys','science','fysise'],
    life: ['life','lewe','biology'],
    account: ['account','rekening'],
    geog: ['geog','geography'],
    english: ['english','eng'],
  };
  const toks = subject.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const t of toks) { const g = syn[t] || [t]; if (g.some((x) => fn.includes(x))) return true; }
  return false;
}
function pickPdfs(files: string[], subject: string, grade: string): string[] {
  const ng = grade.toLowerCase().replace(/[^a-z0-9]/g, '');
  const short = ng.replace('grade', 'gr');
  return files.filter((f) => {
    const fn = f.toLowerCase().replace(/[^a-z0-9]/g, '');
    const gOk = !ng || fn.includes(ng) || fn.includes(short) || fn.includes('gr');
    return gOk && matchSubject(fn, subject);
  });
}
function readManifest(): string[] {
  const mp = path.resolve(process.cwd(), 'caps_vault', 'manifest.json');
  if (!fs.existsSync(mp)) return [];
  const m = JSON.parse(fs.readFileSync(mp, 'utf-8'));
  return Array.isArray(m?.files) ? m.files : [];
}
'''
if "'/api/caps/ingest'" not in s:
    s += '''

app.post('/api/caps/ingest', async (req: Request, res: Response) => {
  try { const r = await buildCapsVaultIndex(); return res.json({ success: true, ...r }); }
  catch (err: any) { return res.status(500).json({ error: err?.message || String(err) }); }
});

app.get('/api/caps/pdf-list', (req: Request, res: Response) => {
  const subject = (req.query.subject as string) || '';
  const grade = (req.query.grade as string) || '';
  const maxFiles = Number(req.query.maxFiles || 20);
  const files = readManifest();
  if (!files.length) return res.json({ pdfs: [], message: 'No manifest' });
  const matched = pickPdfs(files, subject, grade);
  return res.json({ subject, grade, totalFiles: files.length, totalMatched: matched.length, pdfs: matched.slice(0, maxFiles).map((f, i) => ({ index: i, file: f })) });
});

app.get('/api/caps/toc', (req: Request, res: Response) => {
  const { pdfFile } = req.query as any;
  if (!pdfFile) return res.status(400).json({ error: 'pdfFile required' });
  const tp = path.resolve(process.cwd(), 'caps_vault', 'manifest-toc.json');
  if (!fs.existsSync(tp)) return res.json({ toc: [], message: 'Run /api/caps/ingest first' });
  const en = JSON.parse(fs.readFileSync(tp, 'utf-8'));
  const e = (en.tocIndex || []).find((x: any) => x.file === pdfFile);
  if (!e) return res.json({ toc: [], message: 'PDF not in TOC index' });
  return res.json({ file: pdfFile, subject: e.subject, grade: e.grade, term: e.term, toc: e.toc });
});

app.get('/api/caps/files', (req: Request, res: Response) => {
  const files = readManifest();
  return res.json({ count: files.length, sample: files.slice(0, 25) });
});

app.post('/api/termtests/debug', async (req: Request, res: Response) => {
  const c = getServiceSupabaseClient();
  if (!c) return res.status(500).json({ error: 'No Supabase client' });
  const info = { hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY, hasAnonKey: !!process.env.SUPABASE_ANON_KEY };
  const pr = await c.from('term_tests').insert({ subject: 'probe', grade: 'probe', term: 'probe', exam_type: 'probe', duration_minutes: 1, paper: { t: 1 }, answer_sheet: null }).select().single();
  if (pr.error) return res.status(400).json({ ok: false, info, error: pr.error.message, code: pr.error.code, hint: pr.error.hint, details: pr.error.details });
  await c.from('term_tests').delete().eq('id', pr.data.id);
  return res.json({ ok: true, info, message: 'insert works' });
});
'''
open(p, 'w', encoding='utf-8').write(s)
print('changed:', s != orig)
print('pickPdfs helper:', 'function pickPdfs' in s)
print('batch uses pickPdfs:', 'pickPdfs(files, sub, grd)' in s)
print('ingest route:', "'/api/caps/ingest'" in s)
print('debug route:', "'/api/termtests/debug'" in s)
