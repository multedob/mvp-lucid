ALTER TABLE public.pill_content_variations
DROP CONSTRAINT IF EXISTS pill_content_variations_locale_check;

ALTER TABLE public.pill_content_variations
ADD CONSTRAINT pill_content_variations_locale_check
CHECK (locale = ANY (ARRAY['en'::text, 'pt'::text, 'pt-BR'::text, 'es'::text]));

ALTER TABLE public.questionnaire_content_variations
DROP CONSTRAINT IF EXISTS questionnaire_content_variations_locale_check;

ALTER TABLE public.questionnaire_content_variations
ADD CONSTRAINT questionnaire_content_variations_locale_check
CHECK (locale = ANY (ARRAY['en'::text, 'pt'::text, 'pt-BR'::text, 'es'::text]));