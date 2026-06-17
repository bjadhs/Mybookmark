INSERT INTO categories (id, name) VALUES
  ('cat_myapp', 'MyApp'),
  ('cat_tut', 'Tut'),
  ('cat_dev', 'Dev'),
  ('cat_design', 'Design'),
  ('cat_read', 'Read'),
  ('cat_git', 'Git')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookmarks (id, title, domain, url, category_id, description, c1, c2, fg, glyph, mins, last_visit, visits)
VALUES
  ('figma', 'Figma', 'figma.com', 'https://figma.com', 'cat_design', 'Collaborative interface design, prototyping, and dev handoff — all in the browser.', '#a259ff', '#f24e1e', '#ffffff', 'F', 120, '2h ago', 142),
  ('github', 'GitHub', 'github.com', 'https://github.com', 'cat_dev', 'Where the world builds software — host, review, and ship code together.', '#9aa3ad', '#d0d7de', '#161616', 'G', 1440, '1d ago', 210),
  ('stripe', 'Stripe', 'stripe.com', 'https://stripe.com', 'cat_design', 'Payments infrastructure for the internet — used by millions of businesses.', '#635bff', '#00d4ff', '#ffffff', 'S', 4320, '3d ago', 64)
ON CONFLICT (id) DO NOTHING;
