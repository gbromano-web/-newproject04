"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { getSession, supabaseServer } from "@/lib/server/agent-session";
import {
  AGENT_STATUSES, ListingError, MAX_PHOTOS, addPhoto, countryOfLicence, createListing, isLive, listingPhotos, movePhoto, photoCount,
  readValues, removePhotoRow, setCaption, setStatus, updateListing, validate, type AgentStatus, type EditablePhoto, type ListingValues,
} from "@/lib/server/listing-editor";
import { PHOTO_PROBLEM, processPhoto } from "@/lib/server/photo-processing";
import { ipHash, log, rateLimit } from "@/lib/server/request";

/**
 * The agent dashboard's listing actions. Server actions can be called by
 * anyone who can reach the site, so each one re-checks the signed-in agent and
 * that the listing belongs to them; ids from the browser are never trusted on
 * their own.
 */

export type ListingFormState = { error?: string; field?: keyof ListingValues; ok?: string; values?: ListingValues };
export type PhotoState = { error?: string; photos?: EditablePhoto[] };

const BUCKET = "listing-photos";
const ID = /^[A-Za-z0-9_-]{1,64}$/;

async function actor() {
  const session = await getSession();
  if (!session?.agent) return null;
  return {
    agentId: session.agent.id,
    userId: session.userId,
    country: countryOfLicence(session.agent.licenseType),
    verified: session.agent.verification === "VERIFIED",
    ipHash: ipHash({ headers: await headers() }),
  };
}

const SIGNED_OUT = "Your session has ended. Sign in again to keep editing.";

