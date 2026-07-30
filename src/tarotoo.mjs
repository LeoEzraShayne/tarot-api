import { cards as sourceCards } from 'tarotoo-tarot';

export const DATASET = Object.freeze({
  id:'tarotoo-tarot', version:'1.0.2', source:'https://github.com/Tarotoo-com/tarotoo-tarot-dataset', license:'MIT'
});

export const tarotCards = Object.freeze(sourceCards.map(card => Object.freeze({
  id:String(card.id), name:card.name, arcana:card.arcana, suit:card.suit,
  number:card.number_numerology, element:card.element,
  keywordsUpright:Object.freeze(card.keywords_upright), keywordsReversed:Object.freeze(card.keywords_reversed),
  meaningUpright:card.meaning_upright, meaningReversed:card.meaning_reversed,
  love:card.love, loveReversed:card.love_reversed,
  career:card.career, careerReversed:card.career_reversed,
  mood:card.mood, moodReversed:card.mood_reversed,
  spiritual:card.spiritual, spiritualReversed:card.spiritual_reversed
})));

export const tarotCardById = new Map(tarotCards.map(card => [card.id, card]));
