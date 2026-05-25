// Single source of truth for class catalog — prices and metadata.
// Import this everywhere instead of duplicating the object.

export const CLASS_CATALOG = {
  private_basic_lesson: { title: 'Private Basic Makeup Lesson', duration: '1.5 hours',       price: 300  },
  virtual_lesson:       { title: 'Virtual Makeup Lesson',        duration: '2 hours',          price: 400  },
  intermediate_lesson:  { title: 'Intermediate Makeup Lesson',   duration: '2.5 hours',        price: 500  },
  glam_class:           { title: 'Glam Makeup Class',            duration: '3 hours',          price: 600  },
  masterclass:          { title: 'Makeup Masterclass',           duration: '4 hours · 2 days', price: 1500 },
};

export const CLASS_KEYS = Object.keys(CLASS_CATALOG);
