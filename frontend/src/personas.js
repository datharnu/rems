/**
 * Four hand-crafted demo personas. Each one is behaviorally distinct
 * so judges can flip between them and see Rems produce drastically
 * different reviews & recommendations for the same item.
 */
export const PERSONAS = {
  tunde: {
    key: 'tunde',
    name: 'Tunde A.',
    role: 'Enthusiastic foodie',
    blurb: 'Loves Nigerian food, generous with 4–5 stars, uses pidgin.',
    reviews: [
      {
        stars: 5,
        text: "Mehn this place is the real deal. The suya was smoky and well-spiced, exactly how I love it. No be small thing o, I'm coming back next week with my whole crew.",
        categories: ['Nigerian', 'BBQ'],
        businessName: 'Glover Court Suya',
      },
      {
        stars: 5,
        text: 'Amazing experience from start to finish. The jollof rice had that smoky party taste, the chicken was perfectly grilled, and the staff treated us like family. Easily one of my top 3 Lagos spots.',
        categories: ['Nigerian', 'Restaurant'],
        businessName: 'Yellow Chilli',
      },
      {
        stars: 4,
        text: "Correct place abeg. Pepper soup was rich and spicy, plantain was on point. Took off one star because the wait was longer than I'd like, but I'll still recommend.",
        categories: ['Nigerian', 'Restaurant'],
        businessName: 'Terra Kulture',
      },
      {
        stars: 5,
        text: "On God this is the best shawarma in Lekki. Fresh ingredients, generous wrap, reasonable price. I love that they're consistent — every single time I come, same quality.",
        categories: ['Shawarma', 'Fast Food'],
        businessName: 'Shawarma Republic',
      },
      {
        stars: 4,
        text: 'Cosy spot, great for a chill evening. The asun was peppery in the best way and the drinks came cold. Will absolutely be back with my partner.',
        categories: ['Lounge', 'Nigerian', 'Bar'],
        businessName: 'RSVP',
      },
    ],
  },

  amaka: {
    key: 'amaka',
    name: 'Amaka O.',
    role: 'Critical reviewer',
    blurb: 'Picky, detailed, leans 2–3 stars. Writes long reviews.',
    reviews: [
      {
        stars: 2,
        text: 'Honestly disappointed. The portions were tiny and the service was painfully slow — we waited 45 minutes for two main courses. For the price they charge, I expected elevated cuisine, not warmed-over basics. The pasta lacked seasoning, the salad was wilted, and the waiter forgot our drinks twice. Never again sha.',
        categories: ['Continental', 'Restaurant'],
        businessName: 'Cactus Restaurant',
      },
      {
        stars: 3,
        text: "It's okay but nothing memorable. The presentation was beautiful, I'll give them that — the plating looked like something from a magazine. But the actual food was bland and underwhelming. The grilled fish needed acid, the rice tasted plain, and the dessert was overly sweet. They need to step up the seasoning game across the board. Will probably not return.",
        categories: ['Fine Dining', 'Restaurant'],
        businessName: 'Sky Restaurant',
      },
      {
        stars: 2,
        text: "What a letdown. This used to be one of my favourite spots — three years ago I would have given them five stars without hesitation. But the quality has dropped significantly. The egusi was watery, the rice tasted like it had been warmed twice, and the meat was tough. Service is still polite but that doesn't excuse the food. Management needs to do better, urgently.",
        categories: ['Nigerian', 'Restaurant'],
        businessName: 'Bukka Hut',
      },
      {
        stars: 3,
        text: 'A decent cafe but overpriced for what you actually get. The atmosphere is nice and the staff are polite, no complaints there. But the coffee was lukewarm both times I visited, and the avocado toast was just bread and avocado — no thoughtfulness, no extra elements. Two stars for the lukewarm coffee, one star bumped up for the comfortable chairs and decent wifi.',
        categories: ['Cafe', 'Continental'],
        businessName: 'Cafe Neo',
      },
    ],
  },

  chinedu: {
    key: 'chinedu',
    name: 'Chinedu E.',
    role: 'Casual rater',
    blurb: 'Short reviews, mid-range ratings, vibes-driven.',
    reviews: [
      {
        stars: 4,
        text: 'Good spot abeg. Suya hit the spot, peppered just right. Will come back.',
        categories: ['BBQ', 'Nigerian'],
        businessName: 'Sailors Lounge',
      },
      {
        stars: 3,
        text: "It's fine. Pizza was warm, no complaints, no wow.",
        categories: ['Fast Food', 'Pizza'],
        businessName: "Domino's Lekki",
      },
      {
        stars: 4,
        text: 'Nice vibe, drinks cold, music right. Solid Friday spot.',
        categories: ['Lounge', 'Bar'],
        businessName: 'Quilox',
      },
      {
        stars: 3,
        text: 'Mid. Burger was okay, fries soggy.',
        categories: ['Fast Food', 'American'],
        businessName: 'The Place',
      },
    ],
  },

  cold: {
    key: 'cold',
    name: 'New User',
    role: 'Cold start',
    blurb: 'Zero history. Tests the agent\'s fallback behavior.',
    reviews: [],
  },
};

export const PERSONA_KEYS = Object.keys(PERSONAS);
