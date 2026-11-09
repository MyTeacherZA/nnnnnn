import * as Astronomy from 'astronomy-engine';
import { CountryCode } from '../types';

/**
 * ============================================================================
 * THE FIRMAMENT FRAMEWORK — PSYCHOMETRIC ENGINE
 * ============================================================================
 * 8 cognitive dimensions x 3 forced-choice ("this vs that") items = 24 items.
 *
 * Every learner sees ONLY the 24 items for their own grade (Grades 3–12), so
 * the language and scenarios match their developmental stage. Dimension
 * names are internal only — they are never rendered in the UI.
 *
 * Binary poles give a decisive 3/0 or 2/1 majority on every dimension, so the
 * vector can never tie.
 */

export type DimensionKey =
  | 'structure'
  | 'tempo'
  | 'load'
  | 'pathway'
  | 'efficacy'
  | 'egoThreat'
  | 'presentation'
  | 'helplessness';

export const DIMENSION_ORDER: DimensionKey[] = [
  'structure',
  'tempo',
  'load',
  'pathway',
  'efficacy',
  'egoThreat',
  'presentation',
  'helplessness',
];

export type MercuryElement = 'Fire' | 'Earth' | 'Air' | 'Water';
export type PrimaryModality = 'Visual' | 'Auditory' | 'Kinesthetic' | 'Logical-Rule';

/** A single forced-choice item. `id` is 1–24 within each grade set. */
export interface ForcedChoiceQuestion {
  id: number;
  /** INTERNAL ONLY — never rendered to the learner. */
  dimension: DimensionKey;
  /** Pole A statement (scores +1). */
  this: string;
  /** Pole B statement (scores -1). */
  that: string;
}

export type AnswerValue = 'this' | 'that';
export type AnswerMap = Record<number, AnswerValue>;

/** Grade keys supported by the bank. */
export const SUPPORTED_GRADES = [
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
] as const;

export type SupportedGrade = (typeof SUPPORTED_GRADES)[number];

const q = (
  id: number,
  dimension: DimensionKey,
  thisText: string,
  thatText: string
): ForcedChoiceQuestion => ({ id, dimension, this: thisText, that: thatText });

// ---------------------------------------------------------------------------
// QUESTION BANK — 24 items per grade (3 per dimension, in DIMENSION_ORDER)
// ---------------------------------------------------------------------------

