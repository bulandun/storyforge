export const MAX_SCENES = 300;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && value.length > 0;

/** Return a user-facing error, or null for a structurally valid game.
 * @param {any} story
 * @returns {string|null}
 */
export function validateStory(story) {
  if (!record(story) || typeof story.title !== 'string' || !identifier(story.opening)) return 'A game needs a title and opening scene.';
  if (!Array.isArray(story.scenes) || story.scenes.length < 1 || story.scenes.length > MAX_SCENES) return `A game must contain between 1 and ${MAX_SCENES} scenes.`;
  const sceneIds = new Set(), choiceIds = new Set();
  for (const scene of story.scenes) {
    if (!record(scene) || !identifier(scene.id) || typeof scene.title !== 'string' || typeof scene.text !== 'string' || !Array.isArray(scene.choices)) return 'Every scene needs an ID, title, text and choices.';
    if (sceneIds.has(scene.id)) return 'Scene IDs must be unique.';
    sceneIds.add(scene.id);
    if (scene.type !== undefined && !['scene', 'ending'].includes(scene.type)) return 'Scene type must be scene or ending.';
    for (const choice of scene.choices) {
      if (!record(choice) || !identifier(choice.id) || typeof choice.text !== 'string' || !identifier(choice.target) || !Array.isArray(choice.effects)) return 'Every choice needs an ID, text, destination and effects.';
      if (choiceIds.has(choice.id)) return 'Choice IDs must be unique.';
      choiceIds.add(choice.id);
      if (!choice.effects.every(effect => record(effect) && typeof effect.kind === 'string' && typeof effect.key === 'string')) return 'Choice effects need a kind and key.';
    }
  }
  if (!sceneIds.has(story.opening)) return 'The opening scene does not exist.';
  for (const scene of story.scenes) {
    if (scene.choices.some(choice => !sceneIds.has(choice.target))) return 'Every choice must lead to an existing scene.';
  }
  return null;
}

/** @param {any} story */
export function validStory(story) { return validateStory(story) === null; }
