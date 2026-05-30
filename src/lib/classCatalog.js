// Single source of truth for class catalog — prices and metadata.
// Import this everywhere instead of duplicating the object.

export const CLASS_CATALOG = {
  private_basic_lesson: { title: 'Basic Makeup Lesson',    duration: '2 hours',          price: 300  },
  masterclass:          { title: 'Advanced Makeup Lesson', duration: '4 hours · 2 days', price: 1500 },
};

export const CLASS_KEYS = Object.keys(CLASS_CATALOG);