export const PSYCHOMETRIC_QUESTION_BANK: Record<SupportedGrade, ForcedChoiceQuestion[]> = {
  'Grade 3': [
    q(1, 'structure', 'I like to try a new topic on my own before the teacher explains it.', 'I like to see a worked example before I try a new topic.'),
    q(2, 'structure', 'When a question is tricky, I try my own plan first.', 'When a question is tricky, I look for a similar example to copy the steps.'),
    q(3, 'structure', 'I check my own answers my own way.', 'I wait for the teacher to check my answers.'),
    q(4, 'tempo', 'I answer quickly and fix mistakes later.', 'I work slowly so I make fewer mistakes.'),
    q(5, 'tempo', 'I like racing to finish first.', 'I like having as much time as I need.'),
    q(6, 'tempo', 'If I am not sure, I pick an answer and move on.', 'If I am not sure, I stop and think for a while.'),
    q(7, 'load', 'I can follow several instructions at once.', 'I do better with one instruction at a time.'),
    q(8, 'load', 'I can work on one task for a long time.', 'I like short tasks with breaks.'),
    q(9, 'load', 'I can keep a few numbers in my head while I work.', 'I write numbers down so I do not lose them.'),
    q(10, 'pathway', 'Pictures, charts and diagrams help me understand.', 'Listening to an explanation helps me understand.'),
    q(11, 'pathway', 'I learn best by building, moving or touching things.', 'I learn best by reading and listening.'),
    q(12, 'pathway', 'I draw or doodle when I am thinking.', 'I talk out loud when I am thinking.'),
    q(13, 'efficacy', 'When I do not understand, I ask straight away.', 'When I do not understand, I wait and hope it becomes clear.'),
    q(14, 'efficacy', 'I believe I can learn difficult things if I try.', 'I believe some things are just too difficult for me.'),
    q(15, 'efficacy', 'I keep trying after a wrong answer.', 'I feel like stopping after a wrong answer.'),
    q(16, 'egoThreat', 'I am comfortable making a mistake in front of others.', 'I feel embarrassed when others see my mistakes.'),
    q(17, 'egoThreat', 'I ask questions even if someone might laugh.', 'I keep quiet so nobody laughs at me.'),
    q(18, 'egoThreat', 'I see mistakes as a normal part of learning.', 'Mistakes make me feel like I am not clever.'),
    q(19, 'presentation', 'I say "I do not understand" when I am confused.', 'I pretend to understand when I am confused.'),
    q(20, 'presentation', 'I show my work even when it is messy.', 'I hide my work when I think it is wrong.'),
    q(21, 'presentation', 'When I am stuck I ask for help calmly.', 'When I am stuck I act like I do not care.'),
    q(22, 'helplessness', 'After failing once, I try again.', 'After failing once I feel I cannot do it.'),
    q(23, 'helplessness', 'I believe practice makes me better.', 'I believe I am just not good at some subjects.'),
    q(24, 'helplessness', 'I keep going when the work gets hard.', 'I give up when the work gets hard.'),
  ],

  'Grade 4': [
    q(1, 'structure', "When we start a new topic, I like to experiment with it before the teacher explains.", "When we start a new topic, I like the teacher to show the steps first."),
    q(2, 'structure', "If a maths problem is confusing, I try drawing it my own way.", "If a maths problem is confusing, I look for the example in the textbook."),
    q(3, 'structure', "I check my answers by redoing them my own way.", "I ask the teacher to check my answers."),
    q(4, 'tempo', "I finish my work quickly and go back to fix it.", "I take my time so my work is neat and correct."),
    q(5, 'tempo', "I like spelling bees and timed quizzes.", "I like quizzes where I can take my time."),
    q(6, 'tempo', "If I am stuck, I choose an answer and keep going.", "If I am stuck, I sit and think until I am sure."),
    q(7, 'load', "I can remember all the steps of a science experiment.", "I like the steps written on the board."),
    q(8, 'load', "I can read for a long time without getting tired.", "I read better in short sessions."),
    q(9, 'load', "I can do sums in my head without writing them down.", "I need to write sums down to keep track."),
    q(10, 'pathway', "I understand science better when we do experiments.", "I understand science better when we read about it."),
    q(11, 'pathway', "I remember things better when I can see a video or picture.", "I remember things better when I hear them."),
    q(12, 'pathway', "I use my hands or move around when I am thinking.", "I sit still and talk through my thinking."),
    q(13, 'efficacy', "If I do not understand the homework, I ask someone.", "If I do not understand the homework, I leave it."),
    q(14, 'efficacy', "I think I can get better at maths by practising.", "I think some kids are just born good at maths."),
    q(15, 'efficacy', "When I get a sum wrong, I try another way.", "When I get a sum wrong, I want to give up."),
    q(16, 'egoThreat', "I do not mind if my friends see me get a sum wrong.", "I feel silly when my friends see me get a sum wrong."),
    q(17, 'egoThreat', "I put my hand up even if my answer might be wrong.", "I keep my hand down so I do not get it wrong."),
    q(18, 'egoThreat', "Getting it wrong helps me learn.", "Getting it wrong means I am not good at it."),
    q(19, 'presentation', "I tell the teacher when I am confused.", "I pretend I understand so I do not look silly."),
    q(20, 'presentation', "I let others see my rough work.", "I hide my rough work."),
    q(21, 'presentation', "I ask for help when I am stuck.", "I act busy so nobody notices I am stuck."),
    q(22, 'helplessness', "If I fail a test, I study harder next time.", "If I fail a test, I think I will never get it."),
    q(23, 'helplessness', "I think practice changes how good I am.", "I think how good I am stays the same."),
    q(24, 'helplessness', "I finish hard homework even when I do not feel like it.", "I stop hard homework when it gets boring."),
  ],

  'Grade 5': [
    q(1, 'structure', 'I like to explore a new topic on my own before the lesson.', 'I prefer the teacher to demonstrate the method first.'),
    q(2, 'structure', 'When I get stuck, I try to rebuild the idea from the basics.', 'When I get stuck, I look for a template or example to follow.'),
    q(3, 'structure', 'I like to test my own understanding before asking for help.', 'I like an adult to confirm that my answer is correct.'),
    q(4, 'tempo', 'I move fast through questions and review them afterwards.', 'I work at a careful pace and check each step as I go.'),
    q(5, 'tempo', 'I enjoy the pressure of finishing under a timer.', 'I do my best work without a timer.'),
    q(6, 'tempo', 'If a question is hard, I make my best guess and come back later.', 'If a question is hard, I stay on it until I am certain.'),
    q(7, 'load', 'I can juggle several steps of a problem in my head.', 'I prefer problems broken into small, separate steps.'),
    q(8, 'load', 'I can concentrate on one subject for a long stretch.', 'I focus better in short bursts with breaks.'),
    q(9, 'load', 'I keep track of information without writing everything down.', 'I need to write things down to keep track.'),
    q(10, 'pathway', 'Colour-coded diagrams and mind maps make ideas click.', 'A clear spoken explanation makes ideas click.'),
    q(11, 'pathway', 'I understand ideas best through hands-on activities.', 'I understand ideas best through reading and discussing.'),
    q(12, 'pathway', 'I sketch or visualise a problem before solving it.', 'I repeat the rule or definition out loud before solving it.'),
    q(13, 'efficacy', 'When a topic confuses me, I ask a question immediately.', 'When a topic confuses me, I stay quiet and try to catch up.'),
    q(14, 'efficacy', 'I expect to improve when I practise something difficult.', 'I expect some subjects to stay difficult for me.'),
    q(15, 'efficacy', 'A wrong answer makes me want to try a new approach.', 'A wrong answer makes me want to stop for the day.'),
    q(16, 'egoThreat', 'I am fine with classmates seeing me correct a mistake.', 'I worry that classmates will judge my mistakes.'),
    q(17, 'egoThreat', 'I put my hand up even when I am unsure.', 'I avoid putting my hand up in case I am wrong.'),
    q(18, 'egoThreat', 'Getting something wrong helps me see what to fix.', 'Getting something wrong makes me doubt my ability.'),
    q(19, 'presentation', 'I admit when I have lost track of the explanation.', 'I nod along even when I have lost track.'),
    q(20, 'presentation', 'I hand in work that shows my real thinking.', 'I hide parts of my work that might be wrong.'),
    q(21, 'presentation', 'When I am overwhelmed I say so clearly.', 'When I am overwhelmed I change the subject or go quiet.'),
    q(22, 'helplessness', 'A bad result makes me plan a different strategy.', 'A bad result makes me feel that effort does not help.'),
    q(23, 'helplessness', 'I believe ability grows with practice.', 'I believe ability is mostly fixed from the start.'),
    q(24, 'helplessness', 'I push through the difficult part of a task.', 'I leave the difficult part of a task unfinished.'),
  ],

  'Grade 6': [
    q(1, 'structure', 'I like to figure out the rules of a new topic myself.', 'I prefer the teacher to give me the rules and steps.'),
    q(2, 'structure', 'When a problem is unfamiliar, I break it down independently.', 'When a problem is unfamiliar, I look for a familiar example to mirror.'),
    q(3, 'structure', 'I trust my own method if I can justify it.', 'I prefer the teacher to approve my method before I use it.'),
    q(4, 'tempo', 'I prefer to work quickly and refine my answers later.', 'I prefer to work carefully and get it right the first time.'),
    q(5, 'tempo', 'I enjoy competing against the clock in class.', 'I find time limits distracting.'),
    q(6, 'tempo', 'I make a quick decision and adjust if it is wrong.', 'I pause and weigh every option before answering.'),
    q(7, 'load', 'I can hold a multi-step method in my head while working.', 'I need each step written down before I continue.'),
    q(8, 'load', 'I can study one subject for a full hour without a break.', 'I study best in short, frequent sessions.'),
    q(9, 'load', 'I remember instructions without writing them down.', 'I rely on a checklist to remember instructions.'),
    q(10, 'pathway', 'I understand best from diagrams, tables and visual summaries.', 'I understand best from spoken explanations and discussion.'),
    q(11, 'pathway', 'I learn by doing, experimenting and manipulating materials.', 'I learn by reading, note-taking and listening.'),
    q(12, 'pathway', 'I convert ideas into pictures or mental images.', 'I convert ideas into words and verbal explanations.'),
    q(13, 'efficacy', 'I ask for clarification as soon as I lose the thread.', 'I wait until the end before admitting I am lost.'),
    q(14, 'efficacy', 'I believe I can master a hard subject with effort.', 'I believe some subjects are beyond my reach.'),
    q(15, 'efficacy', 'I treat a wrong answer as information to use.', 'I treat a wrong answer as proof I cannot do it.'),
    q(16, 'egoThreat', 'I am comfortable being corrected in front of the class.', 'Being corrected in front of the class embarrasses me.'),
    q(17, 'egoThreat', 'I ask questions even when others seem to understand.', 'I avoid asking questions when others seem to understand.'),
    q(18, 'egoThreat', 'Mistakes are part of how learning works.', 'Mistakes make me feel exposed.'),
    q(19, 'presentation', 'I tell the teacher exactly where I got stuck.', 'I give vague answers so the teacher cannot see where I am weak.'),
    q(20, 'presentation', 'I show drafts even if they are unfinished.', 'I only show work I am confident is correct.'),
    q(21, 'presentation', 'I ask for help before frustration builds up.', 'I wait until I am completely frustrated before asking for help.'),
    q(22, 'helplessness', 'A disappointing result makes me adjust my study plan.', 'A disappointing result makes me feel studying is pointless.'),
    q(23, 'helplessness', 'I believe skill is built through repeated practice.', 'I believe talent decides results more than practice.'),
    q(24, 'helplessness', 'I keep working when a task stops being fun.', 'I lose motivation when a task stops being fun.'),
  ],

  'Grade 7': [
    q(1, 'structure', 'I like to construct my own understanding of a new concept first.', 'I prefer the teacher to provide a complete framework to follow.'),
    q(2, 'structure', 'When I am stuck, I strip the problem back to first principles.', 'When I am stuck, I search for a similar worked example.'),
    q(3, 'structure', 'I trust a method once I can prove it works.', 'I trust a method once the teacher confirms it is correct.'),
    q(4, 'tempo', 'I like to attempt questions fast and iterate on mistakes.', 'I like to solve each question fully before moving on.'),
    q(5, 'tempo', 'I perform well when there is time pressure.', 'I perform best with generous time.'),
    q(6, 'tempo', 'I commit to an approach quickly and correct course.', 'I deliberate until I am sure before committing.'),
    q(7, 'load', 'I can track several variables in my head during a problem.', 'I need to externalise each variable on paper.'),
    q(8, 'load', 'I can sustain deep focus for long study blocks.', 'I need frequent short breaks to stay focused.'),
    q(9, 'load', 'I retain a long list of instructions without notes.', 'I depend on written steps to keep track.'),
    q(10, 'pathway', 'I grasp concepts fastest through visual models and tables.', 'I grasp concepts fastest through verbal explanation.'),
    q(11, 'pathway', 'I learn best by applying ideas in practical tasks.', 'I learn best by reading and summarising notes.'),
    q(12, 'pathway', 'I think in images, spaces and patterns.', 'I think in sentences, definitions and arguments.'),
    q(13, 'efficacy', 'I flag confusion immediately so it can be fixed.', 'I keep confusion private and try to solve it alone.'),
    q(14, 'efficacy', 'I believe consistent effort closes the gap.', 'I believe natural ability sets my ceiling.'),
    q(15, 'efficacy', 'A wrong answer gives me a new direction to try.', 'A wrong answer makes me reluctant to try again.'),
    q(16, 'egoThreat', 'I am not threatened by being seen as a beginner.', 'I dislike being seen as a beginner.'),
    q(17, 'egoThreat', 'I ask questions regardless of what peers think.', 'I hold back questions to protect my image.'),
    q(18, 'egoThreat', 'Error is data I can use to improve.', 'Error is a personal failure I want to hide.'),
    q(19, 'presentation', 'I am honest about the limits of my understanding.', 'I overstate my understanding to avoid looking weak.'),
    q(20, 'presentation', 'I submit work that reflects my real process.', 'I submit polished work that hides my struggles.'),
    q(21, 'presentation', 'I seek support early when a subject slips.', 'I hide a slipping subject until results expose it.'),
    q(22, 'helplessness', 'A poor grade prompts a concrete recovery plan.', 'A poor grade makes me feel effort is futile.'),
    q(23, 'helplessness', 'I believe mastery is earned through practice.', 'I believe mastery is a talent some people are born with.'),
    q(24, 'helplessness', 'I stay engaged when material becomes demanding.', 'I disengage when material becomes demanding.'),
  ],

  'Grade 8': [
    q(1, 'structure', 'I prefer to derive a new rule myself before accepting it.', 'I prefer the teacher to state the rule and show examples.'),
    q(2, 'structure', 'When faced with an unfamiliar problem, I design my own approach.', 'When faced with an unfamiliar problem, I look for a known procedure.'),
    q(3, 'structure', 'I validate my answers using independent checks.', 'I rely on the teacher or memo to validate my answers.'),
    q(4, 'tempo', 'I like to move quickly and refine my work afterwards.', 'I like to perfect each step before moving on.'),
    q(5, 'tempo', 'I do my best thinking under a deadline.', 'I do my best thinking without time pressure.'),
    q(6, 'tempo', 'I make a rapid choice and adjust based on feedback.', 'I hold off until I have considered every possibility.'),
    q(7, 'load', 'I can hold an entire multi-step problem in working memory.', 'I need to offload each step to paper immediately.'),
    q(8, 'load', 'I can study intensively for hours without losing focus.', 'I lose focus after short periods and need breaks.'),
    q(9, 'load', 'I can remember a complex set of instructions without notes.', 'I need a structured list to follow instructions.'),
    q(10, 'pathway', 'I understand abstract ideas best through diagrams and graphs.', 'I understand abstract ideas best through verbal reasoning.'),
    q(11, 'pathway', 'I learn best by doing experiments or practical tasks.', 'I learn best by reading, note-taking and discussion.'),
    q(12, 'pathway', 'I naturally map concepts into spatial or visual patterns.', 'I naturally map concepts into linear, verbal arguments.'),
    q(13, 'efficacy', 'I ask for help as soon as I identify a gap.', 'I try to hide gaps until I can fix them alone.'),
    q(14, 'efficacy', 'I believe I can improve in any subject with the right strategy.', 'I believe some subjects are simply not for me.'),
    q(15, 'efficacy', 'A setback makes me experiment with a new method.', 'A setback makes me doubt whether I belong in the subject.'),
    q(16, 'egoThreat', 'I can ask a basic question without feeling small.', 'Asking a basic question makes me feel inadequate.'),
    q(17, 'egoThreat', 'I am comfortable admitting a topic is hard.', 'I avoid admitting a topic is hard.'),
    q(18, 'egoThreat', 'Mistakes reveal where to focus next.', 'Mistakes feel like evidence of low intelligence.'),
    q(19, 'presentation', 'I describe my confusion accurately when I need help.', 'I keep my confusion vague to avoid looking lost.'),
    q(20, 'presentation', 'I show my rough work and drafts.', 'I hide rough work and show only polished answers.'),
    q(21, 'presentation', 'I ask for support before a small gap becomes a crisis.', 'I wait until failure is unavoidable before seeking help.'),
    q(22, 'helplessness', 'A bad test result leads to a specific study change.', 'A bad test result makes me feel effort does not matter.'),
    q(23, 'helplessness', 'I believe practice changes what I am capable of.', 'I believe ability is mostly fixed.'),
    q(24, 'helplessness', 'I persist through the least enjoyable parts of study.', 'I avoid the least enjoyable parts of study.'),
  ],

  'Grade 9': [
    q(1, 'structure', 'I like to derive principles independently before the lesson.', 'I like the teacher to supply the framework and steps.'),
    q(2, 'structure', 'When a problem is novel, I construct my own solution path.', 'When a problem is novel, I search for a template to adapt.'),
    q(3, 'structure', 'I verify my conclusions with my own reasoning.', 'I verify my conclusions by comparing with friends or memos.'),
    q(4, 'tempo', 'I thrive when moving fast and correcting errors on the fly.', 'I prefer a deliberate pace with full verification.'),
    q(5, 'tempo', 'I enjoy high-pressure timed tasks.', 'I prefer untimed work where I can be thorough.'),
    q(6, 'tempo', 'I make a quick working assumption and test it.', 'I refuse to proceed until every detail is certain.'),
    q(7, 'load', 'I can hold several linked steps in my head at once.', 'I need each step written out before continuing.'),
    q(8, 'load', 'I can sustain long, deep study sessions.', 'I study better in short, structured blocks.'),
    q(9, 'load', 'I keep complex instructions in memory without notes.', 'I need checklists to track complex instructions.'),
    q(10, 'pathway', 'I understand best through diagrams, graphs and visual models.', 'I understand best through spoken or written explanation.'),
    q(11, 'pathway', 'I learn best through practical application and experimentation.', 'I learn best through reading and structured notes.'),
    q(12, 'pathway', 'I think in images, maps and spatial relationships.', 'I think in language, definitions and logical sequences.'),
    q(13, 'efficacy', 'I raise confusion the moment it appears.', 'I conceal confusion until I can resolve it privately.'),
    q(14, 'efficacy', 'I believe strategy and effort determine my results.', 'I believe innate talent determines my results.'),
    q(15, 'efficacy', 'A wrong answer tells me what to adjust.', 'A wrong answer makes me want to withdraw.'),
    q(16, 'egoThreat', 'I am comfortable looking inexperienced while learning.', 'I avoid situations where I look inexperienced.'),
    q(17, 'egoThreat', 'I ask questions even when the room is quiet.', 'I avoid asking questions when the room is quiet.'),
    q(18, 'egoThreat', 'Errors are a normal part of mastering material.', 'Errors make me question my intelligence.'),
    q(19, 'presentation', 'I give an honest account of what I do not know.', 'I exaggerate what I know to protect my image.'),
    q(20, 'presentation', 'I show my working even when it is untidy.', 'I present only work that looks complete and correct.'),
    q(21, 'presentation', 'I seek help early when I notice a weakness.', 'I hide weaknesses until they affect my marks.'),
    q(22, 'helplessness', 'A poor result triggers a specific recovery strategy.', 'A poor result makes me feel effort is pointless.'),
    q(23, 'helplessness', 'I believe mastery comes from sustained practice.', 'I believe mastery is reserved for naturally talented people.'),
    q(24, 'helplessness', 'I stay engaged when the material stops being easy.', 'I disengage when the material stops being easy.'),
  ],

  'Grade 10': [
    q(1, 'structure', "I like to build my own notes and method for a topic before class.", "I prefer to follow the teacher's notes and method exactly."),
    q(2, 'structure', "When a question is unfamiliar, I try to reason it out from what I know.", "When a question is unfamiliar, I look for a similar worked example."),
    q(3, 'structure', "I check my answers with my own reasoning.", "I check my answers against the memo."),
    q(4, 'tempo', "I work fast and then review for mistakes.", "I work slowly and check every line."),
    q(5, 'tempo', "I do well in timed practice tests.", "I do better when I can work without a timer."),
    q(6, 'tempo', "If I am unsure in a test, I choose and move on.", "If I am unsure, I spend time until I am certain."),
    q(7, 'load', "I can hold a whole multi-step calculation in my head.", "I write out each step as I go."),
    q(8, 'load', "I can study for two hours without stopping.", "I study best in 20-minute blocks."),
    q(9, 'load', "I remember long methods without writing them down.", "I need a written checklist for long methods."),
    q(10, 'pathway', "I understand graphs and diagrams faster than words.", "I understand explanations faster than diagrams."),
    q(11, 'pathway', "I learn best by doing practical work.", "I learn best by reading and summarising."),
    q(12, 'pathway', "I picture the problem in my head before solving it.", "I say the rule to myself before solving it."),
    q(13, 'efficacy', "I ask when I do not understand, even in class.", "I try to hide it when I do not understand."),
    q(14, 'efficacy', "I believe the right study method can improve any subject.", "I believe some subjects are just not for me."),
    q(15, 'efficacy', "A bad mark shows me what to fix.", "A bad mark makes me feel I cannot do the subject."),
    q(16, 'egoThreat', "I am okay with classmates knowing I get tutoring.", "I do not want classmates to know I get tutoring."),
    q(17, 'egoThreat', "I ask a question even if it is basic.", "I avoid basic questions so I do not look dumb."),
    q(18, 'egoThreat', "Mistakes are part of learning.", "Mistakes make me look stupid."),
    q(19, 'presentation', "I tell my teacher exactly where I got stuck.", "I give vague answers about what I do not know."),
    q(20, 'presentation', "I hand in drafts and rough work.", "I only hand in work that looks perfect."),
    q(21, 'presentation', "I get help before a topic gets out of hand.", "I wait until I am failing before I get help."),
    q(22, 'helplessness', "A bad result makes me change my study plan.", "A bad result makes me feel studying is pointless."),
    q(23, 'helplessness', "I believe practice raises my ability.", "I believe ability is fixed."),
    q(24, 'helplessness', "I keep working through the hard parts of a topic.", "I skip the hard parts of a topic."),
  ],

  'Grade 11': [
    q(1, 'structure', "I prefer to derive a formula myself before using it.", "I prefer to be given the formula and shown when to use it."),
    q(2, 'structure', "When a question combines topics, I build the method myself.", "When a question combines topics, I look for a template."),
    q(3, 'structure', "I use independent checks to validate my answers.", "I compare my answers with the memo or classmates."),
    q(4, 'tempo', "I work at speed and check at the end.", "I work slowly to avoid mistakes."),
    q(5, 'tempo', "I perform well in exam conditions.", "I perform better with extra time."),
    q(6, 'tempo', "I make a quick plan and adjust it.", "I plan every detail before starting."),
    q(7, 'load', "I can track several formulas and variables in my head.", "I write every formula and variable down."),
    q(8, 'load', "I can revise for long stretches.", "I revise best in short bursts."),
    q(9, 'load', "I follow multi-stage methods from memory.", "I need the method in front of me."),
    q(10, 'pathway', "I understand abstract topics through diagrams.", "I understand abstract topics through explanation."),
    q(11, 'pathway', "I learn best by working through past-paper problems.", "I learn best by reading the textbook."),
    q(12, 'pathway', "I think in patterns and structures.", "I think in definitions and explanations."),
    q(13, 'efficacy', "I ask for clarification early.", "I keep confusion to myself."),
    q(14, 'efficacy', "I believe strategy and effort raise my marks.", "I believe talent sets my marks."),
    q(15, 'efficacy', "A wrong answer shows me what to change.", "A wrong answer makes me doubt myself."),
    q(16, 'egoThreat', "I can admit I do not understand a topic.", "I avoid admitting I do not understand."),
    q(17, 'egoThreat', "I ask questions even when others seem fine.", "I stay quiet when others seem fine."),
    q(18, 'egoThreat', "Errors are useful feedback.", "Errors make me feel like I am falling behind."),
    q(19, 'presentation', "I am honest about my weak topics.", "I overstate how ready I am."),
    q(20, 'presentation', "I show my teacher my rough working.", "I hide rough working."),
    q(21, 'presentation', "I get support before a weak topic affects my marks.", "I hide a weak topic until results show it."),
    q(22, 'helplessness', "A poor result leads to a new revision plan.", "A poor result makes me feel effort is useless."),
    q(23, 'helplessness', "I believe deliberate practice builds mastery.", "I believe mastery is natural talent."),
    q(24, 'helplessness', "I push through the hardest syllabus sections.", "I avoid the hardest syllabus sections."),
  ],

  'Grade 12': [
    q(1, 'structure', "I like to build my own summary framework from the textbook.", "I prefer to use a summary someone else has made."),
    q(2, 'structure', "When a finals question is unusual, I reason from first principles.", "When a finals question is unusual, I look for a familiar procedure."),
    q(3, 'structure', "I verify answers with independent reasoning.", "I verify answers with the marking memo."),
    q(4, 'tempo', "I practise under strict timed conditions.", "I practise without a timer to focus on accuracy."),
    q(5, 'tempo', "I thrive under exam time pressure.", "I need generous time to show what I know."),
    q(6, 'tempo', "I choose an approach quickly and adapt.", "I spend time choosing the perfect approach."),
    q(7, 'load', "I can hold a full multi-part question in my head.", "I need each part written out before continuing."),
    q(8, 'load', "I can study for long, deep sessions.", "I need frequent breaks to stay sharp."),
    q(9, 'load', "I remember long methods and formulas without notes.", "I rely on my formula sheet and notes."),
    q(10, 'pathway', "I understand hard concepts through graphs and models.", "I understand hard concepts through spoken explanation."),
    q(11, 'pathway', "I learn best by doing full past papers.", "I learn best by rereading and summarising notes."),
    q(12, 'pathway', "I think in diagrams and systems.", "I think in words and arguments."),
    q(13, 'efficacy', "I ask for help early in the year.", "I keep struggles private until the end."),
    q(14, 'efficacy', "I believe the right plan can lift any subject.", "I believe some subjects are beyond me."),
    q(15, 'efficacy', "A mock result gives me a clear next step.", "A mock result makes me panic and doubt myself."),
    q(16, 'egoThreat', "I am comfortable telling people I am struggling.", "I do not want people to know I am struggling."),
    q(17, 'egoThreat', "I ask questions even in the final stretch.", "I stay quiet in the final stretch."),
    q(18, 'egoThreat', "Mistakes in practice are useful.", "Mistakes in practice make me fear the exam."),
    q(19, 'presentation', "I tell my teacher which topics I am avoiding.", "I hide the topics I am avoiding."),
    q(20, 'presentation', "I show my messy working.", "I only show polished answers."),
    q(21, 'presentation', "I get help before finals.", "I wait until it is too late to get help."),
    q(22, 'helplessness', "A bad result makes me adjust my plan.", "A bad result makes me feel it is hopeless."),
    q(23, 'helplessness', "I believe practice can change my results.", "I believe results are fixed by talent."),
    q(24, 'helplessness', "I keep going through the hardest revision.", "I avoid the hardest revision."),
  ],
};

