-- REQUIRED IN SUPABASE SQL EDITOR: guarded transactional duplicate merge.
CREATE OR REPLACE FUNCTION public.merge_duplicate_prospects(p_candidate_id uuid,p_target_id uuid) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE c public.duplicate_candidates%ROWTYPE; source_id uuid; source_row jsonb; counts jsonb;
BEGIN
 SELECT * INTO c FROM public.duplicate_candidates WHERE id=p_candidate_id AND status='pending' FOR UPDATE;
 IF c.id IS NULL OR p_target_id NOT IN(c.prospect_a_id,c.prospect_b_id) THEN RAISE EXCEPTION 'Invalid duplicate candidate'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organization_members WHERE org_id=c.org_id AND user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 source_id:=CASE WHEN p_target_id=c.prospect_a_id THEN c.prospect_b_id ELSE c.prospect_a_id END;
 SELECT to_jsonb(p) INTO source_row FROM public.prospects p WHERE id=source_id AND org_id=c.org_id FOR UPDATE;
 PERFORM 1 FROM public.prospects WHERE id=p_target_id AND org_id=c.org_id FOR UPDATE;
 IF source_row IS NULL THEN RAISE EXCEPTION 'Source prospect not found'; END IF;
 counts:=jsonb_build_object('messages',(SELECT count(*) FROM public.messages WHERE prospect_id=source_id),'tasks',(SELECT count(*) FROM public.tasks WHERE prospect_id=source_id),'deals',(SELECT count(*) FROM public.deals WHERE prospect_id=source_id));
 DELETE FROM public.campaign_prospects s USING public.campaign_prospects t WHERE s.prospect_id=source_id AND t.prospect_id=p_target_id AND s.campaign_id=t.campaign_id;
 DELETE FROM public.prospect_tags s USING public.prospect_tags t WHERE s.prospect_id=source_id AND t.prospect_id=p_target_id AND s.tag_id=t.tag_id;
 DELETE FROM public.custom_field_values s USING public.custom_field_values t WHERE s.prospect_id=source_id AND t.prospect_id=p_target_id AND s.definition_id=t.definition_id;
 UPDATE public.messages SET prospect_id=p_target_id WHERE prospect_id=source_id; UPDATE public.tasks SET prospect_id=p_target_id WHERE prospect_id=source_id; UPDATE public.deals SET prospect_id=p_target_id WHERE prospect_id=source_id;
 UPDATE public.prospect_attributions SET prospect_id=p_target_id,is_original=false WHERE prospect_id=source_id; UPDATE public.campaign_prospects SET prospect_id=p_target_id WHERE prospect_id=source_id; UPDATE public.prospect_tags SET prospect_id=p_target_id WHERE prospect_id=source_id;
 UPDATE public.custom_field_values SET prospect_id=p_target_id WHERE prospect_id=source_id; UPDATE public.activity_log SET prospect_id=p_target_id WHERE prospect_id=source_id; UPDATE public.generation_logs SET prospect_id=p_target_id WHERE prospect_id=source_id;
 UPDATE public.import_batch_rows SET prospect_id=p_target_id WHERE prospect_id=source_id; UPDATE public.consent_records SET prospect_id=p_target_id WHERE prospect_id=source_id; UPDATE public.privacy_requests SET prospect_id=p_target_id WHERE prospect_id=source_id;
 UPDATE public.suppression_entries SET prospect_id=p_target_id WHERE prospect_id=source_id; UPDATE public.prospect_sequences SET prospect_id=p_target_id WHERE prospect_id=source_id; DELETE FROM public.prospect_scores WHERE prospect_id=source_id;
 DELETE FROM public.duplicate_candidates WHERE org_id=c.org_id AND id<>c.id AND (prospect_a_id=source_id OR prospect_b_id=source_id);
 UPDATE public.duplicate_candidates SET status='merged',reviewed_by=auth.uid(),reviewed_at=now() WHERE id=c.id;
 INSERT INTO public.prospect_merge_log(org_id,source_prospect_id,target_prospect_id,source_snapshot,relationship_counts,merged_by) VALUES(c.org_id,source_id,p_target_id,source_row,counts,auth.uid());
 DELETE FROM public.prospects WHERE id=source_id;
END $$;
REVOKE ALL ON FUNCTION public.merge_duplicate_prospects(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_prospects(uuid,uuid) TO authenticated;
