import boy from './assets/characters/character-01.png';
import girl from './assets/characters/character-02.png';
import dayRoom from '../배경낮.png';
import nightRoom from '../배경밤.png';
import characters from '../data/characters.json';

export { boy, girl, dayRoom, nightRoom };

export const CHARACTER_IMAGES = Object.freeze({ boy, girl });
export const characterImage = (character) => CHARACTER_IMAGES[character] ?? boy;
export const characterLabel = (character) => characters[character]?.name ?? '캐릭터';
