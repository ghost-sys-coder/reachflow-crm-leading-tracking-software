-- Add image URL columns
ALTER TABLE public.profiles       ADD COLUMN avatar_url text;--> statement-breakpoint
ALTER TABLE public.organizations  ADD COLUMN logo_url   text;--> statement-breakpoint

-- Storage buckets (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

INSERT INTO storage.buckets (id, name, public)
  VALUES ('logos', 'logos', true)
  ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

-- ── Avatar policies ──────────────────────────────────────────────
-- path pattern: avatars/{user_id}/avatar.<ext>

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');--> statement-breakpoint

CREATE POLICY "avatars_user_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );--> statement-breakpoint

CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );--> statement-breakpoint

CREATE POLICY "avatars_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );--> statement-breakpoint

-- ── Logo policies ─────────────────────────────────────────────────
-- path pattern: logos/{org_id}/logo.<ext>

CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');--> statement-breakpoint

CREATE POLICY "logos_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = (storage.foldername(name))[1]::uuid
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );--> statement-breakpoint

CREATE POLICY "logos_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = (storage.foldername(name))[1]::uuid
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );--> statement-breakpoint

CREATE POLICY "logos_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos'
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = (storage.foldername(name))[1]::uuid
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );--> statement-breakpoint