/** Map any grade label (Grade N, Year N, Kindergarten) to a supported set. */
export function normalizeGrade(grade: string | undefined | null): SupportedGrade {
  const raw = String(grade || '').trim();
  const match = raw.match(/(\d+)/);
  let n = match ? Number(match[1]) : 9;
  if (/^k/i.test(raw)) n = 3;
  n = Math.max(3, Math.min(12, n));
  return `Grade ${n}` as SupportedGrade;
}

/** The 24 items a learner in this grade should see. */
export function getPsychometricQuestions(grade: string | undefined | null): ForcedChoiceQuestion[] {
  return PSYCHOMETRIC_QUESTION_BANK[normalizeGrade(grade)];
}

/** Total number of items (used by the UI). */
export const QUESTIONS_PER_LEARNER = 24;

// ---------------------------------------------------------------------------
// DIMENSION DICTIONARY (internal / LLM only — never shown in the questions)
// ---------------------------------------------------------------------------

interface DimensionPole {
  label: string;
  /** Operational sub-behaviours observed when the learner is on this pole. */
  components: string[];
  description: string;
  aiInstruction: string;
}

export interface DimensionGuideEntry {
  label: string;
  positive: DimensionPole;
  negative: DimensionPole;
}

export const DIMENSION_GUIDE: Record<DimensionKey, DimensionGuideEntry> = {
  structure: {
    label: 'Field Independence vs Field Dependence (Structural Autonomy)',
    positive: {
      label: 'Internal Structural Synthesis',
      components: ['Self-guided path', 'Raw component deconstruction', 'Internal proof'],
      description:
        'Deconstructs raw components and builds the structure from first principles, then proves the result internally.',
      aiInstruction:
        'Offer raw components and let the learner assemble the structure. Ask them to justify each step. Do not pre-package the method.',
    },
    negative: {
      label: 'External Contextual Anchor',
      components: ['Step-by-step template', 'Big-picture overview', 'External solution verification'],
      description:
        'Needs a scaffolded template, a whole-task overview or an external check before committing to a path.',
      aiInstruction:
        'Provide a clear step-by-step template, a one-paragraph big-picture overview, and one worked example before asking the learner to continue. Let them verify against the model.',
    },
  },
  tempo: {
    label: 'Conceptual Tempo (Speed-Accuracy Calibration)',
    positive: {
      label: 'High Velocity & Trial-and-Error',
      components: ['Fast guess', 'Speed focus', 'Rapid error iteration', 'Surgical step-debugging'],
      description:
        'Moves fast, commits early, then iterates by debugging the exact step that failed.',
      aiInstruction:
        'Use short, high-tempo prompts. Encourage rapid attempts, immediate feedback and surgical debugging of the failed step. Do not over-explain before they try.',
    },
    negative: {
      label: 'Deliberate Precision',
      components: ['Deep reflective thinking', '100% accuracy focus', 'Stop-and-wait hint reliance', 'Macro ground-zero restart'],
      description:
        'Thinks deeply, prioritises complete accuracy, and may stop for a hint or restart from first principles when uncertain.',
      aiInstruction:
        'Allow thinking time. Ask for a full step layout and a verification check before moving on. If they stall, give a minimal hint rather than the next step, and be ready to restart from the last secure foundation.',
    },
  },
  load: {
    label: 'Cognitive Load Capacity (Working-Memory Bandwidth)',
    positive: {
      label: 'High Working Memory Bandwidth',
      components: ['All information upfront', 'Long study blocks', 'Multi-step stack in head', 'Internal mental scratchpad'],
      description:
        'Can take the whole task upfront, hold a multi-step stack mentally, and sustain long study blocks.',
      aiInstruction:
        'Present the full task and several variables at once. Keep blocks long and intellectually demanding. Do not fragment the reasoning unless asked.',
    },
    negative: {
      label: 'Micro-Chunking & Low Overload Threshold',
      components: ['Bite-sized instructions', 'Short bursts', 'Single-action constraints', 'Mandatory external offloading'],
      description:
        'Overloads quickly; needs one action at a time, short bursts and written external offloading.',
      aiInstruction:
        'Deliver exactly one action per turn. Keep bursts short. Require the learner to write each step into an external scratchpad before continuing.',
    },
  },
  pathway: {
    label: 'Perceptual Processing Pathway (Sensory Encoding)',
    positive: {
      label: 'Visual-Spatial & Kinesthetic Execution',
      components: ['Diagrams and mind maps', 'Practice-first', 'Concrete real-world analogies', 'Mental picture mapping'],
      description:
        'Encodes through diagrams, mind maps, movement, hands-on practice and concrete real-world analogues.',
      aiInstruction:
        'Frame every concept as a diagram, mind map, mental picture or physical mechanism before introducing symbols. Prefer practice-first examples.',
    },
    negative: {
      label: 'Linear Syntactic & Verbal Encoding',
      components: ['Structured text', 'Theory-first', 'Direct mathematical formulas', 'Out-loud verbal re-articulation'],
      description:
        'Encodes through structured text, formal theory, direct formulas and verbal re-articulation.',
      aiInstruction:
        'Use precise verbal definitions, ordered written steps, direct formula notation, and ask the learner to re-articulate the rule out loud or in writing.',
    },
  },
  efficacy: {
    label: 'Academic Self-Efficacy (Bandura)',
    positive: {
      label: 'High Academic Self-Efficacy',
      components: ['Resilient exploration', 'Asks why when stuck', 'Admits confusion immediately', 'Views mistakes as data'],
      description:
        'Believes the brain is capable; a missing answer is a minor step to fix, not a verdict on ability.',
      aiInstruction:
        'Set ambitious challenges and expect independent attempts. Reward the question why, treat errors as data, and keep the learner in resilient exploration.',
    },
    negative: {
      label: 'Low Academic Self-Efficacy',
      components: ['Expects failure', 'Avoids attempts', 'Needs certainty before trying', 'Reads difficulty as incapability'],
      description:
        'Expects failure when a task is hard and interprets difficulty as proof of incapability.',
      aiInstruction:
        'Open with a solvable foothold, escalate difficulty in visible increments, and explicitly attribute each success to strategy and effort rather than talent.',
    },
  },
  egoThreat: {
    label: 'Ego Threat & Academic Vulnerability',
    positive: {
      label: 'Low Ego Threat',
      components: ['Comfortable being corrected', 'Asks basic questions', 'Separates error from identity', 'Tolerates public uncertainty'],
      description:
        'Perceives questions and correction as learning moments, not threats to dignity or peer standing.',
      aiInstruction:
        'Provide direct, honest corrective feedback. The learner can tolerate being shown an error in the normal flow of the lesson.',
    },
    negative: {
      label: 'High Ego Threat',
      components: ['Perceives questions as public threat', 'Defends dignity', 'Avoids exposure', 'Confuses error with stupidity'],
      description:
        'Experiences being questioned or corrected as a public threat to dignity, intelligence and peer standing.',
      aiInstruction:
        'Correct privately and indirectly. Never frame an error as a personal flaw. Normalise the error as a property of the method, and avoid putting the learner on the spot.',
    },
  },
  presentation: {
    label: 'Defensive Self-Presentation & Impression Management',
    positive: {
      label: 'Transparent Self-Presentation',
      components: ['Admits confusion immediately', 'Shows rough work', 'Asks for help early', 'Accurate self-report'],
      description:
        'Protects learning over image: admits confusion, shows rough work and asks for help early.',
      aiInstruction:
        'Ask directly what they do not understand, expect an honest answer, and ask to see rough work rather than only final answers.',
    },
    negative: {
      label: 'Defensive Self-Presentation',
      components: ['Hides confusion', 'Pretends to understand', 'Guesses to stop scrutiny', 'Dismissive brush-off'],
      description:
        'Uses impression management (pretending, guessing, silence or a dismissive brush-off) to protect the ego.',
      aiInstruction:
        'Do not ask whether they understand. Use quick low-stakes diagnostic questions to locate the real gap without exposing them. Treat "I do not care" as a protective signal, not a motivational fact.',
    },
  },
  helplessness: {
    label: 'Learned Helplessness & Academic Shame (Seligman)',
    positive: {
      label: 'Persistent Mastery Orientation',
      components: ['Keeps trying after failure', 'Believes practice changes ability', 'Plans a new strategy', 'Pushes through difficulty'],
      description:
        'Keeps trying after failure and believes effort and strategy can change ability.',
      aiInstruction:
        'Use stretch goals and long-horizon practice. Reinforce that difficulty is the point of practice and that the learner action produced the progress.',
    },
    negative: {
      label: 'Learned Helplessness & Academic Shame',
      components: ['Freezes before trying', 'Effort feels futile', 'Shame after failure', 'Avoids the subject'],
      description:
        'After repeated failure or embarrassment, freezes or shuts down before trying, believing effort cannot change the outcome.',
      aiInstruction:
        'Engineer early wins. Break the task into guaranteed-success steps, remove time pressure, and explicitly credit each success to the learner action. Do not moralise about effort.',
    },
  },
};

