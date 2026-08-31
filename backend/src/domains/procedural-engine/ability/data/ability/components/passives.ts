import { IAbilityPassiveComponent } from "../../../interface.js";

type Passive = IAbilityPassiveComponent;

export const Power1: Passive = { type: "passive", flavor_text: "A modest edge of raw strength.", statModifiers: { strength: 5 } };
export const Power2: Passive = { type: "passive", flavor_text: "Genuine brute force.", statModifiers: { strength: 10 } };
export const Power3: Passive = { type: "passive", flavor_text: "A reservoir of exceptional might.", statModifiers: { strength: 15 } };
export const Power4: Passive = { type: "passive", flavor_text: "Legendary physical power.", statModifiers: { strength: 25 } };

export const Bulk1: Passive = { type: "passive", flavor_text: "A sturdier frame.", statModifiers: { hp: 20 } };
export const Bulk2: Passive = { type: "passive", flavor_text: "A hearty, well-fleshed body.", statModifiers: { hp: 40 } };
export const Bulk3: Passive = { type: "passive", flavor_text: "Remarkable vitality.", statModifiers: { hp: 75 } };
export const Bulk4: Passive = { type: "passive", flavor_text: "Titanic staying power.", statModifiers: { hp: 120 } };

export const Stone1: Passive = { type: "passive", flavor_text: "A firmer, denser body.", statModifiers: { dexterity: 4, hp: 8 } };
export const Stone2: Passive = { type: "passive", flavor_text: "A hardened, enduring physique.", statModifiers: { dexterity: 6, hp: 15 } };
export const Stone3: Passive = { type: "passive", flavor_text: "A bulwark of pure endurance.", statModifiers: { dexterity: 14 } };
export const Stone4: Passive = { type: "passive", flavor_text: "Unbreakable solidity.", statModifiers: { dexterity: 16 } };

export const Focus1: Passive = { type: "passive", flavor_text: "A sharper mind for magic.", statModifiers: { intelligence: 4 } };
export const Focus2: Passive = { type: "passive", flavor_text: "Genuine arcane acuity.", statModifiers: { intelligence: 8 } };
export const Focus3: Passive = { type: "passive", flavor_text: "Profound mastery of the arcane.", statModifiers: { intelligence: 15 } };
export const Focus4: Passive = { type: "passive", flavor_text: "An archmage's mind.", statModifiers: { intelligence: 25 } };

export const Insight1: Passive = { type: "passive", flavor_text: "A keener instinct.", statModifiers: { wisdom: 3 } };
export const Insight2: Passive = { type: "passive", flavor_text: "Genuine insight and perception.", statModifiers: { wisdom: 8 } };
export const Insight3: Passive = { type: "passive", flavor_text: "Profound spiritual resilience.", statModifiers: { wisdom: 14 } };
export const Insight4: Passive = { type: "passive", flavor_text: "Avatar-like clarity.", statModifiers: { wisdom: 20, intelligence: 10 } };

export const Speed1: Passive = { type: "passive", flavor_text: "Quicker on the feet.", statModifiers: { agility: 3 } };
export const Speed2: Passive = { type: "passive", flavor_text: "Genuine swiftness.", statModifiers: { agility: 7 } };
export const Speed3: Passive = { type: "passive", flavor_text: "Blinding speed.", statModifiers: { agility: 12 } };
export const Speed4: Passive = { type: "passive", flavor_text: "The speed of the wind itself.", statModifiers: { agility: 25 } };

export const BulwarkMix: Passive = { type: "passive", flavor_text: "Might that also thickens the flesh.", statModifiers: { strength: 4, hp: 10 } };
export const TitanMix: Passive = { type: "passive", flavor_text: "Brawn and bulk in equal measure.", statModifiers: { strength: 20, hp: 30 } };
export const AegisMix: Passive = { type: "passive", flavor_text: "Vitality bound with endurance.", statModifiers: { hp: 80, dexterity: 10 } };
export const JuggernautMix: Passive = { type: "passive", flavor_text: "Power tempered by a sturdy frame.", statModifiers: { strength: 10, dexterity: 6 } };
export const SageMix: Passive = { type: "passive", flavor_text: "Arcane might joined to insight.", statModifiers: { intelligence: 12, wisdom: 6 } };

export const KeenSensesMix: Passive = { type: "passive", flavor_text: "Perception sharpened with speed.", statModifiers: { wisdom: 6, agility: 4 } };
export const ReflexMix: Passive = { type: "passive", flavor_text: "Endurance married to swiftness.", statModifiers: { agility: 10, dexterity: 6 } };
export const FeatherMix: Passive = { type: "passive", flavor_text: "Swift and nimble footwork.", statModifiers: { agility: 6, dexterity: 4 } };
export const SereneMix: Passive = { type: "passive", flavor_text: "Insight steadied by endurance.", statModifiers: { wisdom: 8, dexterity: 6 } };
export const UntouchableMix: Passive = { type: "passive", flavor_text: "Speed wrapped in resilience.", statModifiers: { agility: 20, hp: 10 } };
