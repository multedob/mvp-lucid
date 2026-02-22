
ALTER TABLE structural_model_disclosures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disclosures_select_all" ON structural_model_disclosures FOR SELECT USING (true);