// ---------------------------------------------------------------------------
// LIFE PATH & MERCURY DICTIONARIES
// ---------------------------------------------------------------------------

export interface LifePathEntry {
  archetype: string;
  description: string;
  strengths: string[];
}

export const LIFE_PATH_GUIDE: Record<number, LifePathEntry> = {
  1: { archetype: 'The Leader', description: 'Self-directed and driven to initiate; learns through autonomy and ownership.', strengths: ['Initiative', 'Independence', 'Decisive action'] },
  2: { archetype: 'The Collaborator', description: 'Learns through dialogue, partnership and responsive feedback.', strengths: ['Listening', 'Cooperation', 'Sensitivity to nuance'] },
  3: { archetype: 'The Communicator', description: 'Learns by articulating, storytelling and creative expression.', strengths: ['Expression', 'Creativity', 'Narrative memory'] },
  4: { archetype: 'The Builder', description: 'Learns through structure, rules, repetition and concrete examples.', strengths: ['Discipline', 'Systems thinking', 'Reliability'] },
  5: { archetype: 'The Explorer', description: 'Learns through variety, movement and real-world experimentation.', strengths: ['Adaptability', 'Curiosity', 'Fast learning'] },
  6: { archetype: 'The Nurturer', description: 'Learns through relationship, empathy and teaching others.', strengths: ['Empathy', 'Responsibility', 'Community focus'] },
  7: { archetype: 'The Analyst', description: 'Learns through deep inquiry, theory and solitary reflection.', strengths: ['Analysis', 'Depth', 'Pattern recognition'] },
  8: { archetype: 'The Strategist', description: 'Learns through goals, measurable outcomes and systems.', strengths: ['Planning', 'Execution', 'Resourcefulness'] },
  9: { archetype: 'The Visionary', description: 'Learns through big-picture meaning and global context.', strengths: ['Synthesis', 'Perspective', 'Purpose'] },
  11: { archetype: 'The Intuitive', description: 'Learns through insight, metaphor and heightened sensitivity.', strengths: ['Intuition', 'Insight', 'Inspiration'] },
  22: { archetype: 'The Master Builder', description: 'Combines vision with practicality; learns through large, real projects.', strengths: ['Vision', 'Construction', 'Scale'] },
  33: { archetype: 'The Master Teacher', description: 'Learns by guiding others and integrating empathy with mastery.', strengths: ['Mentorship', 'Wisdom', 'Integration'] },
};

