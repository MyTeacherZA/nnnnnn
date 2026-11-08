import { FormulaItem, OfficialLanguage, ThemeAccentConfig } from '../types';

export const OFFICIAL_LANGUAGES: OfficialLanguage[] = [
  'English',
  'isiZulu',
  'isiXhosa',
  'Afrikaans',
  'Sepedi',
  'Setswana',
  'Sesotho',
  'Xitsonga',
  'siSwati',
  'Tshivenda',
  'isiNdebele',
];

export const THEME_ACCENTS: ThemeAccentConfig[] = [
  {
    id: 'forest-green',
    name: 'Forest Green',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    primaryColor: '#059669',
    secondaryColor: '#10b981',
  },
  {
    id: 'sky-blue',
    name: 'Sky Blue',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    primaryColor: '#0284c7',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    primaryColor: '#1d4ed8',
    secondaryColor: '#3b82f6',
  },
  {
    id: 'sand-brown',
    name: 'Sand Brown',
    gradient: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
    primaryColor: '#92400e',
    secondaryColor: '#f59e0b',
  },
  {
    id: 'crimson-red',
    name: 'Crimson Red',
    gradient: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
    primaryColor: '#991b1b',
    secondaryColor: '#ef4444',
  },
  {
    id: 'amber-yellow',
    name: 'Amber Yellow',
    gradient: 'linear-gradient(135deg, #b45309 0%, #fbbf24 100%)',
    primaryColor: '#b45309',
    secondaryColor: '#fbbf24',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    gradient: 'linear-gradient(135deg, #3730a3 0%, #6366f1 100%)',
    primaryColor: '#3730a3',
    secondaryColor: '#6366f1',
  },
  {
    id: 'violet',
    name: 'Violet',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)',
    primaryColor: '#6d28d9',
    secondaryColor: '#a78bfa',
  },
];

