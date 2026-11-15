/**
 * Spoken lines for Eras 7–12. `when` is a hook key for the dialogue strip;
 * the merger binds it later. Lines without a gate still carry a when so a
 * Continue does not have to invent one.
 */

export type HorizonSpeaker = 'nia' | 'maris' | 'edda' | 'listener' | 'arun' | 'ivo' | 'clerk'

export interface HorizonLine {
  id: string
  text: string
  speaker: HorizonSpeaker
  when?: string
}

export const HORIZON_DIALOGUE: HorizonLine[] = [
  { id: 'hz-continue-door', speaker: 'clerk', when: 'continue', text: 'The ration is a door, not a closing time. The counter stays.' },
  { id: 'hz-continue-map', speaker: 'nia', when: 'continue', text: 'Eight worlds are waiting on a survey. I brought a pencil.' },
  { id: 'hz-unseal', speaker: 'clerk', when: 'unseal', text: 'The silence had a latch. Era 7, and a stipend so the first probe is not a rumor.' },
  { id: 'hz-unseal-nia', speaker: 'nia', when: 'unseal', text: 'You stepped away. The map did not. Probe yard is where we left the chalk.' },

  { id: 'hz-first-probe', speaker: 'nia', when: 'first-probe', text: 'Probe is away. The Pantry answers like a shelf that already knows your handwriting.' },
  { id: 'hz-first-probe-clerk', speaker: 'clerk', when: 'first-probe', text: 'Survey ticks whether you watch it or not. The cap is 120. Spend it before it idles.' },

  { id: 'hz-planet-pantry', speaker: 'nia', when: 'planet-pantry', text: 'The Pantry wants canned and staple. Basic is a wish. Five of six will do.' },
  { id: 'hz-planet-cinder', speaker: 'nia', when: 'planet-cinder', text: 'Cinder Market runs hot. Spice and a can. Leave the rice if you must miss one.' },
  { id: 'hz-planet-orchard', speaker: 'edda', when: 'planet-orchard', text: 'Glass Orchard bruises if you look at it. Fresh, sweet, fragile. File the standard and walk.' },
  { id: 'hz-planet-brine', speaker: 'nia', when: 'planet-brine', text: 'Brine Station takes salt twice. Ice twice. The can is the one that does not belong.' },
  { id: 'hz-planet-mercy', speaker: 'nia', when: 'planet-mercy', text: 'Quiet Mercy wants the lamp and the can. Night, quiet, stable. Soap is the miss.' },
  { id: 'hz-planet-ash', speaker: 'maris', when: 'planet-ash', text: 'Ash Dock will take bulk, cheap, hardy. They will also take your flour and rename it.' },
  { id: 'hz-planet-snow', speaker: 'clerk', when: 'planet-snow', text: 'Milk Snow is dairy and cold. Slow is a word on their sign. We do not stock slow.' },
  { id: 'hz-planet-bazaar', speaker: 'arun', when: 'planet-bazaar', text: 'Lantern Bazaar wants brand and small. That is soap, five times. Variety is a story they tell.' },

  { id: 'hz-four-worlds', speaker: 'nia', when: 'four-worlds', text: 'Four worlds stocked. Give the cluster twelve letters. Volume, margin, or fresh.' },
  { id: 'hz-cluster-fresh', speaker: 'edda', when: 'four-worlds', text: 'Fresh means orchard goods turn faster. The tooltip says spoil. I say rent.' },

  { id: 'hz-first-circuit', speaker: 'maris', when: 'first-circuit', text: 'A circuit is three worlds and a good. I already drew it in your font. Rude of me.' },
  { id: 'hz-first-circuit-clerk', speaker: 'clerk', when: 'first-circuit', text: 'Both ends matching is a full score. One end is 0.6. The stop is for the crates, not the glory.' },
  { id: 'hz-keel-convoy', speaker: 'maris', when: 'keel-convoy', text: 'Keel & Sons, on your schedule. A convoy every few minutes. Your fonts, my hulls.' },
  { id: 'hz-keel-convoy-clerk', speaker: 'clerk', when: 'keel-convoy', text: 'Price war costs a nickel of the buyout and freezes them. Buyout folds the convoys in.' },
  { id: 'hz-keel-buyout', speaker: 'maris', when: 'keel-buyout', text: 'You bought the route. I will still wave from the dock. The wage was never the point.' },

  { id: 'hz-season-thaw', speaker: 'edda', when: 'season-0', text: 'Thaw. Sturdy and lasting. Plant like the ground owes you, because it does.' },
  { id: 'hz-season-sun', speaker: 'edda', when: 'season-1', text: 'High Sun. Sweet and pretty. Do not apologize to the fruit.' },
  { id: 'hz-season-harvest', speaker: 'edda', when: 'season-2', text: 'Harvest. Sweet and lasting. The bin is the whole argument.' },
  { id: 'hz-season-dark', speaker: 'edda', when: 'season-3', text: 'Long Dark. Sturdy and pretty. Leave a lamp. The beds still score if you forget to pick.' },
  { id: 'hz-first-planting', speaker: 'edda', when: 'first-planting', text: 'Two parents. Same trait comes back intense. Different traits come back alphabetical, like a filing cabinet.' },
  { id: 'hz-taster-quality', speaker: 'edda', when: 'taster-quality', text: 'Quality. The match runs hotter, capped at a perfect bed. The other fork locks.' },
  { id: 'hz-taster-volume', speaker: 'edda', when: 'taster-volume', text: 'Volume. The match cools, and you get two more plots. I will not pretend that is romance.' },

  { id: 'hz-first-phrase', speaker: 'listener', when: 'first-phrase', text: 'Four marks. Two are already showing. File the modal of the world that sent it, and three of four will hold.' },
  { id: 'hz-first-phrase-clerk', speaker: 'clerk', when: 'first-phrase', text: 'A miss clears the phrase at nothing and waits ninety seconds. The till does not notice.' },
  { id: 'hz-first-agent', speaker: 'listener', when: 'first-agent', text: 'An agent prices, stocks, refiles a route, or plants. They do not buy the ending.' },
  { id: 'hz-agent-wage', speaker: 'clerk', when: 'first-agent', text: 'The wage is the habit. Fire them and the wage stops this tick. A quiet agent writes no line.' },

  { id: 'hz-clause-open', speaker: 'arun', when: 'clause-open-hours', text: 'Open Hours. More demand. Keel grows a little faster. I collect these the way other people collect stamps.' },
  { id: 'hz-clause-cold', speaker: 'arun', when: 'clause-cold-law', text: 'Cold Law. Less spoil. Seed income takes the hit. Read the grudge before you love the help.' },
  { id: 'hz-clause-fair', speaker: 'arun', when: 'clause-fair-stamp', text: 'Fair Stamp. Margin, and no clever commits. It also leaves no room for a boutique.' },
  { id: 'hz-clause-local', speaker: 'arun', when: 'clause-local-shelf', text: 'Local Shelf. The worlds pay more. Freight per planet thins. Three slots. Do not try a fourth.' },
  { id: 'hz-clause-night', speaker: 'arun', when: 'clause-night-bell', text: 'Night Bell. Night sells. Day steps back. The bell is a clause, not a mood.' },
  { id: 'hz-clause-price', speaker: 'arun', when: 'clause-one-price', text: 'One Price. The flagship forgives a wider miss. Venture income pays for the kindness.' },
  { id: 'hz-charter-standard', speaker: 'arun', when: 'charter-standard', text: 'Standard. The network takes the lift. File the standard, and the scores stay at the file.' },
  { id: 'hz-charter-boutique', speaker: 'arun', when: 'charter-boutique', text: 'Boutique. No network gift. A perfect shelf can outrun the file, up to the craft cap.' },

  { id: 'hz-ivo-list', speaker: 'ivo', when: 'ivo-list', text: 'Five lines. You already know how. Shelf, route, crop, phrase, clause. I will wait.' },
  { id: 'hz-ivo-list-clerk', speaker: 'clerk', when: 'ivo-list', text: 'The list is pinned to this save. It will not reroll if you look away.' },
  { id: 'hz-ending-accept', speaker: 'ivo', when: 'ending-accept', text: 'The list is a standing order. New counter is optional. I still only buy one can.' },
  { id: 'hz-ending-reject', speaker: 'ivo', when: 'ending-reject', text: 'Refused twice. I left the can. The plaque can have the rest.' },
  { id: 'hz-endless', speaker: 'nia', when: 'endless', text: 'Past the named eight, the climates repeat and the names run out of poetry. The layer thins. There is no era 13.' },

  { id: 'hz-nia-desk', speaker: 'nia', when: 'nia-desk', text: 'She files worlds the way you file cans. That is me. I am not offended.' },
  { id: 'hz-nia-probe', speaker: 'nia', when: 'nia-desk', text: 'A deputy can launch when you can afford two probes and still have cash left. I will not spend the last tenth.' },
  { id: 'hz-maris-fonts', speaker: 'maris', when: 'maris-fonts', text: 'Their convoys use your fonts. I had them cut that way. Customers trust a letter they have seen.' },
  { id: 'hz-maris-stop', speaker: 'maris', when: 'maris-fonts', text: 'The stop in the middle is where the puzzle lives. The route score does not care. I do.' },
  { id: 'hz-edda-rent', speaker: 'edda', when: 'edda-seed', text: 'I talk to seed like it owes me rent. It pays in traits. Intense is not a bonus until the bed says so.' },
  { id: 'hz-edda-ahead', speaker: 'edda', when: 'edda-seed', text: 'Plant ahead of the turn. An unharvested bed keeps its child and faces the new season.' },
  { id: 'hz-listener-name', speaker: 'listener', when: 'listener-name', text: 'I was hired to hear the orders. The store never gave me another name. That is the whole biography.' },
  { id: 'hz-listener-modal', speaker: 'listener', when: 'listener-name', text: 'Each world has a modal mark. Can, star, wave, leaf, bell, key. Hidden cells like the modal. One of them is lying.' },
  { id: 'hz-arun-stamps', speaker: 'arun', when: 'arun-stamps', text: 'Six clauses, three kept. The first three toggles on a fresh board are free. After that, seal.' },
  { id: 'hz-arun-fork', speaker: 'arun', when: 'arun-stamps', text: 'The fork locks. A later project can reseal it once. I would not plan your life on that.' },

  { id: 'hz-ivo-can-7', speaker: 'ivo', when: 'ivo-can-7', text: 'Ivo bought one can.' },
  { id: 'hz-ivo-can-8', speaker: 'ivo', when: 'ivo-can-8', text: 'One can. I am not here for the convoy. I am here for the can.' },
  { id: 'hz-ivo-can-9', speaker: 'ivo', when: 'ivo-can-9', text: 'The season changed. I still want the can, not the cultivar lecture.' },
  { id: 'hz-ivo-can-10', speaker: 'ivo', when: 'ivo-can-10', text: 'Your signal room is loud. The can was on the shelf. I found it anyway.' },
  { id: 'hz-ivo-can-11', speaker: 'ivo', when: 'ivo-can-11', text: 'Clauses are your hobby. The can is mine.' },
  { id: 'hz-ivo-corner', speaker: 'ivo', when: 'ivo-can-12', text: 'I left a corner of a list under the can. Do not file it yet. I am not done buying.' },

  { id: 'hz-nia-first-probe', speaker: 'nia', when: 'first-probe', text: 'First probe down. The map is not a rumor anymore.' },
  { id: 'hz-maris-first-circuit', speaker: 'maris', when: 'first-circuit', text: 'First circuit filed. I will still pretend the fonts were always yours.' },
  { id: 'hz-edda-vault', speaker: 'edda', when: 'first-vault', text: 'Seed in the vault does not decay. Leave the free seed to the weather if you must.' },
  { id: 'hz-listener-wire', speaker: 'listener', when: 'wire-ad-live', text: 'A wire ad is on. The dish is louder than the till for a minute.' },
  { id: 'hz-arun-seat', speaker: 'arun', when: 'council-seat', text: 'A council seat pays. Scrutiny is the rent.' },
  { id: 'hz-ivo-plaque', speaker: 'ivo', when: 'ivo-plaque', text: 'My name on the wall. I still only buy one can.' },

  { id: 'hz-local-price', speaker: 'clerk', when: 'local-chalk', text: 'A local price follows that world, not the flagship. Leave it blank and the flagship price is the law there too.' },
  { id: 'hz-standard-button', speaker: 'clerk', when: 'first-probe', text: 'File the standard is always on the glass. It is the solve the store will stand behind.' },
  { id: 'hz-headline-ignore', speaker: 'clerk', when: 'headline', text: 'The wire can wait. Ignoring a headline changes nothing, except the ones that say otherwise in the small print.' },
  { id: 'hz-embassy', speaker: 'arun', when: 'embassy', text: 'An embassy is a door that trickles seal. Toggling a clause after the free three spends ten.' },
  { id: 'hz-relay', speaker: 'listener', when: 'first-phrase', text: 'A relay pays even before the first phrase, at the file rate. Then your mean takes over.' },
  { id: 'hz-greenhouse-empty', speaker: 'edda', when: 'first-planting', text: 'An empty greenhouse is half a layer, not a dead click. Plant something before you brag.' },
  { id: 'hz-last-mean', speaker: 'ivo', when: 'ivo-list', text: 'Mean of the five lines. Eight tenths completes it. I am not asking for a perfect hand.' },
]
