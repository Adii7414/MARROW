export interface Article {
  slug: string;
  title: string;
  dek: string;
  topic: string;
  date: string;
  minutes: number;
  image: string;
  alt: string;
  body: string[];
  pull: string;
}

export const ARTICLES: Article[] = [
  {
    slug: 'the-quiet-edge',
    title: 'The Quiet Edge: Why Our Wingtips Rake',
    dek: 'A winglet is an answer. A raked tip is a better question.',
    topic: 'Geometry',
    date: '12 Nov 2026',
    minutes: 8,
    image: 'https://images.fillout.com/924528/ewywqhgymh/generated-images/t6dF2uAKsJj3dZ8EbE4rP7/img_LvxuT2xjzF21-ZBq.jpg',
    alt: 'Raked wingtip against a pale dawn sky',
    pull: 'We did not want to bolt a solution onto the end of the wing. We wanted the wing to end correctly.',
    body: [
      'Every wing sheds a vortex from its tip: air spilling from the high-pressure underside to the low-pressure crown. That spiral costs fuel on every kilometre of every flight. The industry’s habit has been to stand a small fin at the tip — the winglet — to block it.',
      'The M01 wing instead continues outward, sweeping more sharply over its last 2.8 metres until the chord tapers to a single metre. The raked tip spreads the vortex over a longer edge and moves its core further outboard, which is what the winglet was trying to do in the first place.',
      'It is quieter, too. Without a vertical surface at the tip there is one fewer edge for gusts to excite and one fewer joint to inspect. The structure is continuous: the same carbon skin, the same spars, simply allowed to finish.',
      'On the drawing board the difference is a few lines. In the hangar it is a wing that looks like it was meant to end where it does — which is, in the end, what we mean by form.',
    ],
  },
  {
    slug: 'materials-that-remember',
    title: 'Materials That Remember',
    dek: 'Carbon fibre has a memory. We design for it.',
    topic: 'Materials',
    date: '28 Oct 2026',
    minutes: 6,
    image: 'https://images.fillout.com/924528/ewywqhgymh/generated-images/qu2b3XikNGF97P2CFnrbV3/img_5J_GoZeyoXDnb9uM.jpg',
    alt: 'Macro of woven carbon fibre composite',
    pull: 'A composite part is not cut from a material. It is a material, written down in the order its plies were laid.',
    body: [
      'Aluminium forgets. Bend it and it springs back or yields; either way the sheet has no opinion about where it came from. Carbon composite is different. It remembers the direction of every ply and the temperature of every cure.',
      'For the M-series barrel we lay fibres by robot in 0°, ±45° and 90° directions, stacked so the skin is stiff where the loads run and forgiving where they do not. A frame never needs to be stronger than the ply schedule beneath it.',
      'The cost of that memory is honesty. Damage can hide below an unmarked surface, so every M01 panel carries an embedded fibre-optic strand that reports strain to the aircraft’s health monitor (concept).',
      'We think of it as a material that keeps a diary. Our job is to read it.',
    ],
  },
  {
    slug: 'drawing-in-pressure',
    title: 'Drawing in Pressure',
    dek: 'Notes on the section that carries everything.',
    topic: 'Aerodynamics',
    date: '9 Oct 2026',
    minutes: 7,
    image: 'https://images.fillout.com/924528/ewywqhgymh/generated-images/wChuJX1vJztVh6obmnF9ir/img_AuOJxkloCB4VHbLc.jpg',
    alt: 'Ink drawing of an airfoil section',
    pull: 'The aerofoil is the only drawing on the aircraft that the air reads directly.',
    body: [
      'We still begin by hand. A soft pencil, a long sheet, and one section of the wing drawn at full chord until the curve of the crown feels inevitable.',
      'The M-series section is flat-topped and aft-loaded. Air accelerates across the long, gentle crown without forming a shock, then hands its pressure back over a cusped trailing edge. The result is a thinner wing for the same lift — lighter, and with more room for fuel between the spars.',
      'Only then does the computer take over, lofting dozens of these sections from root to tip, twisting each one a few tenths of a degree so the whole wing stalls gracefully from the root outward.',
    ],
  },
  {
    slug: 'twenty-two-blades',
    title: 'Twenty-Two Blades',
    dek: 'Inside the fan that moves nine-tenths of the air.',
    topic: 'Propulsion',
    date: '21 Sep 2026',
    minutes: 9,
    image: 'https://images.fillout.com/924528/ewywqhgymh/generated-images/1Lhe9PxAujLm88A1P8CC1U/img_d23ST-BfgF1ETBg8.jpg',
    alt: 'Close-up of a turbofan fan face in a dark hangar',
    pull: 'An engine is mostly a fan with a small, very hot machine attached to turn it.',
    body: [
      'Look into the inlet of an M01 engine and you see 22 wide-chord blades, each a hollow titanium shell with a woven composite leading edge. Behind them, almost invisible, is the core: a pencil of compressor, combustor and turbine.',
      'Nine-tenths of the air the fan moves never enters that core. It is simply pushed backwards, slowly and in great volume — the most efficient kind of thrust there is.',
      'Fewer, wider blades mean fewer parts to inspect and a lower tip speed, which is quieter. It also means every blade carries more load, so each one is modelled, numbered and tracked through its life — MP-5000 onward in our part register.',
    ],
  },
  {
    slug: 'the-long-table',
    title: 'The Long Table',
    dek: 'How a design house that builds aircraft spends a Tuesday.',
    topic: 'Studio',
    date: '2 Sep 2026',
    minutes: 5,
    image: 'https://images.fillout.com/924528/ewywqhgymh/generated-images/txkCMnfumNWaBkiRfwyUaL/img_g4e4JSyvYbS6KYic.jpg',
    alt: 'Design studio with a white scale aircraft model on a long table',
    pull: 'Engineers and designers share one table. The model sits in the middle so nobody can forget what it is for.',
    body: [
      'Our studio has one long table. At one end, aerodynamicists; at the other, industrial designers; along the sides, everyone else. A 1:50 white model of whatever we are working on sits in the middle.',
      'Decisions are made standing up, around the model, with a pencil. We have found that if an idea cannot be explained by pointing at the object, it is usually not finished.',
      'It is an old way of working. We keep it because the aircraft we draw will fly for thirty years, and the conversations that shape them should be the kind people remember.',
    ],
  },
  {
    slug: 'smoke-and-mirrors',
    title: 'Smoke, Lines and Honesty',
    dek: 'What the wind tunnel can tell you — and what it cannot.',
    topic: 'Research',
    date: '14 Aug 2026',
    minutes: 6,
    image: 'https://images.fillout.com/924528/ewywqhgymh/generated-images/xgYxbvoPwkaxQxNeofomJr/img_QNEjrYDf2Dx02xaa.jpg',
    alt: 'White wing model in a wind tunnel with smoke lines',
    pull: 'A streamline is a promise the air makes for exactly as long as it is convenient.',
    body: [
      'Smoke in a tunnel draws the flow the way pencil draws a curve: confidently, and only on one plane. It is the most beautiful instrument we own and the easiest to over-trust.',
      'We use it for intuition. Numbers come from pressure taps and balances; validation comes from flight. The illustrated tunnel on this site is a sketch in the same spirit — a teaching drawing, not a solver.',
      'The best thing the smoke shows is the moment it lets go. Past the stall, the lines over the crown tear away and curl. Every wing we draw is designed to delay that moment, and to make it gentle when it comes.',
    ],
  },
];
