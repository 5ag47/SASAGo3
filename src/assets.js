import boy from '../남자초안.png';
import girl from '../여자초안.png';
import dayRoom from '../배경낮.png';
import nightRoom from '../배경밤.png';

export { boy, girl, dayRoom, nightRoom };

export const characterImage = character => (character === 'boy' ? boy : girl);
export const characterLabel = character => (character === 'boy' ? '남학생' : '여학생');