export const GRADES = [
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const US_GRADES = [
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
];

export const UK_GRADES = [
  'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
  'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11',
  'Year 12', 'Year 13',
];


/** US states + DC — each runs its own academic standards. */
export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

/** South African provinces (kept for the CAPS (DBE) pathway). */
export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

export const REGIONS_BY_COUNTRY = {
  US: US_STATES.map((s) => s.name),
  ZA: SA_PROVINCES,
};

/**
 * UK regions by nation. The UK has no "states" — each nation is divided into
 * counties / council areas / principal areas / districts, and each nation runs
 * its own curriculum:
 *   England          -> National Curriculum (GCSE / A-level, Ofqual)
 *   Scotland         -> Curriculum for Excellence (National 4/5, Highers, SQA)
 *   Wales            -> Curriculum for Wales (GCSE, WJEC)
 *   Northern Ireland -> Northern Ireland Curriculum (GCSE / A-level, CCEA)
 */
export const UK_REGIONS: Record<string, string[]> = {
  England: [
    'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire', 'Cheshire',
    'City of London', 'Cornwall', 'Cumbria', 'Derbyshire', 'Devon', 'Dorset', 'Durham',
    'East Riding of Yorkshire', 'East Sussex', 'Essex', 'Gloucestershire', 'Greater London',
    'Greater Manchester', 'Hampshire', 'Herefordshire', 'Hertfordshire', 'Isle of Wight',
    'Kent', 'Lancashire', 'Leicestershire', 'Lincolnshire', 'Merseyside', 'Norfolk',
    'North Yorkshire', 'Northamptonshire', 'Northumberland', 'Nottinghamshire', 'Oxfordshire',
    'Rutland', 'Shropshire', 'Somerset', 'South Yorkshire', 'Staffordshire', 'Suffolk',
    'Surrey', 'Tyne and Wear', 'Warwickshire', 'West Midlands', 'West Sussex', 'West Yorkshire',
    'Wiltshire', 'Worcestershire',
  ],
  Scotland: [
    'Aberdeen City', 'Aberdeenshire', 'Angus', 'Argyll and Bute', 'Clackmannanshire',
    'Dumfries and Galloway', 'Dundee City', 'East Ayrshire', 'East Dunbartonshire',
    'East Lothian', 'East Renfrewshire', 'City of Edinburgh', 'Na h-Eileanan Siar',
    'Falkirk', 'Fife', 'Glasgow City', 'Highland', 'Inverclyde', 'Midlothian', 'Moray',
    'North Ayrshire', 'North Lanarkshire', 'Orkney Islands', 'Perth and Kinross',
    'Renfrewshire', 'Scottish Borders', 'Shetland Islands', 'South Ayrshire',
    'South Lanarkshire', 'Stirling', 'West Dunbartonshire', 'West Lothian',
  ],
  Wales: [
    'Blaenau Gwent', 'Bridgend', 'Caerphilly', 'Cardiff', 'Carmarthenshire', 'Ceredigion',
    'Conwy', 'Denbighshire', 'Flintshire', 'Gwynedd', 'Isle of Anglesey', 'Merthyr Tydfil',
    'Monmouthshire', 'Neath Port Talbot', 'Newport', 'Pembrokeshire', 'Powys',
    'Rhondda Cynon Taf', 'Swansea', 'Torfaen', 'Vale of Glamorgan', 'Wrexham',
  ],
  'Northern Ireland': [
    'Antrim and Newtownabbey', 'Ards and North Down', 'Armagh City, Banbridge and Craigavon',
    'Belfast', 'Causeway Coast and Glens', 'Derry City and Strabane', 'Fermanagh and Omagh',
    'Lisburn and Castlereagh', 'Mid and East Antrim', 'Mid Ulster', 'Newry, Mourne and Down',
  ],
};

export const UK_NATIONS = Object.keys(UK_REGIONS);

/** Curriculum label + qualifications body per UK nation. */
export const UK_CURRICULUM_BY_NATION: Record<string, { curriculum: string; qualifications: string }> = {
  England: { curriculum: 'National Curriculum (England)', qualifications: 'GCSE / A-level (Ofqual)' },
  Scotland: { curriculum: 'Curriculum for Excellence', qualifications: 'National 4/5, Highers (SQA)' },
  Wales: { curriculum: 'Curriculum for Wales', qualifications: 'GCSE / A-level (WJEC)' },
  'Northern Ireland': { curriculum: 'Northern Ireland Curriculum', qualifications: 'GCSE / A-level (CCEA)' },
};

/** Subjects commonly taken in UK secondary schools (GCSE / National 5 / A-level). */
export const UK_ALL_SUBJECTS = [
  { name: 'English Language', category: 'Language' as const },
  { name: 'English Literature', category: 'Language' as const },
  { name: 'Mathematics', category: 'Mathematics' as const },
  { name: 'Further Mathematics', category: 'Mathematics' as const },
  { name: 'Biology', category: 'Sciences' as const },
  { name: 'Chemistry', category: 'Sciences' as const },
  { name: 'Physics', category: 'Sciences' as const },
  { name: 'Combined Science', category: 'Sciences' as const },
  { name: 'History', category: 'Humanities' as const },
  { name: 'Geography', category: 'Humanities' as const },
  { name: 'Religious Studies', category: 'Humanities' as const },
  { name: 'Citizenship / PSHE', category: 'Humanities' as const },
  { name: 'French', category: 'Language' as const },
  { name: 'Spanish', category: 'Language' as const },
  { name: 'German', category: 'Language' as const },
  { name: 'Computer Science', category: 'Technology' as const },
  { name: 'Business Studies', category: 'Commerce' as const },
  { name: 'Economics', category: 'Commerce' as const },
  { name: 'Design and Technology', category: 'Technology' as const },
  { name: 'Art and Design', category: 'Services' as const },
  { name: 'Music', category: 'Services' as const },
  { name: 'Drama', category: 'Services' as const },
  { name: 'Physical Education', category: 'Services' as const },
  { name: 'Food Preparation and Nutrition', category: 'Services' as const },
  { name: 'Psychology', category: 'Humanities' as const },
  { name: 'Sociology', category: 'Humanities' as const },
  { name: 'Media Studies', category: 'Humanities' as const },
];

/** Subjects commonly taken in US middle/high schools (state standards are per-state). */
export const US_ALL_SUBJECTS = [
  { name: 'English Language Arts', category: 'Language' as const },
  { name: 'Mathematics', category: 'Mathematics' as const },
  { name: 'Algebra I', category: 'Mathematics' as const },
  { name: 'Geometry', category: 'Mathematics' as const },
  { name: 'Algebra II', category: 'Mathematics' as const },
  { name: 'Pre-Calculus', category: 'Mathematics' as const },
  { name: 'AP Calculus AB', category: 'Mathematics' as const },
  { name: 'Statistics', category: 'Mathematics' as const },
  { name: 'Biology', category: 'Sciences' as const },
  { name: 'Chemistry', category: 'Sciences' as const },
  { name: 'Physics', category: 'Sciences' as const },
  { name: 'Earth & Space Science', category: 'Sciences' as const },
  { name: 'Environmental Science', category: 'Sciences' as const },
  { name: 'Anatomy & Physiology', category: 'Sciences' as const },
  { name: 'US History', category: 'Humanities' as const },
  { name: 'World History', category: 'Humanities' as const },
  { name: 'US Government & Civics', category: 'Humanities' as const },
  { name: 'Economics', category: 'Commerce' as const },
  { name: 'Geography', category: 'Humanities' as const },
  { name: 'Psychology', category: 'Humanities' as const },
  { name: 'Spanish', category: 'Language' as const },
  { name: 'French', category: 'Language' as const },
  { name: 'Computer Science', category: 'Technology' as const },
  { name: 'Health & Physical Education', category: 'Services' as const },
  { name: 'Art / Visual Arts', category: 'Services' as const },
  { name: 'Music', category: 'Services' as const },
];




export const DBE_ALL_SUBJECTS = [
  // Languages
  { name: 'English Home Language', category: 'Language' as const },
  { name: 'English First Additional Language', category: 'Language' as const },
  { name: 'isiZulu Home Language', category: 'Language' as const },
  { name: 'isiZulu First Additional Language', category: 'Language' as const },
  { name: 'isiXhosa Home Language', category: 'Language' as const },
  { name: 'isiXhosa First Additional Language', category: 'Language' as const },
  { name: 'Afrikaans Huistaal', category: 'Language' as const },
  { name: 'Afrikaans Eerste Addisionele Taal', category: 'Language' as const },
  { name: 'Sepedi Home Language', category: 'Language' as const },
  { name: 'Sepedi First Additional Language', category: 'Language' as const },
  { name: 'Setswana Home Language', category: 'Language' as const },
  { name: 'Setswana First Additional Language', category: 'Language' as const },
  { name: 'Sesotho Home Language', category: 'Language' as const },
  { name: 'Sesotho First Additional Language', category: 'Language' as const },
  { name: 'Xitsonga Home Language', category: 'Language' as const },
  { name: 'siSwati Home Language', category: 'Language' as const },
  { name: 'Tshivenda Home Language', category: 'Language' as const },
  { name: 'isiNdebele Home Language', category: 'Language' as const },

  // Mathematics
  { name: 'Mathematics (Pure)', category: 'Mathematics' as const },
  { name: 'Mathematical Literacy', category: 'Mathematics' as const },
  { name: 'Technical Mathematics', category: 'Mathematics' as const },

  // Core & Life Orientation
  { name: 'Life Orientation', category: 'Humanities' as const },

  // Sciences
  { name: 'Physical Sciences (Physics & Chemistry)', category: 'Sciences' as const },
  { name: 'Life Sciences (Biology)', category: 'Sciences' as const },
  { name: 'Technical Sciences', category: 'Sciences' as const },
  { name: 'Agricultural Sciences', category: 'Sciences' as const },
  { name: 'Agricultural Management Practices', category: 'Sciences' as const },

  // Commerce
  { name: 'Accounting', category: 'Commerce' as const },
  { name: 'Business Studies', category: 'Commerce' as const },
  { name: 'Economics', category: 'Commerce' as const },

  // Humanities & Social Sciences
  { name: 'Geography', category: 'Humanities' as const },
  { name: 'History', category: 'Humanities' as const },
  { name: 'Religion Studies', category: 'Humanities' as const },

  // Technology & Engineering
  { name: 'Information Technology (IT)', category: 'Technology' as const },
  { name: 'Computer Applications Technology (CAT)', category: 'Technology' as const },
  { name: 'Engineering Graphics & Design (EGD)', category: 'Technology' as const },

  // Services
  { name: 'Tourism', category: 'Services' as const },
  { name: 'Consumer Studies', category: 'Services' as const },
  { name: 'Hospitality Studies', category: 'Services' as const },
];

// Comprehensive Pure Maths and Maths Lit formula sheet data (Grade 7 - 12)
export const MATHS_FORMULAE: FormulaItem[] = [
  // ALGEBRA
  {
    id: 'alg-quadratic',
    name: 'Quadratic Formula',
    topic: 'Algebra & Equations',
    formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    description: 'Solves any quadratic equation in standard form ax² + bx + c = 0.',
    variables: [
      { symbol: 'a, b, c', meaning: 'Coefficients of the quadratic equation where a ≠ 0' },
      { symbol: 'b² - 4ac', meaning: 'Discriminant (Δ) determining the nature of roots' },
    ],
    whenToUse: 'When quadratic expressions cannot easily be factorized by inspection.',
    example: 'For 2x² - 5x - 3 = 0: a=2, b=-5, c=-3 ⟹ x = (5 ± √(25 - 4(2)(-3))) / 4 = (5 ± 7)/4 ⟹ x = 3 or x = -0.5',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },
  {
    id: 'alg-discriminant',
    name: 'Nature of Roots (Discriminant)',
    topic: 'Algebra & Equations',
    formula: '\\Delta = b^2 - 4ac',
    description: 'Determines whether roots are real, non-real, rational, irrational, or equal.',
    variables: [
      { symbol: 'Δ > 0', meaning: 'Two unequal real roots (rational if perfect square, irrational if not)' },
      { symbol: 'Δ = 0', meaning: 'Two equal real roots (one repeated rational root)' },
      { symbol: 'Δ < 0', meaning: 'Non-real / imaginary roots (no real solutions)' },
    ],
    whenToUse: 'When asked to determine or prove the nature of roots without solving.',
    example: 'Prove x² + 4x + 5 = 0 has no real roots: Δ = (4)² - 4(1)(5) = 16 - 20 = -4 < 0. Therefore non-real.',
    grades: ['Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },
  {
    id: 'alg-series-arithmetic-term',
    name: 'Arithmetic Sequence (General Term)',
    topic: 'Number Patterns & Series',
    formula: 'T_n = a + (n - 1)d',
    description: 'Finds the nth term of a sequence with constant first difference d.',
    variables: [
      { symbol: 'a', meaning: 'First term (T₁)' },
      { symbol: 'd', meaning: 'Common difference (T₂ - T₁)' },
      { symbol: 'n', meaning: 'Term position/index' },
    ],
    whenToUse: 'Finding specific terms or finding the number of terms in an arithmetic sequence.',
    example: 'For 3; 7; 11; ...: a=3, d=4 ⟹ T₂₀ = 3 + (19)(4) = 79',
    grades: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },
  {
    id: 'alg-series-arithmetic-sum',
    name: 'Arithmetic Series (Sum Formula)',
    topic: 'Number Patterns & Series',
    formula: 'S_n = \\frac{n}{2}[2a + (n - 1)d] = \\frac{n}{2}[a + l]',
    description: 'Calculates the sum of the first n terms of an arithmetic progression.',
    variables: [
      { symbol: 'S_n', meaning: 'Sum of n terms' },
      { symbol: 'l', meaning: 'Last term (T_n)' },
    ],
    whenToUse: 'Summing consecutive values with fixed common difference.',
    example: 'Sum of first 50 terms of 2; 5; 8; ...: S₅₀ = (50/2)[2(2) + 49(3)] = 25[4 + 147] = 3775',
    grades: ['Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },
  {
    id: 'alg-series-geometric-term',
    name: 'Geometric Sequence (General Term)',
    topic: 'Number Patterns & Series',
    formula: 'T_n = a \\cdot r^{n - 1}',
    description: 'Calculates the nth term when terms have a constant ratio r = T₂/T₁.',
    variables: [
      { symbol: 'a', meaning: 'First term' },
      { symbol: 'r', meaning: 'Common ratio (T_k / T_{k-1})' },
    ],
    whenToUse: 'Exponential growth, sequences with multiplying factor.',
    example: 'Sequence 2; 6; 18; ...: a=2, r=3 ⟹ T₆ = 2(3)⁵ = 486',
    grades: ['Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },
  {
    id: 'alg-series-geometric-sum',
    name: 'Geometric Series Sum',
    topic: 'Number Patterns & Series',
    formula: 'S_n = \\frac{a(r^n - 1)}{r - 1} \\quad (r \\neq 1)',
    description: 'Computes sum of finite geometric series.',
    variables: [
      { symbol: 'S_n', meaning: 'Sum of n terms' },
      { symbol: 'r', meaning: 'Common ratio' },
    ],
    whenToUse: 'Adding up terms that multiply by constant ratio.',
    example: 'For 5; 10; 20; 40; ...: S₈ = 5(2⁸ - 1)/(2 - 1) = 5(255) = 1275',
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },
  {
    id: 'alg-series-infinite-sum',
    name: 'Sum to Infinity (Convergent Geometric)',
    topic: 'Number Patterns & Series',
    formula: 'S_\\infty = \\frac{a}{1 - r} \\quad (-1 < r < 1)',
    description: 'Calculates infinite sum when |r| < 1 (convergent sequence).',
    variables: [
      { symbol: 'S_∞', meaning: 'Limiting sum as n approaches infinity' },
      { symbol: 'Condition', meaning: 'Converges ONLY if -1 < r < 1' },
    ],
    whenToUse: 'Bouncing ball problems, recurring decimals, infinite decaying series.',
    example: 'For 16; 8; 4; 2; ...: a=16, r=0.5 ⟹ S_∞ = 16 / (1 - 0.5) = 32',
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },

  // CALCULUS
  {
    id: 'calc-first-principles',
    name: 'Derivative from First Principles',
    topic: 'Calculus',
    formula: "f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}",
    description: 'The fundamental definition of gradient/instantaneous rate of change at any point x.',
    variables: [
      { symbol: "f'(x)", meaning: 'Derivative or gradient function' },
      { symbol: 'h', meaning: 'Small increment approaching zero' },
    ],
    whenToUse: 'Compulsory in NSC Paper 1 Question 7 (typically 5 marks). MANDATORY when question says "from first principles".',
    example: "For f(x) = 3x²: f(x+h) = 3(x+h)² = 3x² + 6xh + 3h² ⟹ f'(x) = lim_{h->0} [6xh + 3h²]/h = lim_{h->0} (6x + 3h) = 6x",
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },
  {
    id: 'calc-power-rule',
    name: 'Power Rule for Differentiation',
    topic: 'Calculus',
    formula: "\\frac{d}{dx}[a x^n] = n \\cdot a x^{n - 1}",
    description: 'Fast derivative rule for polynomial terms.',
    variables: [
      { symbol: 'n', meaning: 'Power/exponent (can be positive, negative, or fraction)' },
    ],
    whenToUse: 'Finding turning points, tangents, and optimization quickly.',
    example: 'd/dx [4x³ - 5x² + 7] = 12x² - 10x',
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },

  // FINANCIAL MATHEMATICS
  {
    id: 'fin-compound-interest',
    name: 'Compound Interest & Inflation',
    topic: 'Financial Mathematics',
    formula: 'A = P(1 + i)^n',
    description: 'Calculates accumulated future value under compound interest or inflation.',
    variables: [
      { symbol: 'A', meaning: 'Accumulated amount / Future value' },
      { symbol: 'P', meaning: 'Principal / Present investment' },
      { symbol: 'i', meaning: 'Interest rate per compounding period (r / 100 / m)' },
      { symbol: 'n', meaning: 'Total number of compounding periods (years × m)' },
    ],
    whenToUse: 'Lump sum bank investments, fixed deposits, inflation projections.',
    example: 'R10 000 at 9% p.a. compounded monthly for 5 years: i = 0.09/12, n = 60 ⟹ A = 10000(1 + 0.0075)⁶⁰ = R15 656.81',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    stream: 'Both',
    paper: 'Paper 1',
  },
  {
    id: 'fin-reducing-balance-depreciation',
    name: 'Reducing Balance Depreciation',
    topic: 'Financial Mathematics',
    formula: 'A = P(1 - i)^n',
    description: 'Calculates book value of an asset depreciating on reducing balance.',
    variables: [
      { symbol: 'A', meaning: 'Scrap value / Book value after n years' },
      { symbol: 'P', meaning: 'Original purchase price' },
      { symbol: 'i', meaning: 'Depreciation rate per annum' },
    ],
    whenToUse: 'Vehicle resale value, machinery scrap value, sinking fund initial asset replacement.',
    example: 'Car bought for R250 000 depreciates at 15% p.a. reducing balance: A = 250000(1 - 0.15)⁴ = R130 501.56',
    grades: ['Grade 11', 'Grade 12'],
    stream: 'Both',
    paper: 'Paper 1',
  },
  {
    id: 'fin-future-value-annuity',
    name: 'Future Value Annuity (Savings Plan)',
    topic: 'Financial Mathematics',
    formula: 'F_v = \\frac{x[(1 + i)^n - 1]}{i}',
    description: 'Calculates future total of equal recurring payments made at regular intervals.',
    variables: [
      { symbol: 'F_v', meaning: 'Future accumulated value' },
      { symbol: 'x', meaning: 'Equal recurring monthly deposit' },
      { symbol: 'i', meaning: 'Interest rate per payment interval' },
      { symbol: 'n', meaning: 'Total number of payments made' },
    ],
    whenToUse: 'Retirement annuities, sinking funds, saving for college with monthly deposits.',
    example: 'Save R1 500 monthly for 10 years at 8.5% p.a. monthly: i=0.085/12, n=120 ⟹ F = R316 431.18',
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },
  {
    id: 'fin-present-value-annuity',
    name: 'Present Value Annuity (Home Loans & Mortgages)',
    topic: 'Financial Mathematics',
    formula: 'P_v = \\frac{x[1 - (1 + i)^{-n}]}{i}',
    description: 'Calculates the loan amount that can be repaid by equal recurring installments.',
    variables: [
      { symbol: 'P_v', meaning: 'Present value / Loan amount borrowed' },
      { symbol: 'x', meaning: 'Monthly repayment installment' },
      { symbol: 'i', meaning: 'Interest rate per compounding interval' },
      { symbol: 'n', meaning: 'Total number of monthly payments remaining' },
    ],
    whenToUse: 'Bond repayment, vehicle finance installments, outstanding loan balances.',
    example: 'Bond of R1 200 000 at 10.5% p.a. over 20 years: solve for x: x = R11 984.77 per month',
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 1',
  },

  // ANALYTICAL GEOMETRY
  {
    id: 'geom-distance',
    name: 'Distance Formula',
    topic: 'Analytical Geometry',
    formula: 'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}',
    description: 'Calculates distance between two Cartesian points A(x₁, y₁) and B(x₂, y₂).',
    variables: [
      { symbol: 'd', meaning: 'Length of straight line segment AB' },
    ],
    whenToUse: 'Lengths of triangle sides, radius from center to point, proving isosceles or equilateral.',
    example: 'Distance between (1, 2) and (4, 6): d = √((4-1)² + (6-2)²) = √(9 + 16) = √25 = 5 units',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 2',
  },
  {
    id: 'geom-gradient',
    name: 'Gradient & Inclination Angle',
    topic: 'Analytical Geometry',
    formula: 'm = \\frac{y_2 - y_1}{x_2 - x_1} \\quad \\text{and} \\quad \\tan\\theta = m',
    description: 'Measures steepness and direction of a line, and inclination angle θ with positive x-axis.',
    variables: [
      { symbol: 'm', meaning: 'Gradient/slope' },
      { symbol: 'θ', meaning: 'Inclination angle (0° ≤ θ < 180°)' },
      { symbol: 'm₁ = m₂', meaning: 'Parallel lines have equal slopes' },
      { symbol: 'm₁ · m₂ = -1', meaning: 'Perpendicular lines multiply to -1' },
    ],
    whenToUse: 'Proving parallel or perpendicular lines, finding tangents to circles.',
    example: 'If m = -1: tan θ = -1 ⟹ reference angle = 45° ⟹ θ = 180° - 45° = 135°',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 2',
  },
  {
    id: 'geom-circle-equation',
    name: 'Equation of a Circle',
    topic: 'Analytical Geometry',
    formula: '(x - a)^2 + (y - b)^2 = r^2',
    description: 'Standard Cartesian equation of circle with center (a, b) and radius r.',
    variables: [
      { symbol: '(a, b)', meaning: 'Coordinates of circle center' },
      { symbol: 'r', meaning: 'Radius length' },
    ],
    whenToUse: 'Finding circle center and radius via completing the square, tangent to a circle.',
    example: 'Circle with center (3, -2) and radius 5: (x - 3)² + (y + 2)² = 25',
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 2',
  },

  // TRIGONOMETRY
  {
    id: 'trig-sine-rule',
    name: 'Sine Rule',
    topic: 'Trigonometry',
    formula: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}',
    description: 'Relates sides of any acute or obtuse triangle to the sines of its opposite angles.',
    variables: [
      { symbol: 'a, b, c', meaning: 'Lengths of sides opposite angles A, B, C' },
    ],
    whenToUse: 'In non-right-angled triangles when given two angles and a side, or two sides and opposite angle.',
    example: 'Given a=10, A=45°, B=60°: b = (10 · sin 60°) / sin 45° = (10 · 0.866) / 0.707 = 12.25',
    grades: ['Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 2',
  },
  {
    id: 'trig-cosine-rule',
    name: 'Cosine Rule',
    topic: 'Trigonometry',
    formula: 'a^2 = b^2 + c^2 - 2bc \\cos A',
    description: 'Calculates the third side when given two sides and included angle, or any angle given three sides.',
    variables: [
      { symbol: 'A', meaning: 'Angle included between sides b and c' },
    ],
    whenToUse: 'When given Side-Angle-Side (SAS) or Side-Side-Side (SSS) in 2D & 3D trigonometry.',
    example: 'b=5, c=8, A=60°: a² = 25 + 64 - 2(5)(8)(cos 60°) = 89 - 40 = 49 ⟹ a = 7',
    grades: ['Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 2',
  },
  {
    id: 'trig-area-rule',
    name: 'Area Rule for Triangles',
    topic: 'Trigonometry',
    formula: '\\text{Area} = \\frac{1}{2}ab \\sin C',
    description: 'Calculates area of any triangle without needing perpendicular height.',
    variables: [
      { symbol: 'a, b', meaning: 'Two known side lengths' },
      { symbol: 'C', meaning: 'Included angle between sides a and b' },
    ],
    whenToUse: 'Area of triangles in 2D and 3D trigonometry.',
    example: 'a = 12, b = 9, C = 30°: Area = 0.5(12)(9)(sin 30°) = 54(0.5) = 27 units²',
    grades: ['Grade 11', 'Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 2',
  },
  {
    id: 'trig-compound-angles',
    name: 'Compound Angle Identities',
    topic: 'Trigonometry',
    formula: '\\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta \\quad \\text{and} \\quad \\sin(\\alpha + \\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta',
    description: 'Expands trigonometric functions of sums and differences of angles.',
    variables: [
      { symbol: 'α, β', meaning: 'Two component angles' },
    ],
    whenToUse: 'Evaluating without calculator (e.g. cos 15° = cos(45° - 30°)), simplifying general identities.',
    example: 'sin(75°) = sin(45° + 30°) = sin45°cos30° + cos45°sin30° = (√2/2)(√3/2) + (√2/2)(1/2) = (√6 + √2)/4',
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 2',
  },
  {
    id: 'trig-double-angles',
    name: 'Double Angle Identities',
    topic: 'Trigonometry',
    formula: '\\sin 2A = 2\\sin A \\cos A \\quad \\text{and} \\quad \\cos 2A = \\cos^2 A - \\sin^2 A = 2\\cos^2 A - 1 = 1 - 2\\sin^2 A',
    description: 'Expresses trig functions of 2A in terms of single angle A.',
    variables: [
      { symbol: 'A', meaning: 'Single base angle' },
    ],
    whenToUse: 'Trigonometric equations, finding max/min values, reducing powers.',
    example: 'Simplify: 2 sin 15° cos 15° = sin(2 × 15°) = sin 30° = 0.5',
    grades: ['Grade 12'],
    stream: 'Pure Mathematics',
    paper: 'Paper 2',
  },

  // MATHEMATICAL LITERACY SPECIALIZED FORMULAE
  {
    id: 'lit-vat-calc',
    name: 'South African VAT (15%) Calculation',
    topic: 'Finance & Taxation',
    formula: '\\text{VAT Inclusive} = \\text{VAT Exclusive} \\times 1.15 \\quad | \\quad \\text{VAT Amount} = \\text{Inclusive} \\times \\frac{15}{115}',
    description: 'South African statutory Value Added Tax (15%) inclusive and exclusive conversions.',
    variables: [
      { symbol: '15%', meaning: 'Current standard South African VAT rate' },
      { symbol: '115%', meaning: 'Inclusive price factor' },
    ],
    whenToUse: 'Everyday till receipts, till slips, business invoices, fuel levy exclusions.',
    example: 'A laptop costs R13 800 incl. VAT. VAT Exclusive = 13800 / 1.15 = R12 000. VAT portion = R1 800.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    stream: 'Mathematical Literacy',
    paper: 'Paper 1',
  },
  {
    id: 'lit-bmi-calc',
    name: 'Body Mass Index (BMI)',
    topic: 'Measurement & Health',
    formula: '\\text{BMI} = \\frac{\\text{Weight in kg}}{(\\text{Height in meters})^2}',
    description: 'Measures body fat screening category for adults.',
    variables: [
      { symbol: 'Weight', meaning: 'Must be strictly in kilograms (kg)' },
      { symbol: 'Height', meaning: 'Must be strictly in meters (m), squared' },
    ],
    whenToUse: 'Health data questions, DBE Paper 2 measurement context.',
    example: 'A person weighs 78 kg and is 1.75 m tall: BMI = 78 / (1.75)² = 78 / 3.0625 = 25.47 kg/m² (Overweight category)',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    stream: 'Mathematical Literacy',
    paper: 'Paper 2',
  },
  {
    id: 'lit-scale-map',
    name: 'Map Scale & Actual Distance',
    topic: 'Maps, Plans & Representations',
    formula: '\\text{Actual Distance} = \\text{Map Distance} \\times \\text{Scale Factor} \\quad (1\\text{ km} = 100\\,000\\text{ cm})',
    description: 'Converts ruler measurements on 2D maps to real-world kilometers or meters.',
    variables: [
      { symbol: '1 : 50 000', meaning: '1 cm on map represents 50 000 cm (500 m or 0.5 km) on ground' },
    ],
    whenToUse: 'Topographical maps, architectural floor plans, route navigation.',
    example: 'Map scale 1 : 250 000, distance measured is 4.8 cm. Real distance = 4.8 × 250 000 cm = 1 200 000 cm = 12 km.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    stream: 'Mathematical Literacy',
    paper: 'Paper 2',
  },
  {
    id: 'lit-tax-threshold',
    name: 'SARS Personal Income Tax Calculation',
    topic: 'Finance & Taxation',
    formula: '\\text{Net Tax Payable} = (\\text{Tax from Bracket Table}) - (\\text{Primary Rebate} + \\text{Secondary Rebate})',
    description: 'South African Revenue Service (SARS) sliding tax bracket computation.',
    variables: [
      { symbol: 'Gross Income', meaning: 'Total earnings before deductions' },
      { symbol: 'Taxable Income', meaning: 'Gross minus pension/RA and allowed deductions' },
      { symbol: 'Rebates', meaning: 'Statutory SARS relief discounts' },
    ],
    whenToUse: 'NSC Mathematical Literacy Paper 1 Question 3 & 4 (Finance).',
    example: 'Taxable income R300 000 in Bracket 2 (18% base + 26% on amount > R237 100): Tax = R42 678 + 0.26(62 900) - R17 235 = R41 797.',
    grades: ['Grade 11', 'Grade 12'],
    stream: 'Mathematical Literacy',
    paper: 'Paper 1',
  },
];

// Sample past paper structure blueprints for authentic NSC DBE simulator
export const NSC_EXAM_BLUEPRINTS = {
  june: {
    title: 'Mid-Year Midterm Examination (June)',
    purpose: 'Tests Term 1 and Term 2 CAPS ATP syllabus mastery with high diagnostic value for trial preparation.',
    markingStandard: 'Strict DBE marking guideline with partial marks for method, formula, substitution, and accuracy.',
  },
  november: {
    title: 'National Senior Certificate Final Examination (November)',
    purpose: 'Comprehensive 100% curriculum test covering all 4 Terms under strict national standard benchmarking.',
    markingStandard: 'NSC Senior Marker Memo with breakdown into CA (Consistent Accuracy), M (Method), A (Accuracy), S (Statement), R (Reason).',
  },
};

/** Subject catalog per country — declared last because it references the DBE list. */
export const SUBJECTS_BY_COUNTRY = {
  US: US_ALL_SUBJECTS,
  UK: UK_ALL_SUBJECTS,
  ZA: DBE_ALL_SUBJECTS,
};