export interface CognitiveProfileGuideEntry extends LifePathEntry {
  element: MercuryElement;
  title: string;
  learningAbility: string;
  digestion: string;
  logic: string;
  recollection: string;
  retention: string;
  aiInstruction: string;
}

/**
 * COGNITIVE_PROFILE_GUIDE — the lookup table the LLM uses to translate the
 * Mercury element into concrete teaching behaviour.
 */
export const COGNITIVE_PROFILE_GUIDE: Record<MercuryElement, CognitiveProfileGuideEntry> = {
  Fire: {
    element: 'Fire',
    title: 'Fire Mercury — High-Velocity Challenge Engine',
    archetype: 'The Trailblazer',
    description: 'Fast, competitive and energised by visible progress.',
    strengths: ['Speed', 'Competitive drive', 'Bold experimentation'],
    learningAbility:
      'Rapid, action-first learning. Grasps the shape of a problem quickly and learns by trying, failing and retrying.',
    digestion: 'High-tempo, competitive processing with short feedback loops.',
    logic: 'Built through trial, error and iterative correction rather than extended theory.',
    recollection: 'Triggered by timed drills, challenges, streaks and immediate results.',
    retention: 'Anchors when concepts are practised under mild pressure and revisited as quick-fire challenges.',
    aiInstruction:
      'Use timed challenges, rapid questioning and immediate feedback. Keep momentum high, avoid long theory blocks, and convert errors into the next drill.',
  },
  Earth: {
    element: 'Earth',
    title: 'Earth Mercury — Grounded Mastery Engine',
    archetype: 'The Builder',
    description: 'Steady, practical and methodical; builds confidence through mastery.',
    strengths: ['Consistency', 'Precision', 'Durability'],
    learningAbility:
      'Sequential, grounded learning. Needs to see each brick laid correctly before moving to the next.',
    digestion: 'Deliberate, step-by-step ingestion with verification at each stage.',
    logic: 'Built through concrete rules, worked examples and repeated confirmation.',
    recollection: 'Triggered by structured revision, checklists and cumulative practice.',
    retention: 'Anchors when knowledge is built in layers and revisited systematically.',
    aiInstruction:
      'Provide explicit steps, worked examples and checklists. Verify each stage before advancing and connect new material to previously mastered foundations.',
  },
  Air: {
    element: 'Air',
    title: 'Air Mercury — Conceptual Synthesis Engine',
    archetype: 'The Analyst',
    description: 'Intellectual, verbal and associative; learns through connection and debate.',
    strengths: ['Conceptual clarity', 'Pattern linking', 'Analytical depth'],
    learningAbility:
      'Rapid, associative processing. Absorbs information by connecting new concepts to existing knowledge networks, exploring "what if" scenarios, and analysing multiple perspectives simultaneously.',
    digestion: 'Conceptual and comparative. Needs the big picture and the relationships between parts.',
    logic: 'Formed through dialectic reasoning, conceptual frameworks and theoretical synthesis. Understands logic by comparing patterns, identifying underlying relationships, and debating core ideas.',
    recollection: 'Triggered by conceptual keywords, comparative matrices, mind maps and re-explaining theories back in explicit verbal or written form.',
    retention:
      'Achieved when information is integrated into a broad, interconnected web of knowledge. Retains concepts long-term when able to see how a single rule applies across multiple topics or real-world systems.',
    aiInstruction:
      'Utilise side-by-side comparative tables, dialectic Socratic questioning and multi-concept linking. Encourage conceptual depth, open-ended analysis and theoretical synthesis.',
  },
  Water: {
    element: 'Water',
    title: 'Water Mercury — Experiential Intuition Engine',
    archetype: 'The Catalyst',
    description: 'Contextual, intuitive and narrative-driven; learns through meaning.',
    strengths: ['Intuition', 'Contextual insight', 'Narrative memory'],
    learningAbility:
      'Contextual, deeply intuitive and narrative-driven. Learns best when concepts are embedded in real-world human contexts, stories, thematic frameworks or visual mental images.',
    digestion: 'Immersion-based, reflective processing. Ingests knowledge holistically and needs to picture the whole scenario before the parts make sense.',
    logic: 'Formed through root-cause analysis, contextual relationships and visual-spatial mapping. Builds logic by understanding why something exists within its broader environment.',
    recollection: 'Triggered by rich analogies, story loops, real-world scenarios and thematic associations.',
    retention:
      'Anchored deep when concepts evoke intuitive understanding or personal relevance. Retains complex models by mapping them to vivid, relatable real-world systems.',
    aiInstruction:
      'Use narrative framing, real-world contextual scenarios and visual analogies. Wrap abstract formulas inside concrete story loops or physical mental models before isolating raw symbols.',
  },
};

