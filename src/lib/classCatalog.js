// Single source of truth for class catalog — prices and metadata.
// Import this everywhere instead of duplicating the object.

export const CLASS_CATALOG = {
  private_basic_lesson: { title: 'Beginner Makeup Lesson',          duration: '3 hours', price: 500  },
  masterclass:          { title: 'Advanced Makeup Artist Training', duration: '6 hours', price: 1400 },
};

export const CLASS_KEYS = Object.keys(CLASS_CATALOG);
