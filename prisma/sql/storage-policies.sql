-- Who may write to the "listing-photos" bucket (public read, 5 MB, JPEG/PNG/WebP),
-- created by migration 5_listing_photos_bucket. Safe to re-run.
--
-- The website uploads each photo with the signed-in agent's own session (no
-- service key), after checking and re-encoding it on the server. These
-- policies are the storage side of that: only a VERIFIED agent can add files,
-- only under a folder named after their own user id, and only they can remove
-- them. Anyone else (anon, applicants, unlinked accounts) can write nothing.

-- The helper lives in "private", a schema the Data API doesn't expose, so it
-- can't be called as /rest/v1/rpc/... (the policies below still use it).
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
DROP FUNCTION IF EXISTS public.can_upload_listing_photos() CASCADE;

CREATE OR REPLACE FUNCTION private.can_upload_listing_photos() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Agent" a
     WHERE a."userId" = (SELECT auth.uid())::text AND a.verification = 'VERIFIED'
  )
$$;
REVOKE ALL ON FUNCTION private.can_upload_listing_photos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_upload_listing_photos() TO authenticated;

DROP POLICY IF EXISTS "Verified agents add listing photos to their own folder" ON storage.objects;
CREATE POLICY "Verified agents add listing photos to their own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND private.can_upload_listing_photos()
  );

DROP POLICY IF EXISTS "Agents see their own listing photo files" ON storage.objects;
CREATE POLICY "Agents see their own listing photo files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Agents remove their own listing photos" ON storage.objects;
CREATE POLICY "Agents remove their own listing photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- No UPDATE policy: a photo is never overwritten in place (each upload gets a new random name).
