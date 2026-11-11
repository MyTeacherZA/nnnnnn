/**
 * ============================================================================
 * MyTutorZA: Selective DBE CAPS Curriculum Vault
 * ============================================================================
 * Emulates the 450+ South African Department of Basic Education (DBE) Curriculum
 * and Assessment Policy Statement (CAPS) documents.
 * 
 * In standard operation, instead of feeding all 450 PDFs into the context window,
 * this vault selectively grabs ONLY the exact Subject & Grade CAPS Annual Teaching
 * Plan (ATP), official Examination Guidelines, formula sheet requirements,
 * cognitive level breakdowns (Blooms 1-4), and chief examiner trap warnings,
 * dropping them straight into Gemini's active context window.
 */

export interface CapsTopicDetails {
  term: number;
  week: string;
  topicName: string;
  syllabusRequirements: string[];
  examinerTraps: string[];
  requiredFormulas?: string[];
  requiredDefinitions?: string[];
  cognitiveWeight: {
    knowledge: number; // Level 1 (20%)
    routine: number;   // Level 2 (35%)
    complex: number;   // Level 3 (30%)
    problemSolving: number; // Level 4 (15%)
  };
}

export interface CapsSubjectPlanner {
  subject: string;
  grade: string;
  curriculumCode: string;
  officialPaperStructure: string;
  examinationGuidelines: string[];
  textbookReferences: string[];
  topics: CapsTopicDetails[];
}

