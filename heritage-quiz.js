// Heritage topics verified against UNESCO's UAE heritage listings.
export const HERITAGE_SOURCE = 'https://www.unesco.org/en/countries/ae/lists-and-nominations';
export const HERITAGE_QUESTIONS = [
  { question: 'What is a majlis traditionally used for?', options: ['Storing fishing nets', 'Gathering and exchanging news', 'Racing camels', 'Making pottery'], answer: 1, fact: 'A majlis is a cultural and social gathering space for conversation and community life.' },
  { question: 'Which drink is celebrated as a symbol of generosity?', options: ['Arabic coffee (gahwa)', 'Lemonade', 'Hot chocolate', 'Iced tea'], answer: 0, fact: 'Arabic coffee, or gahwa, is closely associated with hospitality and generosity.' },
  { question: 'Al-Ayyala is a traditional form of what?', options: ['Boat building', 'Irrigation', 'Performing art', 'Embroidery'], answer: 2, fact: 'Al-Ayyala is a traditional performing art practised in the UAE and Oman.' },
  { question: 'Which heritage practice involves birds of prey?', options: ['Al Talli', 'Calligraphy', 'Camel racing', 'Falconry'], answer: 3, fact: 'Falconry is a living heritage practice centred on birds of prey.' },
  { question: 'What is Al Talli known for?', options: ['Traditional embroidery', 'Desert navigation', 'Horse racing', 'Pearl diving'], answer: 0, fact: 'Al Talli is a traditional embroidery craft in the United Arab Emirates.' },
  { question: 'What does the traditional Al Aflaj system distribute?', options: ['Coffee', 'Water', 'Woven cloth', 'Spices'], answer: 1, fact: 'Al Aflaj are traditional irrigation networks with practices for sharing and managing water.' },
];

export function scoreHeritageAnswers(answers) {
  return answers.reduce((scores, answer) => {
    if (answer.choice === HERITAGE_QUESTIONS[answer.question]?.answer) {
      scores[answer.question % 2 === 0 ? 'teamAScore' : 'teamBScore'] += 10;
    }
    return scores;
  }, { teamAScore: 0, teamBScore: 0 });
}