// ---------------------------------------------------------------------------
// DOB ASTROLOGY (Mercury sign) — used as a prior, not the sole signal
// ---------------------------------------------------------------------------

export function mercuryElementFromDOB(dob: string): MercuryElement {
  try {
    const date = new Date(dob);
    if (isNaN(date.getTime())) return 'Air';
    const t = new Astronomy.AstroTime(date);
    const lon = Astronomy.EclipticLongitude(Astronomy.Body.Mercury, t);
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
    const sign = signs[idx];
    if (['Aries', 'Leo', 'Sagittarius'].includes(sign)) return 'Fire';
    if (['Taurus', 'Virgo', 'Capricorn'].includes(sign)) return 'Earth';
    if (['Gemini', 'Libra', 'Aquarius'].includes(sign)) return 'Air';
    return 'Water';
  } catch {
    return 'Air';
  }
}

export function lifePathNumberFromDOB(dob: string): number {
  const digits = String(dob || '').replace(/[^0-9]/g, '').split('').map(Number);
  if (!digits.length) return 7;
  let sum = digits.reduce((acc, d) => acc + d, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').map(Number).reduce((a, b) => a + b, 0);
  }
  return sum || 7;
}

// ---------------------------------------------------------------------------
// SCORING
// ---------------------------------------------------------------------------