export const CAPS_CURRICULUM_DATABASE: Record<string, CapsSubjectPlanner> = {
  // ---------------------------------------------------------------------------
  // Grade 10 Physical Sciences (Physics & Chemistry)
  // ---------------------------------------------------------------------------
  'Grade 10 Physical Sciences': {
    subject: 'Physical Sciences',
    grade: 'Grade 10',
    curriculumCode: 'DBE-CAPS-PHSC-GR10',
    officialPaperStructure: 'Two 2-hour papers: Paper 1 (Physics - 100 Marks), Paper 2 (Chemistry - 100 Marks). Calculator allowed. Separate formula sheets provided.',
    examinationGuidelines: [
      'Candidates must write down the exact formula as it appears on the official formula sheet before substituting.',
      'One mark is awarded for the correct formula, one mark for correct substitution, and one mark for the final answer with correct SI units and direction (for vector quantities).',
      'No marks are awarded if an incorrect formula or manipulated formula with wrong algebra is used.',
      'Significant figures: round off final numerical answers to a minimum of TWO decimal places unless specified otherwise.',
      'Gravitational acceleration on Earth: take g = 9.8 mÂ·sâ»Â² downwards.',
    ],
    textbookReferences: [
      'Siyavula Physical Sciences Grade 10 (Open Educational Resource approved by DBE)',
      'Mind the Gap Physics Study Guide Grade 10 (Department of Basic Education)',
      'Platinum Physical Sciences Grade 10 Learner Book (Maskew Miller Longman)',
      'Doc Scientia Physical Sciences Grade 10 Textbook and Workbook',
    ],
    topics: [
      {
        term: 1,
        week: 'Weeks 1-4',
        topicName: 'Mechanics: Motion in One Dimension (Vectors & Scalars, Position, Displacement, Distance, Speed, Velocity)',
        syllabusRequirements: [
          'Define a scalar as a physical quantity having magnitude only and a vector as having both magnitude and direction.',
          'Define position relative to a reference point.',
          'Distinguish between distance (scalar length of path) and displacement (vector change in position: Î”x = x_f - x_i).',
          'Calculate average speed (distance/time) and average velocity (Î”x/Î”t).',
          'Plot and interpret position vs. time (x-t), velocity vs. time (v-t), and acceleration vs. time (a-t) graphs.',
          'Understand that the gradient of an x-t graph gives velocity, the gradient of a v-t graph gives acceleration, and the area under a v-t graph gives displacement.',
        ],
        examinerTraps: [
          'Learners frequently confuse distance (always positive scalar) with displacement (vector with sign/direction).',
          'Failing to specify direction in final velocity or displacement answers (e.g. writing "15 m/s" instead of "15 m/s East" or "15 m/s to the right").',
          'Misinterpreting a negative gradient on a position-time graph as moving backwards at decreasing speed rather than constant velocity in the negative direction.',
          'Forgetting that constant speed around a curve is accelerating because direction is changing.',
        ],
        requiredFormulas: [
          'v_avg = Î”x / Î”t',
          'v_f = v_i + aÎ”t',
          'Î”x = v_iÎ”t + 0.5a(Î”t)Â²',
          'v_fÂ² = v_iÂ² + 2aÎ”x',
          'Î”x = ((v_i + v_f) / 2)Î”t',
        ],
        requiredDefinitions: [
          'Acceleration: The rate of change of velocity (a = Î”v/Î”t).',
          'Displacement: The change in position of an object, represented by a vector pointing from initial to final position.',
        ],
        cognitiveWeight: { knowledge: 20, routine: 35, complex: 30, problemSolving: 15 },
      },
      {
        term: 1,
        week: 'Weeks 5-8',
        topicName: 'Waves, Sound & Light: Transverse and Longitudinal Waves, Electromagnetic Radiation',
        syllabusRequirements: [
          'Define transverse pulse, transverse wave, crest, trough, amplitude, wavelength (Î»), frequency (f), period (T), and wave speed (v).',
          'State and apply the wave equation v = f Â· Î».',
          'Understand superposition of pulses (constructive and destructive interference).',
          'Define longitudinal waves with compressions and rarefactions; understand sound waves as longitudinal waves.',
          'Calculate photon energy using E = hÂ·f = hÂ·c / Î», with Planck constant h = 6.63 Ã— 10â»Â³â´ JÂ·s and c = 3.0 Ã— 10â¸ mÂ·sâ»Â¹.',
        ],
        examinerTraps: [
          'Mixing up frequency f (in Hz) and period T (in seconds) in substitution: T = 1/f.',
          'Forgetting to convert wavelengths given in nanometers (nm) to meters (m) by multiplying by 10â»â¹ before calculating photon energy.',
          'Confusing pitch (determined by frequency) and loudness (determined by amplitude) of sound waves.',
        ],
        requiredFormulas: ['v = f Â· Î»', 'T = 1 / f', 'E = h Â· f', 'c = f Â· Î»'],
        requiredDefinitions: [
          'Wavelength: The distance between two consecutive points in phase on a wave.',
          'Frequency: The number of complete wave cycles passing a fixed point per second.',
          'Photon: A quantum (packet) of electromagnetic energy.',
        ],
        cognitiveWeight: { knowledge: 25, routine: 35, complex: 25, problemSolving: 15 },
      },
      {
        term: 2,
        week: 'Weeks 1-5',
        topicName: 'Matter & Materials: Atomic Structure, Periodic Table, Chemical Bonding, States of Matter',
        syllabusRequirements: [
          'Describe the structure of an atom: protons and neutrons in the nucleus, electrons in discrete energy levels.',
          'Represent elements using standard notation (Z = atomic number, A = mass number).',
          'Write electron configurations using s, p, d notation and Aufbau diagrams (Hund\'s rule and Pauli exclusion principle).',
          'Define isotopes and calculate relative atomic mass from percentage abundances.',
          'Describe ionic bonding (electron transfer), covalent bonding (electron sharing), and metallic bonding (positive ions in a sea of delocalized electrons).',
        ],
        examinerTraps: [
          'Violating Hund\'s rule: pairing electrons in p-orbitals before each degenerate orbital has one electron with parallel spin.',
          'Confusing mass number (integer count of protons + neutrons) with relative atomic mass (weighted average decimal on periodic table).',
          'Using ionic bonding models for covalent molecules like Hâ‚‚O or COâ‚‚.',
        ],
        requiredDefinitions: [
          'Isotope: Atoms of the same element having the same number of protons (same atomic number) but different numbers of neutrons (different mass numbers).',
          'Electronegativity: A measure of the tendency of an atom in a molecule to attract bonding electrons to itself.',
          'Ionic bond: A transfer of electrons and subsequent electrostatic attraction between oppositely charged ions.',
        ],
        cognitiveWeight: { knowledge: 30, routine: 35, complex: 25, problemSolving: 10 },
      },
      {
        term: 3,
        week: 'Weeks 1-5',
        topicName: 'Electricity & Magnetism: Electrostatics & Electric Circuits',
        syllabusRequirements: [
          'Explain the concept of charge: positive and negative; conservation of charge: Q_new = (Qâ‚ + Qâ‚‚) / 2 upon contact of identical spheres.',
          'Quantization of charge: Q = n Â· e, where e = 1.6 Ã— 10â»Â¹â¹ C.',
          'Define potential difference (V = W / Q), current (I = Q / Î”t), and resistance (R = V / I).',
          'Calculate total resistance in series (R_s = Râ‚ + Râ‚‚ + ...) and parallel (1/R_p = 1/Râ‚ + 1/Râ‚‚ + ...).',
        ],
        examinerTraps: [
          'In parallel circuits, forgetting to take the reciprocal after calculating 1/R_p (e.g. writing R_p = 1/3 Î© instead of 3 Î©).',
          'Believing that electric current is "consumed" or decreases as it flows through resistors.',
          'Forgetting that identical conductors share charge equally, but non-identical ones do not.',
        ],
        requiredFormulas: ['Q = n Â· e', 'Q_new = (Qâ‚ + Qâ‚‚) / 2', 'I = Q / Î”t', 'V = W / Q', 'R = V / I', 'R_s = Râ‚ + Râ‚‚', '1/R_p = 1/Râ‚ + 1/Râ‚‚'],
        requiredDefinitions: [
          'Current: The rate of flow of charge (I = Q / Î”t). Measured in Amperes (A).',
          'Potential difference: The work done per unit positive charge to move the charge between two points (V = W / Q). Measured in Volts (V).',
          'Ohm\'s Law: The current through a conductor is directly proportional to the potential difference across it, provided temperature remains constant.',
        ],
        cognitiveWeight: { knowledge: 20, routine: 40, complex: 25, problemSolving: 15 },
      },
      {
        term: 4,
        week: 'Weeks 1-4',
        topicName: 'Chemical Change: Stoichiometry, Mole Concept, Empirical & Molecular Formulae',
        syllabusRequirements: [
          'Define the mole (mol) as the amount of substance containing 6.02 Ã— 10Â²Â³ particles (Avogadro constant N_A).',
          'Calculate molar mass (M) from the periodic table in gÂ·molâ»Â¹.',
          'Apply formulas: n = m / M, n = N / N_A, c = n / V = m / (M Â· V).',
          'Determine empirical and molecular formulas from percentage composition.',
          'Perform stoichiometric calculations based on balanced chemical equations (limiting reactant, theoretical yield, percentage yield).',
        ],
        examinerTraps: [
          'Forgetting to balance the chemical equation before determining molar ratios.',
          'Using volume in cmÂ³ instead of dmÂ³ in concentration calculations: 1 dmÂ³ = 1000 cmÂ³.',
          'Not identifying the limiting reactant and calculating theoretical yield based on an excess reactant.',
        ],
        requiredFormulas: ['n = m / M', 'n = N / N_A', 'c = n / V', 'c = m / (M Â· V)', 'n = V / V_m (at STP: V_m = 22.4 dmÂ³Â·molâ»Â¹)'],
        requiredDefinitions: [
          'Molar mass: The mass in grams of one mole of that substance.',
          'Empirical formula: The simplest whole-number ratio of atoms of each element in a compound.',
          'Concentration: The amount of solute per unit volume of solution.',
        ],
        cognitiveWeight: { knowledge: 20, routine: 35, complex: 30, problemSolving: 15 },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Grade 12 Physical Sciences (Physics Paper 1 & Chemistry Paper 2)
  // ---------------------------------------------------------------------------
  'Grade 12 Physical Sciences': {
    subject: 'Physical Sciences',
    grade: 'Grade 12',
    curriculumCode: 'DBE-CAPS-PHSC-GR12',
    officialPaperStructure: 'Two 3-hour papers of 150 marks each. Paper 1: Physics (Mechanics, Waves/Sound/Light, Electricity & Magnetism, Matter & Materials). Paper 2: Chemistry (Chemical Change, Chemical Systems, Matter & Materials).',
    examinationGuidelines: [
      'In Physics, free-body diagrams must have labeled arrows touching the dot/object. No components (e.g. F_g|| or F_gâŠ¥) unless explicitly asked.',
      'Vector direction MUST be stated in all vector quantities (displacement, velocity, acceleration, force, momentum, electric field).',
      'For vertical projectile motion, state chosen positive direction (+ is UP or + is DOWN) before applying equations of motion.',
      'In Chemistry, IUPAC naming requires exact hyphens, commas, and spelling (e.g. 2,3-dimethylbutane, NOT 2 3 dimethyl butane).',
      'State definitions EXACTLY as worded in the DBE Examination Guidelines. Altering key words forfeits both marks (e.g. "constant temperature" in Ohm\'s Law).',
    ],
    textbookReferences: [
      'Mind the Gap Physical Sciences: Physics & Chemistry (DBE National Curriculum Statement)',
      'Siyavula Everything Science Grade 12 Physical Sciences',
      'Classroom Mathematics / Physical Sciences Grade 12 (Heinemann)',
      'Answer Series 3-in-1 Physical Sciences Grade 12',
    ],
    topics: [
      {
        term: 1,
        week: 'Weeks 1-5',
        topicName: 'Physics: Momentum & Impulse, Newton\'s Second Law in terms of Momentum',
        syllabusRequirements: [
          'Define momentum as the product of an object\'s mass and velocity: p = m Â· v.',
          'State Newton\'s second law of motion in terms of momentum: The net force acting on an object is equal to the rate of change of momentum (F_net = Î”p / Î”t).',
          'Define impulse as the product of net force and the contact time: Impulse = F_net Â· Î”t = Î”p.',
          'State the principle of conservation of linear momentum: The total linear momentum of an isolated system remains constant (is conserved).',
          'Distinguish between elastic collisions (kinetic energy conserved) and inelastic collisions (kinetic energy not conserved).',
        ],
        examinerTraps: [
          'Forgetting signs when calculating Î”p: Î”p = m(v_f - v_i). If an object rebounds, v_f has the opposite sign!',
          'Omitting the word "isolated system" or "closed system" in the definition of conservation of momentum.',
          'Assuming all collisions where objects stick together are the only inelastic collisions.',
        ],
        requiredFormulas: ['p = m Â· v', 'F_net Â· Î”t = Î”p = m(v_f - v_i)', 'Î£p_before = Î£p_after', 'mâ‚vâ‚_i + mâ‚‚vâ‚‚_i = mâ‚vâ‚_f + mâ‚‚vâ‚‚_f'],
        requiredDefinitions: [
          'Impulse: The product of the resultant/net force acting on an object and the time the resultant/net force acts on the object.',
          'Isolated system: A system on which the resultant/net external force is zero.',
        ],
        cognitiveWeight: { knowledge: 15, routine: 35, complex: 35, problemSolving: 15 },
      },
      {
        term: 1,
        week: 'Weeks 6-9',
        topicName: 'Physics: Vertical Projectile Motion in 1D',
        syllabusRequirements: [
          'Explain that projectiles move under the influence of gravity alone (free fall, neglecting air resistance).',
          'Apply equations of motion with constant acceleration g = 9.8 mÂ·sâ»Â² downwards.',
          'Analyze objects dropped, projected upwards, and bouncing off surfaces.',
          'Interpret and sketch position-time (y-t), velocity-time (v-t), and acceleration-time (a-t) graphs.',
        ],
        examinerTraps: [
          'Thinking acceleration at the maximum height is zero. (Velocity is zero, but acceleration remains 9.8 mÂ·sâ»Â² downwards!).',
          'Using inconsistent sign conventions between initial velocity, displacement, and acceleration.',
          'Drawing curved lines on velocity-time graphs instead of straight lines with constant slope -9.8 mÂ·sâ»Â².',
        ],
        requiredFormulas: [
          'v_f = v_i + aÎ”t',
          'Î”y = v_iÎ”t + 0.5a(Î”t)Â²',
          'v_fÂ² = v_iÂ² + 2aÎ”y',
          'Î”y = ((v_i + v_f) / 2)Î”t',
        ],
        requiredDefinitions: [
          'Projectile: An object upon which the only force acting is gravity.',
          'Free fall: Motion during which the only force acting on an object is the gravitational force.',
        ],
        cognitiveWeight: { knowledge: 15, routine: 30, complex: 40, problemSolving: 15 },
      },
      {
        term: 2,
        week: 'Weeks 1-5',
        topicName: 'Chemistry: Organic Chemistry (Nomenclature, Isomerism, Physical Properties, Reactions)',
        syllabusRequirements: [
          'Identify functional groups for alkanes, alkenes, alkynes, haloalkanes, alcohols, aldehydes, ketones, carboxylic acids, and esters.',
          'Apply IUPAC naming rules up to 8 carbon atoms in the main chain.',
          'Distinguish structural isomers: chain, positional, and functional isomers.',
          'Explain trends in physical properties (boiling point, vapor pressure, melting point) in terms of intermolecular forces (London forces, dipole-dipole, hydrogen bonding).',
          'Explain organic reactions: combustion, substitution, addition, elimination (dehydrohalogenation, dehydration), and esterification.',
        ],
        examinerTraps: [
          'Misidentifying aldehydes vs ketones: aldehyde carbonyl is at terminal C (end), ketone is non-terminal (internal C).',
          'In physical property questions: stating "bonds between molecules break" instead of "intermolecular forces are overcome". Breaking covalent bonds is incorrect!',
          'Forgetting that higher vapor pressure corresponds to LOWER boiling point and WEAKER intermolecular forces.',
        ],
        requiredFormulas: ['General formula alkanes: C_n H_{2n+2}', 'alkenes: C_n H_{2n}', 'alkynes: C_n H_{2n-2}', 'alcohols: C_n H_{2n+1}OH', 'carboxylic acids: C_n H_{2n}Oâ‚‚'],
        requiredDefinitions: [
          'Hydrocarbon: Organic compounds that consist of hydrogen and carbon only.',
          'Homologous series: A series of organic compounds that can be described by the same general formula and where each member differs from the next by a -CHâ‚‚- group.',
          'Structural isomer: Organic molecules that have the same molecular formula, but different structural formulae.',
        ],
        cognitiveWeight: { knowledge: 25, routine: 35, complex: 25, problemSolving: 15 },
      },
      {
        term: 2,
        week: 'Weeks 6-9',
        topicName: 'Physics: Work, Energy & Power & Doppler Effect',
        syllabusRequirements: [
          'Define work done by a constant force: W = F Â· Î”x Â· cos(Î¸).',
          'State the work-energy theorem: The net work done on an object is equal to the change in the object\'s kinetic energy (W_net = Î”K = K_f - K_i).',
          'Define conservative and non-conservative forces; apply W_nc = Î”E_k + Î”E_p.',
          'Define power as the rate at which work is done: P = W / Î”t = F Â· v_avg.',
          'Doppler Effect: explain shift in observed frequency when source or observer is in motion: f_L = ((v Â± v_L) / (v âˆ“ v_s)) Â· f_s.',
          'State applications of Doppler effect: Doppler flow meter, red shift in astrophysics supporting expanding universe.',
        ],
        examinerTraps: [
          'Using the wrong angle Î¸ in W = FÎ”x cos(Î¸). Î¸ is the angle BETWEEN the direction of the force and the displacement vector!',
          'In Doppler effect: choosing incorrect signs in numerator or denominator. Remember: if approaching, frequency MUST increase (use + on top or - on bottom).',
          'Confusing conservative force (gravity) with non-conservative force (friction, tension, applied force).',
        ],
        requiredFormulas: [
          'W = F Â· Î”x Â· cos(Î¸)',
          'W_net = Î”E_k',
          'W_nc = Î”E_k + Î”E_p',
          'P = W / Î”t = F Â· v',
          'f_L = ((v Â± v_L) / (v âˆ“ v_s)) Â· f_s',
        ],
        requiredDefinitions: [
          'Work-energy theorem: The work done on an object by a net force is equal to the change in the object\'s kinetic energy.',
          'Conservative force: A force for which the work done in moving an object between two points is independent of the path taken.',
          'Doppler effect: The apparent change in frequency (or pitch) of a wave observed when the source and the observer are moving relative to each other.',
        ],
        cognitiveWeight: { knowledge: 20, routine: 35, complex: 30, problemSolving: 15 },
      },
      {
        term: 3,
        week: 'Weeks 1-4',
        topicName: 'Chemistry: Chemical Equilibrium (Le Chatelier\'s Principle & Equilibrium Constant Kc)',
        syllabusRequirements: [
          'Explain dynamic chemical equilibrium in a closed system: forward and reverse reaction rates are equal, concentrations remain constant.',
          'Write equilibrium constant (K_c) expressions: K_c = [products]^coefficients / [reactants]^coefficients (solids and pure liquids omitted).',
          'Apply Le Chatelier\'s principle to predict shifts due to temperature, concentration, and pressure changes.',
          'Explain effect of catalysts: increases rate of both forward and reverse reactions equally; does NOT change equilibrium position or K_c.',
        ],
        examinerTraps: [
          'Writing pure liquids (l) or solids (s) into the K_c expression. Only gases (g) and aqueous solutions (aq) are included.',
          'Stating that a catalyst changes the yield of products. A catalyst only speeds up reaching equilibrium, it does not alter K_c.',
          'Temperature is the ONLY factor that changes the numerical value of K_c. Concentration and pressure do NOT change K_c.',
        ],
        requiredFormulas: ['K_c = [C]^c [D]^d / ([A]^a [B]^b) for aA + bB â‡Œ cC + dD'],
        requiredDefinitions: [
          'Chemical equilibrium: A dynamic state in which the rate of the forward reaction equals the rate of the reverse reaction.',
          'Le Chatelier\'s principle: When the equilibrium in a closed system is disturbed, the system will reinstate a new equilibrium by favoring the reaction that opposes the disturbance.',
        ],
        cognitiveWeight: { knowledge: 20, routine: 30, complex: 35, problemSolving: 15 },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Grade 12 Pure Mathematics (Paper 1 & Paper 2)
  // ---------------------------------------------------------------------------
  'Grade 12 Mathematics': {
    subject: 'Mathematics',
    grade: 'Grade 12',
    curriculumCode: 'DBE-CAPS-MATH-GR12',
    officialPaperStructure: 'Two 3-hour papers of 150 marks each. Paper 1: Algebra & Equations, Patterns & Sequences, Functions & Graphs, Calculus, Financial Mathematics, Probability. Paper 2: Statistics, Analytical Geometry, Trigonometry, Euclidean Geometry.',
    examinationGuidelines: [
      'Show ALL intermediate calculations. A correct answer with no working receives zero marks in DBE NSC marking.',
      'In Euclidean Geometry, every geometrical statement MUST be accompanied by the approved DBE reason (e.g. "tan chord theorem", "opp âˆ s cyclic quad", "radii").',
      'In Trigonometry, check for extraneous roots when squaring equations or dividing by trigonometric ratios (division by zero trap).',
      'Calculus: first principles differentiation formula f\'(x) = lim_{h->0} [f(x+h) - f(x)] / h must be written explicitly with lim_{h->0} on every line until substitution of h = 0.',
      'Round off final answers to TWO decimal places unless instructed otherwise.',
    ],
    textbookReferences: [
      'Mind the Gap Mathematics Study Guide Grade 12 (DBE)',
      'Classroom Mathematics Grade 12 (Heinemann)',
      'Siyavula Everything Maths Grade 12',
      'Platinum Mathematics Grade 12 (Maskew Miller Longman)',
    ],
    topics: [
      {
        term: 1,
        week: 'Weeks 1-3',
        topicName: 'Paper 1: Number Patterns, Sequences and Series',
        syllabusRequirements: [
          'Arithmetic sequence: T_n = a + (n-1)d; Sum: S_n = n/2[2a + (n-1)d] = n/2[a + l].',
          'Geometric sequence: T_n = a Â· r^{n-1}; Sum: S_n = a(r^n - 1)/(r - 1) for r â‰  1.',
          'Sum to infinity of convergent geometric series: S_âˆž = a / (1 - r), condition for convergence: -1 < r < 1.',
          'Quadratic sequences: constant second difference (2a = 2nd difference, 3a + b = Tâ‚‚ - Tâ‚, a + b + c = Tâ‚).',
          'Sigma notation: evaluate finite and infinite series.',
        ],
        examinerTraps: [
          'Calculating sum to infinity when |r| â‰¥ 1. The series diverges and S_âˆž does not exist.',
          'In quadratic sequences, forgetting that 2a is equal to the SECOND difference, not the first difference.',
          'Counting the number of terms in sigma notation: top index - bottom index + 1 (e.g. Î£_{k=3}^{10} has 10 - 3 + 1 = 8 terms, not 7!).',
        ],
        requiredFormulas: [
          'T_n = a + (n - 1)d',
          'S_n = (n / 2)[2a + (n - 1)d]',
          'T_n = a Â· r^{n - 1}',
          'S_n = a(r^n - 1) / (r - 1)',
          'S_\\infty = a / (1 - r) \\quad (-1 < r < 1)',
          'T_n = an^2 + bn + c',
        ],
        cognitiveWeight: { knowledge: 20, routine: 35, complex: 30, problemSolving: 15 },
      },
      {
        term: 1,
        week: 'Weeks 4-7',
        topicName: 'Paper 1: Functions, Inverses & Graphs (Parabola, Hyperbola, Exponential, Logarithmic)',
        syllabusRequirements: [
          'Define a function as a relation where each x-value has exactly one y-value (vertical line test).',
          'Find inverse functions (fâ»Â¹) by swapping x and y and making y the subject.',
          'Restricting the domain of a parabola f(x) = axÂ² to x â‰¥ 0 or x â‰¤ 0 so that its inverse fâ»Â¹ is also a function.',
          'Sketch functions showing intercepts with axes, turning points, and asymptotes (horizontal & vertical).',
        ],
        examinerTraps: [
          'When finding the inverse of a parabola y = xÂ², writing y = âˆšx without restricting the domain or writing y = Â±âˆšx which is NOT a function.',
          'Confusing the inverse fâ»Â¹(x) with the reciprocal 1/f(x).',
          'Misidentifying the vertical asymptote of a hyperbola y = a/(x + p) + q as x = p instead of x = -p.',
        ],
        requiredFormulas: [
          'y = a(x - p)^2 + q',
          'y = a / (x + p) + q',
          'y = a \\cdot b^{x + p} + q',
          'y = \\log_b(x)',
        ],
        cognitiveWeight: { knowledge: 15, routine: 35, complex: 35, problemSolving: 15 },
      },
      {
        term: 2,
        week: 'Weeks 1-5',
        topicName: 'Paper 1: Differential Calculus (Limits, First Principles, Rules, Cubic Graphs, Optimization)',
        syllabusRequirements: [
          'Differentiate from first principles: f\'(x) = lim_{h->0} [f(x+h) - f(x)] / h.',
          'Apply rules of differentiation: d/dx[x^n] = nÂ·x^{n-1}; prepare terms by removing fractions and surds before differentiating.',
          'Find equations of tangents to curves at a given point: m = f\'(xâ‚), y - yâ‚ = m(x - xâ‚).',
          'Sketch cubic graphs f(x) = axÂ³ + bxÂ² + cx + d: find x-intercepts, y-intercept, stationary points (f\'(x) = 0), and point of inflection (f\'\'(x) = 0).',
          'Solve practical calculus optimization problems (maximum volume, minimum cost, rate of change).',
        ],
        examinerTraps: [
          'Dropping the "lim_{h->0}" notation prematurely before substituting h = 0 in first principles questions (penalized 1 mark every line in NSC exams).',
          'Differentiating before preparing expressions: e.g. trying to differentiate 3/xÂ² without first rewriting it as 3xâ»Â².',
          'Confusing the stationary point coordinates (x, y) with the derivative value (f\'(x) = 0).',
        ],
        requiredFormulas: [
          'f\'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}',
          '\\frac{d}{dx}[x^n] = n x^{n - 1}',
          'm_{tan} = f\'(x)',
          'f\'\'(x) = 0 \\quad \\text{(Point of Inflection)}',
        ],
        cognitiveWeight: { knowledge: 15, routine: 35, complex: 35, problemSolving: 15 },
      },
      {
        term: 3,
        week: 'Weeks 1-4',
        topicName: 'Paper 2: Euclidean Geometry (Circle Geometry & Proportionality / Similarity Theorems)',
        syllabusRequirements: [
          'Circle Theorems: line from centre perpendicular to chord bisects chord; angle at centre = 2 Ã— angle at circumference; angle in semi-circle = 90Â°; angles in same segment equal; opposite angles of cyclic quad supplementary (sum to 180Â°); tangent perpendicular to radius; tangents from same point equal in length; tan-chord theorem.',
          'Proportionality theorem: line parallel to one side of triangle divides other two sides proportionally.',
          'Similarity theorem: equiangular triangles are similar (corresponding sides proportional).',
          'Pythagoras theorem extension and ratio proofs.',
        ],
        examinerTraps: [
          'Failing to provide approved DBE reasons for every single geometrical statement. Statements without reasons get 0 marks!',
          'Assuming lines are parallel or points are cyclic quads without proving it first.',
          'Using "tan chord theorem" when the line is not explicitly given or proven to be a tangent.',
        ],
        requiredFormulas: [
          '\\text{Reasons: } [\\text{line from centre } \\perp \\text{ chord}], [\\angle \\text{ at centre } = 2 \\times \\angle \\text{ at circumf}], [\\angle \\text{ in semi circle}], [\\text{opp } \\angle\\text{s cyclic quad}], [\\text{tan chord theorem}], [\\text{prop theorem: line } \\parallel \\text{ to side of } \\Delta], [\\Delta \\text{s are similar } (\\angle \\angle \\angle)]',
        ],
        cognitiveWeight: { knowledge: 15, routine: 25, complex: 40, problemSolving: 20 },
      },
    ],
  },
};

/**
 * Selectively retrieves only the exact CAPS curriculum documents, ATP planner,
 * examination guidelines, formula requirements, and examiner traps needed
 * for the student's active subject, grade, and question topic.
 *
 * SAFETY: never substitutes a different subject or grade. Previously any
 * unsupported subject (e.g. Business Studies) fell back to the Grade 12
 * Mathematics planner, which injected Maths content into unrelated lessons
 * and actively steered the tutor off the locked topic.
 */
import { searchCapsVault } from './serverPdfIngestion';

const CAPS_SUBJECT_ALIASES: Record<string, string> = {
  mathematics: 'Mathematics',
  maths: 'Mathematics',
  math: 'Mathematics',
  wiskunde: 'Mathematics',
  'physical sciences': 'Physical Sciences',
  'physical science': 'Physical Sciences',
  physics: 'Physical Sciences',
  chemistry: 'Physical Sciences',
};

const capsContextMemo = new Map<string, string>();

function normaliseSubject(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveCapsPlanner(subject: string, grade: string): CapsSubjectPlanner | null {
  const normGrade = String(grade || '').trim().toLowerCase();
  const normSubject = normaliseSubject(subject);
  if (!normSubject) return null;

  // 1. Exact grade + subject planner.
  const exact = Object.entries(CAPS_CURRICULUM_DATABASE).find(
    ([key]) => key.toLowerCase() === `${normGrade} ${normSubject}`.toLowerCase(),
  );
  if (exact) return exact[1];

  // 2. Same grade + an explicitly known subject alias (no fuzzy cross-subject
  //    matching â€” "Life Sciences" must never resolve to "Physical Sciences").
  const canonical = CAPS_SUBJECT_ALIASES[normSubject];
  if (!canonical) return null;

  const aliasMatch = Object.entries(CAPS_CURRICULUM_DATABASE).find(
    ([key, planner]) =>
      key.toLowerCase() === `${normGrade} ${canonical}`.toLowerCase() ||
      (planner.grade || '').toLowerCase() === normGrade &&
        normaliseSubject(planner.subject) === normaliseSubject(canonical),
  );
  return aliasMatch ? aliasMatch[1] : null;
}

function topicTerms(value: string): string[] {
  return normaliseSubject(value)
    .split(' ')
    .filter((term) => term.length > 2);
}

function topicMatches(topicName: string, terms: string[]): number {
  const haystack = normaliseSubject(topicName);
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += 1;
    else if (term.length >= 5 && haystack.includes(term.slice(0, 4))) score += 0.5;
  }
  return score;
}

export function getSelectiveCapsCurriculumContext(
  subject: string,
  grade: string,
  queryOrTopic?: string
): string {
  const normSubject = String(subject || 'Mathematics').trim() || 'Mathematics';
  const normGrade = String(grade || 'Grade 12').trim() || 'Grade 12';
  const memoKey = `${normGrade}|${normaliseSubject(normSubject)}|${normaliseSubject(
    String(queryOrTopic || ''),
  )}`;

  const memoHit = capsContextMemo.get(memoKey);
  if (memoHit) return memoHit;

  try {
    const planner = resolveCapsPlanner(normSubject, normGrade);

    if (!planner) {
      const lines = [
        `=== RAW DBE CAPS CURRICULUM VAULT: NO INDEXED PLANNER AVAILABLE ===`,
        `No machine-readable CAPS ATP planner exists for ${normGrade} ${normSubject}.`,
        `- Do NOT substitute content, codes, paper structures or examiner requirements from another subject or grade (for example, never import Mathematics CAPS content into ${normSubject}).`,
        `- Stay strictly on the learner's locked topic and the official CAPS scope for ${normGrade} ${normSubject}.`,
        `- If exact CAPS wording is unknown, say so and teach only what the locked topic and uploaded source support.`,
      ];

      // Even without a structured planner, the vault can still ground the
      // lesson in the correct official document's chapters / digest.
      const vaultMatches = searchCapsVault(`${normSubject} ${normGrade} ${queryOrTopic || ''}`, 2, { subject: normSubject, grade: normGrade });
      if (vaultMatches.length > 0) {
        lines.push('', 'CAPS VAULT DOCUMENT REFERENCES (IN-APP SOURCES):');
        vaultMatches.forEach((match: any, index: number) => {
          const chapters = (match.chapters || [])
            .slice(0, 6)
            .map((chapter: any) => chapter.title)
            .join(' | ');
          lines.push(`- ${match.file} (${match.subject || ''} ${match.grade || ''})`);
          if (chapters) lines.push(`  Matched chapters: ${chapters}`);
          if (index === 0 && match.preview) {
            lines.push(`  CAPS document extract: ${String(match.preview).slice(0, 500)}`);
          }
        });
      }

      lines.push(`=== END OF CAPS CURRICULUM INJECTION ===`);
      const noPlanner = lines.join('\n');
      capsContextMemo.set(memoKey, noPlanner);
      return noPlanner;
    }

    // Rank topics against the locked topic / question. Only matched topics are
    // injected; when there is no query (exam generation) keep a wider ATP
    // overview so papers can cover the year, still bounded for prompt cost.
    const terms = topicTerms(String(queryOrTopic || ''));
    const ranked = planner.topics
      .map((topic) => ({ topic, score: terms.length ? topicMatches(topic.topicName, terms) : 0 }))
      .sort((a, b) => b.score - a.score);

    const matched = ranked.filter((entry) => entry.score > 0);
    const topicLimit = terms.length === 0 ? 8 : 3;
    const selectedTopics = (matched.length > 0 ? matched : ranked)
      .slice(0, topicLimit)
      .map((e) => e.topic);

    const buffer: string[] = [
      `=== RAW DBE CAPS CURRICULUM VAULT: SELECTIVE CURRICULUM INJECTION ===`,
      `Official DBE Curriculum: ${planner.subject} (${planner.grade})`,
      `CAPS Code: ${planner.curriculumCode}`,
      `Official Examination Structure: ${planner.officialPaperStructure}`,
      ``,
      `DBE EXAMINATION GUIDELINES & MARKING PRINCIPLES:`,
      ...planner.examinationGuidelines.map((eg) => `â€¢ ${eg}`),
      ``,
      `DBE APPROVED TEXTBOOK REFERENCES:`,
      ...planner.textbookReferences.map((tb) => `â€¢ ${tb}`),
      ``,
      `ACTIVE ANNUAL TEACHING PLAN (ATP) TOPICS & CHIEF EXAMINER WARNINGS:`,
    ];

    selectedTopics.forEach((t) => {
      buffer.push(`--- Term ${t.term} (${t.week}): ${t.topicName} ---`);
      buffer.push(`  Syllabus Core Competencies:`);
      t.syllabusRequirements.forEach((req) => buffer.push(`    - ${req}`));

      if (t.requiredDefinitions && t.requiredDefinitions.length > 0) {
        buffer.push(`  Verbatim DBE Definitions Required for Full Marks:`);
        t.requiredDefinitions.forEach((def) => buffer.push(`    * ${def}`));
      }

      if (t.requiredFormulas && t.requiredFormulas.length > 0) {
        buffer.push(`  Official DBE Formula Sheet References:`);
        t.requiredFormulas.forEach((f) => buffer.push(`    * ${f}`));
      }

      buffer.push(`  Official Chief Examiner Trap Alerts (Common Learner Errors):`);
      t.examinerTraps.forEach((trap) => buffer.push(`    ! TRAP: ${trap}`));
      buffer.push(``);
    });

    // CAPS vault document references (matched chapters + a short digest).
    const pdfMatches = searchCapsVault(`${normSubject} ${normGrade} ${queryOrTopic || ''}`, 2, { subject: normSubject, grade: normGrade });
    if (pdfMatches.length > 0) {
      buffer.push(`CAPS VAULT DOCUMENT REFERENCES (IN-APP SOURCES):`);
      pdfMatches.forEach((match: any, index: number) => {
        const chapters = (match.chapters || [])
          .slice(0, 6)
          .map((chapter: any) => chapter.title)
          .join(' | ');
        buffer.push(`- ${match.file} (${match.subject || ''} ${match.grade || ''})`);
        if (chapters) buffer.push(`  Matched chapters: ${chapters}`);
        // Inject a short digest only for the best match to keep prompt cost low.
        if (index === 0 && match.preview) {
          buffer.push(`  CAPS document extract: ${String(match.preview).slice(0, 500)}`);
        }
      });
      buffer.push(``);
    }

    buffer.push(`=== END OF SELECTIVE CAPS CURRICULUM INJECTION ===`);
    const built = buffer.join('\n');

    // Bound the memo so a long-lived process cannot grow without limit.
    if (capsContextMemo.size > 250) capsContextMemo.clear();
    capsContextMemo.set(memoKey, built);
    return built;
  } catch (err: any) {
    console.warn('CAPS curriculum context failed (neutral fallback):', err?.message || err);
    return [
      `=== RAW DBE CAPS CURRICULUM VAULT: UNAVAILABLE ===`,
      `Curriculum retrieval failed for ${normGrade} ${normSubject}.`,
      `- Do NOT invent CAPS codes, paper structures or examiner requirements.`,
      `- Teach strictly from the learner's locked topic and uploaded source.`,
      `=== END OF CAPS CURRICULUM INJECTION ===`,
    ].join('\n');
  }
}


