import type { CharacterImage } from './api';
import type { PersonaId } from './data';

// Card portraits use mild expressions. Dramatic ending art is reserved for dialogue.
export function personaPhoto(images: CharacterImage[], characterId: string, persona: PersonaId): string | undefined {
  if (persona === 'calm') return undefined; // Keep the original bundled photo.
  const emotion = persona === 'tease' ? 'happy' : 'angry';
  const reactions = characterId === 'girlfriend'
    ? (persona === 'tease' ? ['delighted', 'shy_pleased', 'amused'] : ['displeased', 'annoyed'])
    : characterId === 'professor'
      ? (persona === 'tease' ? ['pleased', 'reassuring'] : ['stern'])
      : [];
  const candidates = images.filter(image => image.characterId === characterId && image.emotion === emotion && !image.endingPreferred && image.imageUrl);
  for (const reaction of reactions) {
    const match = candidates.find(image => image.reaction === reaction);
    if (match) return match.imageUrl;
  }
  // Legacy friend/manager assets have no reaction metadata.
  return candidates.find(image => image.assetKey === `characters/${characterId}/${emotion}`)?.imageUrl;
}
