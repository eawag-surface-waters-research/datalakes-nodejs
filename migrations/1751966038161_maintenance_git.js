exports.up = (pgm) => {
  pgm.addColumn('maintenance', {
    state: { type: 'text', notNull: false } // nullable text column
  });
  pgm.addColumn('maintenance', {
    issue: { type: 'text', notNull: false } // nullable text column
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('maintenance', 'state');
  pgm.dropColumn('maintenance', 'issue');
};
