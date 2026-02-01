-- Add "Imported" category to the categories table
-- Run this SQL script to add the category to your existing database
INSERT INTO categories (user_id, name, type, color, icon)
SELECT 1,
    'Imported',
    'expense',
    '#9ca3af',
    '📥'
WHERE NOT EXISTS (
        SELECT 1
        FROM categories
        WHERE name = 'Imported'
            AND user_id = 1
    );
-- Verify the category was added
SELECT *
FROM categories
WHERE name = 'Imported';