-- Temporarily grant INSERT on prompt_versions to authenticated and anon roles for data seeding
GRANT INSERT ON prompt_versions TO anon, authenticated;
GRANT UPDATE ON prompt_versions TO anon, authenticated;