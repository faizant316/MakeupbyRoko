// Single source of truth for class catalog — prices and metadata.
// Import this everywhere instead of duplicating the object.

export const CLASS_CATALOG = {
  private_basic_lesson: { title: 'Beginner Makeup Lesson',          duration: '3 hours', price: 500  },
  masterclass:          { title: 'Advanced Makeup Artist Training', duration: '6 hours', price: 1400 },
};

export const CLASS_KEYS = Object.keys(CLASS_CATALOG);

// Display map for admin surfaces. Uses the live catalog titles/prices, plus the
// legacy class keys that may still exist on older registration rows so those
// rows keep rendering a sensible label and price. Import this instead of
// re-hardcoding label/price maps in each admin component.
export const CLASS_DISPLAY = {
  ...CLASS_CATALOG,
  virtual_lesson:      { title: 'Virtual Makeup Lesson',      duration: '',        price: 400 },
  intermediate_lesson: { title: 'Intermediate Makeup Lesson', duration: '',        price: 500 },
  glam_class:          { title: 'Glam Makeup Class',          duration: '',        price: 600 },
};

export const CLASS_DISPLAY_KEYS = Object.keys(CLASS_DISPLAY);