export interface DimensionResult {
  key: DimensionKey;
  /** -3 … +3 */
  score: number;
  /** 0–100 strength of the positive pole. */
  percentage: number;
  label: string;
  poleLabel: string;
  description: string;
  aiInstruction: string;
}

export interface FirmamentResult {
  studentName: string;
  grade: string;
  country: CountryCode;
  calculatedAt: string;
  rawAnswers: AnswerMap;
  onboardingAnswers: AnswerMap;
  dimensions: Record<DimensionKey, DimensionResult>;
  cognitiveScore: string;
  processingSpeed: string;
  retentionProfile: string;
  supportNeeds: string;
  scaffoldNeeds: string;
  firmamentRules: string[];
  lifePath: {
    number: number;
    profile: string;
    archetype: string;
    description: string;
    strengths: string[];
  };
  mercury: {
    element: MercuryElement;
    pacingStyle: string;
    temperament: string;
    learningRhythm: string;
    dobElement: MercuryElement;
  };
  cognitiveVector: {
    primaryModality: PrimaryModality;
    secondaryModality: string;
    analogySet: string;
    southAfricanAnalogySet: string;
    reasoningScaffold: string;
    fieldStructure: string;
    conceptualTempo: string;
    loadCapacity: string;
    pathway: string;
    selfEfficacy: string;
    egoThreat: string;
    presentation: string;
    masteryOrientation: string;
  };
  cognitiveProfileGuide: CognitiveProfileGuideEntry;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function scoreDimensions(questions: ForcedChoiceQuestion[], answers: AnswerMap): Record<DimensionKey, DimensionResult> {
  const result = {} as Record<DimensionKey, DimensionResult>;

  for (const key of DIMENSION_ORDER) {
    const items = questions.filter((item) => item.dimension === key);
    let score = 0;
    for (const item of items) {
      if (answers[item.id] === 'this') score += 1;
      else if (answers[item.id] === 'that') score -= 1;
    }
    const guide = DIMENSION_GUIDE[key];
    const usePositive = score >= 0;
    const pole = usePositive ? guide.positive : guide.negative;
    result[key] = {
      key,
      score,
      percentage: Math.round(((score + items.length) / (2 * items.length)) * 100),
      label: guide.label,
      poleLabel: pole.label,
      components: pole.components,
      description: pole.description,
      aiInstruction: pole.aiInstruction,
    };
  }

  return result;
}

function deriveMercuryElement(
  dimensions: Record<DimensionKey, DimensionResult>,
  dob: string
): MercuryElement {
  const s = (key: DimensionKey) => dimensions[key].score / 3;

  const votes: Record<MercuryElement, number> = {
    Fire: 1.4 * s('tempo') + 0.8 * s('efficacy') + 0.5 * s('structure') + 0.3 * s('helplessness'),
    Earth: -1.4 * s('tempo') + 0.9 * s('load') + 0.7 * s('structure') - 0.3 * s('helplessness'),
    Air: 1.0 * s('load') - 0.9 * s('pathway') + 0.6 * s('structure') + 0.3 * s('efficacy'),
    Water: 0.9 * s('pathway') - 0.8 * s('structure') - 0.5 * s('tempo') - 0.4 * s('efficacy'),
  };

  // Astrological Mercury acts as a tie-breaking prior only.
  const dobElement = mercuryElementFromDOB(dob);
  votes[dobElement] += 0.35;

  return (Object.entries(votes) as [MercuryElement, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

function deriveModality(
  dimensions: Record<DimensionKey, DimensionResult>
): { primary: PrimaryModality; secondary: string } {
  const pathwayPositive = dimensions.pathway.score >= 0;
  const tempoPositive = dimensions.tempo.score >= 0;
  const structurePositive = dimensions.structure.score >= 0;

  if (pathwayPositive) {
    return tempoPositive
      ? { primary: 'Kinesthetic', secondary: 'Visual' }
      : { primary: 'Visual', secondary: 'Kinesthetic' };
  }
  return structurePositive
    ? { primary: 'Logical-Rule', secondary: 'Auditory' }
    : { primary: 'Auditory', secondary: 'Logical-Rule' };
}

const PACING_BY_ELEMENT: Record<MercuryElement, { pacingStyle: string; temperament: string; learningRhythm: string }> = {
  Fire: {
    pacingStyle: 'High-Velocity & Challenge-Driven',
    temperament: 'Competitive, dynamic, energised by timed sprint drills',
    learningRhythm: '25-minute power focus blocks with instant feedback loops',
  },
  Earth: {
    pacingStyle: 'Methodical & Grounded Mastery',
    temperament: 'Disciplined, thorough, step-by-step verification',
    learningRhythm: 'Deep, uninterrupted work sessions with detailed checklist tracking',
  },
  Air: {
    pacingStyle: 'Conceptual & Guided Discovery Dialogue',
    temperament: 'Curious, analytical, connects ideas across subjects',
    learningRhythm: 'Interactive conversational inquiry and conceptual synthesis',
  },
  Water: {
    pacingStyle: 'Empathetic & Narrative-Immersed',
    temperament: 'Intuitive, reflective, learns through context and human impact',
    learningRhythm: 'Story-supported progression with confidence-reinforcing milestones',
  },
};

const ANALOGY_SETS: Record<CountryCode, Record<PrimaryModality, string>> = {
  US: {
    Visual: 'diagrams of US road networks, sports formations, weather maps, dollar-and-cents charts',
    Auditory: 'classroom debate, podcast-style explanation, verbal walkthroughs of past paper questions',
    Kinesthetic: 'hands-on experiments, sports momentum, cooking measurements, building and measuring',
    'Logical-Rule': 'step-by-step algorithms, tax brackets, state-standard proof structures',
  },
  UK: {
    Visual: 'rail-network maps, weather charts, football formations, pound-and-pence tables',
    Auditory: 'spoken exam walkthroughs, classroom debate, mnemonic rhythms',
    Kinesthetic: 'practical experiments, sports momentum, cooking measurements, model building',
    'Logical-Rule': 'exam-board mark schemes, step-by-step methods, formal proof structures',
  },
  ZA: {
    Visual: 'schematic blueprints, spatial models, topographic contours, power-grid diagrams',
    Auditory: 'guided-discovery dialogue, mnemonic rhythms, oral debate structures',
    Kinesthetic: 'tactile mechanisms, minibus-taxi change, sports momentum, physical experiments',
    'Logical-Rule': 'strict deductive syllogisms, axiomatic proofs, algorithmic state transitions',
  },
};

const REASONING_SCAFFOLD_BY_MODALITY: Record<PrimaryModality, string> = {
  'Logical-Rule': 'Deductive Axiom → Intermediate Substitution → Final Statement with reason',
  Visual: 'Mental Picture → Spatial Diagram → Mathematical Expression',
  Kinesthetic: 'Physical Context → Hands-on Manipulation → Formal Symbolic Representation',
  Auditory: 'Verbal Questioning → Guided Intuition → Formal Articulation',
};

function buildFirmamentRules(
  dimensions: Record<DimensionKey, DimensionResult>,
  primaryModality: PrimaryModality,
  country: CountryCode
): string[] {
  const curriculum =
    country === 'US'
      ? 'the applicable US state academic standards'
      : country === 'UK'
      ? 'the relevant UK national curriculum and exam-board specification'
      : 'the South African CAPS (DBE) curriculum';

  return [
    'LAW 1: Blindness to Generic Tutoring — Never use generic openings, boilerplate textbook regurgitation or bland pleasantries. Engage immediately through the learner profile.',
    'LAW 2: Guided Discovery Zero-Direct-Answer Law — Never solve the problem or reveal the final answer. Ask the single next guiding question that moves the learner forward.',
    `LAW 3: Cognitive Modality Alignment — Frame every explanation strictly through the learner's ${primaryModality} modality (${dimensions.pathway.poleLabel}).`,
    `LAW 4: Curriculum Grounding — Ground every response in ${curriculum}; quote the relevant standard, specification point or exam convention.`,
    `LAW 5: Affective Safety — Respect the learner's ${dimensions.egoThreat.poleLabel.toLowerCase()} and ${dimensions.presentation.poleLabel.toLowerCase()} profile: never shame an error, and never ask "do you understand?" when transparency is low.`,
  ];
}

/**
 * Score the 24-item Firmament diagnostic.
 *
 * Backwards-compatible: accepts either
 *   calculateFirmamentFromAnswers(name, dob, grade, answers, country)
 * or the legacy
 *   calculateFirmamentFromAnswers(name, dob, answers)
 */
export function calculateFirmamentFromAnswers(
  studentName: string,
  dob: string,
  gradeOrAnswers: string | AnswerMap,
  maybeAnswers?: AnswerMap | CountryCode,
  maybeCountry?: CountryCode
): FirmamentResult {
  let grade = 'Grade 9';
  let answers: AnswerMap = {};
  let country: CountryCode = 'US';

  if (typeof gradeOrAnswers === 'object' && gradeOrAnswers !== null) {
    answers = gradeOrAnswers as AnswerMap;
    country = (maybeAnswers as CountryCode) || 'US';
  } else {
    grade = gradeOrAnswers as string;
    answers = (maybeAnswers as AnswerMap) || {};
    country = maybeCountry || 'US';
  }

  const questions = getPsychometricQuestions(grade);
  const dimensions = scoreDimensions(questions, answers);

  const lifePathNumber = lifePathNumberFromDOB(dob);
  const lifePathEntry = LIFE_PATH_GUIDE[lifePathNumber] || LIFE_PATH_GUIDE[7];

  const element = deriveMercuryElement(dimensions, dob);
  const guide = COGNITIVE_PROFILE_GUIDE[element];
  const pacing = PACING_BY_ELEMENT[element];

  const { primary, secondary } = deriveModality(dimensions);

  const tempoPositive = dimensions.tempo.score >= 0;
  const loadPositive = dimensions.load.score >= 0;

  const processingSpeed =
    tempoPositive && loadPositive
      ? 'High Processing Speed'
      : !tempoPositive
      ? 'Methodical / Precision-Paced'
      : 'Reflective / Contextual-Paced';

  const retentionProfile = loadPositive
    ? 'Axiomatic Retention (high conceptual retention with formal rule adherence)'
    : dimensions.pathway.score >= 0
    ? 'Visual Retention (high spatial retention; needs visual schematics and diagrams)'
    : 'Scaffolded Retention (needs spaced micro-checkpoints and deliberate recall)';

  const supportNeeds = [
    dimensions.structure.aiInstruction,
    dimensions.tempo.aiInstruction,
    dimensions.load.aiInstruction,
    dimensions.pathway.aiInstruction,
    dimensions.efficacy.aiInstruction,
    dimensions.egoThreat.aiInstruction,
    dimensions.presentation.aiInstruction,
    dimensions.helplessness.aiInstruction,
  ].join(' ');

  const cognitiveScore = `${lifePathEntry.archetype}-${primary} (${element} engine, ${processingSpeed})`;

  return {
    studentName,
    grade: normalizeGrade(grade),
    country,
    calculatedAt: new Date().toISOString(),
    rawAnswers: answers,
    onboardingAnswers: answers,
    dimensions,
    cognitiveScore,
    processingSpeed,
    retentionProfile,
    supportNeeds,
    scaffoldNeeds: supportNeeds,
    firmamentRules: buildFirmamentRules(dimensions, primary, country),
    lifePath: {
      number: lifePathNumber,
      profile: lifePathEntry.archetype,
      archetype: lifePathEntry.archetype,
      description: lifePathEntry.description,
      strengths: lifePathEntry.strengths,
    },
    mercury: {
      element,
      ...pacing,
      dobElement: mercuryElementFromDOB(dob),
    },
    cognitiveVector: {
      primaryModality: primary,
      secondaryModality: secondary,
      analogySet: ANALOGY_SETS[country][primary],
      southAfricanAnalogySet: ANALOGY_SETS.ZA[primary],
      reasoningScaffold: REASONING_SCAFFOLD_BY_MODALITY[primary],
      fieldStructure: dimensions.structure.poleLabel,
      conceptualTempo: dimensions.tempo.poleLabel,
      loadCapacity: dimensions.load.poleLabel,
      pathway: dimensions.pathway.poleLabel,
      selfEfficacy: dimensions.efficacy.poleLabel,
      egoThreat: dimensions.egoThreat.poleLabel,
      presentation: dimensions.presentation.poleLabel,
      masteryOrientation: dimensions.helplessness.poleLabel,
    },
    cognitiveProfileGuide: guide,
  };
}
