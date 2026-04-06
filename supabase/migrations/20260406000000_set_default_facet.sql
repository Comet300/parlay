CREATE OR REPLACE FUNCTION set_default_facet(p_form_id uuid, p_facet_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE facets SET is_default = false WHERE form_id = p_form_id;
  UPDATE facets SET is_default = true WHERE id = p_facet_id AND form_id = p_form_id;
END;
$$;
