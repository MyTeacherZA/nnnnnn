import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MATHS_FORMULAE } from '../data/curriculumData';
import { regionalCopy } from '../services/l10n';
import {
  Sigma,
  Search,
  Filter,
  Copy,
  Check,
  FileDown,
  BookOpen,
  Calculator,
  Compass,
  DollarSign,
  TrendingUp,
  Percent,
  Star,
} from 'lucide-react';

export const FormulaSheetsTab: React.FC = () => {
  const { student } = useApp();
  const copy = regionalCopy(student?.country, student?.nation, student?.state);
  const gradeRange =
    student?.country === 'UK' ? 'Year 7 – Year 13' : student?.country === 'US' ? 'K – Grade 12' : 'Grades 7 – 12';
  const [search, setSearch] = useState('');
  const [selectedStream, setSelectedStream] = useState<'All' | 'Pure Mathematics' | 'Mathematical Literacy'>('All');
  const [selectedPaper, setSelectedPaper] = useState<'All' | 'Paper 1' | 'Paper 2'>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('mytutorza_starred_formulas');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('mytutorza_starred_formulas', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const filteredFormulae = useMemo(() => {
    const zaOnly = /(NSC|SARS|VAT|CAPS|DBE|South African|Revenue|Bounded|South Africa)/i;
    return MATHS_FORMULAE.filter((item) => {
      // Non-ZA learners: hide formula candidates that are exam-board
      // specific to South Africa (invisible even in search results).
      if (student?.country && student.country !== 'ZA') {
        const hay = `${item.name} ${item.description} ${(item as any).whenToUse ?? ''}`;
        if (zaOnly.test(hay)) return false;
      }

      // Stream filter
      if (selectedStream !== 'All' && item.stream !== 'Both' && item.stream !== selectedStream) {
        return false;
      }
      // Paper filter
      if (selectedPaper !== 'All' && item.paper !== 'Both' && item.paper !== selectedPaper) {
        return false;
      }
      // Grade filter
      if (selectedGrade !== 'All' && !item.grades.includes(selectedGrade)) {
        return false;
      }
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesTopic = item.topic.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesFormula = item.formula.toLowerCase().includes(query);
        if (!matchesName && !matchesTopic && !matchesDesc && !matchesFormula) {
          return false;
        }
      }
      return true;
    });
  }, [search, selectedStream, selectedPaper, selectedGrade, student?.country]);

  const handleCopy = (id: string, formulaText: string) => {
    navigator.clipboard.writeText(formulaText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTopicIcon = (topic: string) => {
    if (topic.includes('Algebra') || topic.includes('Calculus')) return <Calculator className="w-4 h-4 text-sky-400" />;
    if (topic.includes('Geometry') || topic.includes('Trig')) return <Compass className="w-4 h-4 text-emerald-400" />;
    if (topic.includes('Finance') || topic.includes('VAT')) return <DollarSign className="w-4 h-4 text-amber-400" />;
    if (topic.includes('Patterns') || topic.includes('Series')) return <TrendingUp className="w-4 h-4 text-purple-400" />;
    return <Sigma className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Info */}
      <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
              {copy.paperBannerLine1}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {gradeRange}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Sigma className="w-6 h-6 text-indigo-400" />
            {copy.formulaSheetTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">{copy.formulaSheetDesc}</p>
        </div>

        <button
          onClick={() => window.print()}
          className="btn-accent px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0"
        >
          <FileDown className="w-4 h-4 text-white" />
          <span>Print / Save Formula Sheets</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="metallic-card rounded-2xl p-4 border border-slate-700/60 shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search formula, topic, theorem..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Stream Filter */}
        <div>
          <select
            value={selectedStream}
            onChange={(e: any) => setSelectedStream(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
          >
            <option value="All">All Streams (Pure & Lit)</option>
            <option value="Pure Mathematics">Pure Mathematics</option>
            <option value="Mathematical Literacy">Mathematical Literacy</option>
          </select>
        </div>

        {/* Paper Filter */}
        <div>
          <select
            value={selectedPaper}
            onChange={(e: any) => setSelectedPaper(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
          >
            <option value="All">All Papers (P1 & P2)</option>
            <option value="Paper 1">Paper 1 (Algebra/Finance/Calc)</option>
            <option value="Paper 2">Paper 2 (Geometry/Trig/Stats)</option>
          </select>
        </div>

        {/* Grade Filter */}
        <div>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
          >
            <option value="All">All Grades (Gr 7 - 12)</option>
            <option value="Grade 7">Grade 7</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>
        </div>
      </div>

      {/* Formula Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFormulae.map((item) => (
          <div
            key={item.id}
            className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-500 transition-all group"
          >
            <div>
              {/* Header tags */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  {getTopicIcon(item.topic)}
                  <span>{item.topic}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.stream}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    {item.paper}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-black text-white">{item.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>

              {/* The Formula Box */}
              <div className="mt-3 bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                <code className="text-sm sm:text-base font-mono font-bold text-amber-300 tracking-wide break-all">
                  {item.formula}
                </code>
                <button
                  onClick={() => toggleStar(item.id)}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${starred.has(item.id) ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  title="Star Formula"
                >
                  <Star className="w-4 h-4" fill={starred.has(item.id) ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => handleCopy(item.id, item.formula)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
                  title="Copy Formula"
                >
                  {copiedId === item.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Variables breakdown */}
              {item.variables && item.variables.length > 0 && (
                <div className="mt-3 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Variables:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-300">
                    {item.variables.map((v, vIdx) => (
                      <div key={vIdx} className="bg-slate-900/60 px-2 py-1 rounded border border-slate-800/80">
                        <strong className="text-white font-mono">{v.symbol}</strong>: {v.meaning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Worked Example */}
              {item.example && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-0.5">
                    {copy.formulaSheetNote}
                  </span>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{item.example}</p>
                </div>
              )}
            </div>

            {/* Bottom Footer */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>When to use: {item.whenToUse}</span>
              <span className="font-semibold text-slate-300">
                {item.grades.join(', ')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredFormulae.length === 0 && (
        <div className="metallic-card rounded-2xl p-12 text-center border border-slate-800">
          <p className="text-slate-400 text-sm">No formulas found matching your filter criteria.</p>
        </div>
      )}
    </div>
  );
};