/** Home pages cache their newest listings; refresh them when a live listing changes. */
function refresh(id: string, wasOrIsLive: boolean) {
  if (wasOrIsLive) updateTag("listings");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/listings/${id}`);
}

export async function saveListing(_: ListingFormState, form: FormData): Promise<ListingFormState> {
  const a = await actor();
  if (!a) return { error: SIGNED_OUT };
  const values = readValues(form);
  const id = String(form.get("id") ?? "");
  if (id && !ID.test(id)) return { error: "That listing could not be found.", values };
  const limit = await rateLimit(`listing:save:${a.agentId}`, 120, 60 * 60_000);
  if (!limit.ok) return { error: "Too many changes in an hour. Please wait a few minutes.", values };

  const checked = validate(values, a.country);
  if ("error" in checked) return { error: checked.error, field: checked.field, values };

  let newId: string | null = null;
  try {
    if (id) {
      const before = await isLive(id);
      if (!(await updateListing(a, id, checked.ok))) return { error: "That listing could not be found.", values };
      refresh(id, before);
    } else {
      newId = await createListing(a, checked.ok);
    }
  } catch (e) {
    if (e instanceof ListingError) return { error: e.message, field: e.field ?? undefined, values };
    log("error", "listing.save_failed", { agentId: a.agentId, error: e instanceof Error ? e.message : String(e) });
    return { error: "The listing could not be saved. Please try again in a moment.", values };
  }
  if (newId) {
    log("info", "listing.created", { agentId: a.agentId, listingId: newId });
    redirect(`/dashboard/listings/${newId}?created=1`);
  }
  log("info", "listing.updated", { agentId: a.agentId, listingId: id });
  return { ok: "Changes saved.", values };
}

const STATUS_DONE: Record<AgentStatus, string> = {
  ACTIVE: "Published.",
  DRAFT: "Moved back to drafts. It is no longer on the site.",
  PAUSED: "Paused. It is hidden from the site until you publish it again.",
  SOLD: "Marked as sold. It is no longer on the site.",
  RENTED: "Marked as rented. It is no longer on the site.",
};

export async function changeStatus(_: { error?: string; ok?: string }, form: FormData): Promise<{ error?: string; ok?: string }> {
  const a = await actor();
  if (!a) return { error: SIGNED_OUT };
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as AgentStatus;
  if (!ID.test(id) || !(AGENT_STATUSES as readonly string[]).includes(status)) return { error: "That change isn't possible." };
  const limit = await rateLimit(`listing:save:${a.agentId}`, 120, 60 * 60_000);
  if (!limit.ok) return { error: "Too many changes in an hour. Please wait a few minutes." };
  try {
    const before = await isLive(id);
    const r = await setStatus(a, id, status);
    if (r === "missing") return { error: "That listing could not be found." };
    if (r === "no_photos") return { error: "Add at least one photo before publishing." };
    if (typeof r === "object") {
      return { error: `Your ${r.plan} plan includes ${r.limit} live listings. Pause or close one, or change your plan in Billing, to publish this one.` };
    }
    refresh(id, before || status === "ACTIVE");
  } catch (e) {
    if (e instanceof ListingError) return { error: e.message };
    log("error", "listing.status_failed", { agentId: a.agentId, error: e instanceof Error ? e.message : String(e) });
    return { error: "The change could not be saved. Please try again in a moment." };
  }
  log("info", "listing.status_changed", { agentId: a.agentId, listingId: id, status });
  if (status === "ACTIVE" && !a.verified) return { ok: "Published. It goes live on the site once your licence is verified." };
  return { ok: STATUS_DONE[status] };
}

async function photosOf(id: string): Promise<EditablePhoto[]> {
  return listingPhotos(id, "Listing photo");
}

/** One photo, already shrunk by the browser. Checked, re-encoded and stored under the agent's own folder. */
export async function uploadPhoto(form: FormData): Promise<PhotoState> {
  const a = await actor();
  if (!a) return { error: SIGNED_OUT };
  if (!a.verified) return { error: "Photos can be added once your licence is verified." };
  const id = String(form.get("id") ?? "");
  const file = form.get("photo");
  if (!ID.test(id) || !(file instanceof File)) return { error: "Choose a photo to upload." };
  const count = await photoCount(a.agentId, id);
  if (count === null) return { error: "That listing could not be found." };
  if (count >= MAX_PHOTOS) return { error: `A listing can have up to ${MAX_PHOTOS} photos. Remove one to add another.` };
  const limit = await rateLimit(`listing:photo:${a.agentId}`, 300, 60 * 60_000);
  if (!limit.ok) return { error: "Too many uploads in an hour. Please wait a few minutes." };

  const result = await processPhoto(Buffer.from(await file.arrayBuffer()));
  if ("problem" in result) {
    log("info", "listing.photo_refused", { agentId: a.agentId, reason: result.problem });
    return { error: PHOTO_PROBLEM[result.problem] };
  }
  const sb = await supabaseServer();
  if (!sb) return { error: "Photo uploads are unavailable right now." };
  // The first folder is the agent's own user id: the storage policy only lets them write there
  const key = `${a.userId}/${id}/${randomUUID()}.webp`;
  const { error } = await sb.storage.from(BUCKET).upload(key, result.ok.data, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) {
    log("error", "listing.photo_upload_failed", { agentId: a.agentId, error: error.message });
    return { error: "The photo could not be saved. Please try again in a moment." };
  }
  const before = await isLive(id);
  await addPhoto(a, id, key, result.ok.width, result.ok.height);
  refresh(id, before);
  return { photos: await photosOf(id) };
}

export async function removePhoto(photoId: string): Promise<PhotoState> {
  const a = await actor();
  if (!a) return { error: SIGNED_OUT };
  if (!ID.test(photoId)) return { error: "That photo could not be found." };
  const removed = await removePhotoRow(a, photoId);
  if (!removed) return { error: "That photo could not be found." };
  // Files outside the agent's folder (e.g. added by an admin) stay; the policy would refuse them anyway
  if (removed.key.startsWith(`${a.userId}/`)) {
    const sb = await supabaseServer();
    const { error } = (await sb?.storage.from(BUCKET).remove([removed.key])) ?? { error: null };
    if (error) log("warn", "listing.photo_delete_failed", { agentId: a.agentId, error: error.message });
  }
  refresh(removed.propertyId, await isLive(removed.propertyId));
  return { photos: await photosOf(removed.propertyId) };
}

export async function arrangePhoto(photoId: string, to: "up" | "down" | "cover"): Promise<PhotoState> {
  const a = await actor();
  if (!a) return { error: SIGNED_OUT };
  if (!ID.test(photoId) || !["up", "down", "cover"].includes(to)) return { error: "That photo could not be found." };
  const propertyId = await movePhoto(a, photoId, to);
  if (!propertyId) return { error: "That photo could not be found." };
  refresh(propertyId, await isLive(propertyId));
  return { photos: await photosOf(propertyId) };
}

export async function captionPhoto(photoId: string, caption: string): Promise<PhotoState> {
  const a = await actor();
  if (!a) return { error: SIGNED_OUT };
  const clean = String(caption ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!ID.test(photoId) || /<|>/.test(clean)) return { error: "Captions can't contain < or >." };
  const propertyId = await setCaption(a, photoId, clean);
  if (!propertyId) return { error: "That photo could not be found." };
  refresh(propertyId, await isLive(propertyId));
  return { photos: await photosOf(propertyId) };
}
