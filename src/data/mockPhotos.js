export const EVENT_CATEGORIES = {
  WEDDING: 'wedding',
  FESTIVAL: 'festival',
  TRAVEL: 'travel',
  CASUAL: 'casual'
};

export const EVENTS = [
  {
    id: 'evt_1',
    name: "Emma & David's Wedding",
    location: "Napa Valley, CA",
    date: "June 14, 2026",
    category: EVENT_CATEGORIES.WEDDING
  },
  {
    id: 'evt_2',
    name: "Summer Beats Festival",
    location: "Austin, TX",
    date: "May 22, 2026",
    category: EVENT_CATEGORIES.FESTIVAL
  },
  {
    id: 'evt_3',
    name: "Coastline Roadtrip",
    location: "Big Sur, CA",
    date: "April 08, 2026",
    category: EVENT_CATEGORIES.TRAVEL
  },
  {
    id: 'evt_4',
    name: "Weekend Brunch & Hangs",
    location: "Brooklyn, NY",
    date: "May 10, 2026",
    category: EVENT_CATEGORIES.CASUAL
  }
];

export const MOCK_PHOTOS = [
  // Wedding Matches
  {
    id: 'photo_w1',
    eventId: 'evt_1',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800',
    description: 'Everyone raising a toast to the newlyweds during the reception dinner.',
    matchedCount: 5,
    matchPercentage: 98,
    tags: ['Toast', 'Reception', 'Friends']
  },
  {
    id: 'photo_w2',
    eventId: 'evt_1',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    description: 'Beautiful shot of the outdoor dance floor with fairy lights overhead.',
    matchedCount: 3,
    matchPercentage: 94,
    tags: ['Dance', 'Celebration', 'Evening']
  },
  {
    id: 'photo_w3',
    eventId: 'evt_1',
    url: 'https://images.unsplash.com/photo-1519225495810-7512c696505a?auto=format&fit=crop&q=80&w=800',
    description: 'Candid photo of the laughter at Table 4 during the speeches.',
    matchedCount: 4,
    matchPercentage: 89,
    tags: ['Table 4', 'Candid', 'Laughter']
  },

  // Festival Matches
  {
    id: 'photo_f1',
    eventId: 'evt_2',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800',
    description: 'Confetti explosion at the main stage during the headliner performance.',
    matchedCount: 6,
    matchPercentage: 96,
    tags: ['Main Stage', 'Confetti', 'Crowd']
  },
  {
    id: 'photo_f2',
    eventId: 'evt_2',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
    description: 'Group photo near the neon lighting installations by the entrance.',
    matchedCount: 2,
    matchPercentage: 92,
    tags: ['Neon Art', 'Group', 'Night']
  },
  {
    id: 'photo_f3',
    eventId: 'evt_2',
    url: 'https://images.unsplash.com/photo-1505232458729-26417ff63c97?auto=format&fit=crop&q=80&w=800',
    description: 'Dancing under the sun during the afternoon electronic set.',
    matchedCount: 4,
    matchPercentage: 87,
    tags: ['DJ Set', 'Sunset', 'Energy']
  },

  // Roadtrip Matches
  {
    id: 'photo_t1',
    eventId: 'evt_3',
    url: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&q=80&w=800',
    description: 'Group standing at the scenic overlook watching the sunset over the Pacific.',
    matchedCount: 3,
    matchPercentage: 97,
    tags: ['Ocean', 'Sunset', 'Adventure']
  },
  {
    id: 'photo_t2',
    eventId: 'evt_3',
    url: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=800',
    description: 'Checking the route map and planning the next stop by the forest trail.',
    matchedCount: 1,
    matchPercentage: 91,
    tags: ['Hiking', 'Redwoods', 'Map']
  },
  {
    id: 'photo_t3',
    eventId: 'evt_3',
    url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800',
    description: 'Unpacking the trunk and setting up camp before stargazing.',
    matchedCount: 2,
    matchPercentage: 85,
    tags: ['Campsite', 'Gear', 'Prep']
  },

  // Casual Matches
  {
    id: 'photo_c1',
    eventId: 'evt_4',
    url: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&q=80&w=800',
    description: 'Passing around the sourdough pizzas at the backyard table.',
    matchedCount: 4,
    matchPercentage: 95,
    tags: ['Pizza', 'Backyard', 'Brunch']
  },
  {
    id: 'photo_c2',
    eventId: 'evt_4',
    url: 'https://images.unsplash.com/photo-1485182708500-e8f1f318ba72?auto=format&fit=crop&q=80&w=800',
    description: 'Engaged in deep conversation and sharing laughs on the patio.',
    matchedCount: 2,
    matchPercentage: 90,
    tags: ['Coffee', 'Candid', 'Laughter']
  },
  {
    id: 'photo_c3',
    eventId: 'evt_4',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
    description: 'Fun group photo taken with the Polaroid camera on the steps.',
    matchedCount: 3,
    matchPercentage: 88,
    tags: ['Polaroid', 'Smile', 'Steps']
  }
];

// High quality mock avatars that represent the user snapping a selfie (in case they don't have a camera or choose one of the pre-set avatars)
export const MOCK_AVATARS = [
  {
    id: 'av_1',
    name: 'Sophia (Wedding Guest)',
    gender: 'female',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
    category: EVENT_CATEGORIES.WEDDING
  },
  {
    id: 'av_2',
    name: 'Liam (Festival Goer)',
    gender: 'male',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
    category: EVENT_CATEGORIES.FESTIVAL
  },
  {
    id: 'av_3',
    name: 'Maya (Explorer)',
    gender: 'female',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    category: EVENT_CATEGORIES.TRAVEL
  },
  {
    id: 'av_4',
    name: 'Ethan (Casual Friend)',
    gender: 'male',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    category: EVENT_CATEGORIES.CASUAL
  }
];
