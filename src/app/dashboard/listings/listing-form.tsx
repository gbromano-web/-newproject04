"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import { Message, input, label } from "@/app/agent/forms";
import { marketOf, type CountryCode } from "@/lib/markets";
import type { ListingValues, LocationOption } from "@/lib/server/listing-editor";
import { saveListing, type ListingFormState } from "./actions";

const LISTING_TYPES = ["SALE", "RENT", "PRE_SELLING", "FORECLOSED"] as const;
const PROPERTY_TYPES = ["CONDOMINIUM", "TOWNHOUSE", "HOUSE_AND_LOT", "LOT_ONLY", "COMMERCIAL", "AGRICULTURAL", "WAREHOUSE"] as const;
const FURNISHING: [string, string][] = [["FULLY_FURNISHED", "Fully furnished"], ["SEMI_FURNISHED", "Semi-furnished"], ["UNFURNISHED", "Unfurnished"], ["BARE", "Bare"]];
const TITLE_TYPES: [string, string][] = [
  ["TCT", "TCT (Transfer Certificate of Title)"], ["CCT", "CCT (Condominium Certificate of Title)"], ["OCT", "OCT (Original Certificate of Title)"],
  ["TAX_DECLARATION", "Tax declaration"], ["CONTRACT_TO_SELL", "Contract to sell"],
];

/**
 * The listing form, for both countries: pesos and sqm in the Philippines,
 * dirhams, sqft, cheques and the advertising permit in the UAE. The server
 * checks every field again (src/lib/server/listing-editor.ts); the browser
 * checks here only save a round trip.
 */
export function ListingForm({ id, country, locations, values }: { id?: string; country: CountryCode; locations: LocationOption[]; values: ListingValues }) {
  const [state, action, pending] = useActionState<ListingFormState, FormData>(saveListing, {});
  const v = state.values ?? values;
  const m = marketOf(country);
  const ae = country === "AE";
  const [listingType, setListingType] = useState(v.listingType);
  const [propertyType, setPropertyType] = useState(v.propertyType);
  const [locationId, setLocationId] = useState(v.locationId);
  const lotOnly = propertyType === "LOT_ONLY" || propertyType === "AGRICULTURAL";
  const unit = ae ? "sqft" : "sqm";
  const currency = ae ? "AED" : "₱";
  const permit = locations.find((l) => l.id === locationId)?.permit ?? null;
  const bad = (f: keyof ListingValues) => (state.field === f ? { "aria-invalid": true as const, autoFocus: true } : {});
  const field = (f: keyof ListingValues) => clsx(input, state.field === f && "border-red-500 ring-2 ring-red-500/20");

  return (
    <form action={action} className="space-y-6" noValidate={false}>
      {id && <input type="hidden" name="id" value={id} />}
      <Message state={state} />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-bold text-sea-950">The basics</legend>
        <label className={clsx(label, "sm:col-span-2")}>
          Title
          <input name="title" required minLength={10} maxLength={120} defaultValue={v.title} className={field("title")} {...bad("title")}
            placeholder={ae ? "2BR apartment with marina view in Dubai Marina" : "Furnished 1BR condo near High Street, BGC"} />
        </label>
        <label className={label}>
          Listing
          <select name="listingType" value={listingType} onChange={(e) => setListingType(e.target.value)} className={field("listingType")} {...bad("listingType")}>
            {LISTING_TYPES.map((t) => <option key={t} value={t}>{m.listingTypeLabel[t]}</option>)}
          </select>
        </label>
        <label className={label}>
          Property type
          <select name="propertyType" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={field("propertyType")} {...bad("propertyType")}>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{m.propertyTypeLabel[t]}</option>)}
          </select>
        </label>
        <label className={clsx(label, "sm:col-span-2")}>
          Location
          <select name="locationId" required value={locationId} onChange={(e) => setLocationId(e.target.value)} className={field("locationId")} {...bad("locationId")}>
            <option value="">Choose a place…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <label className={clsx(label, "sm:col-span-2")}>
          Building or street <span className="font-normal text-ink-soft">(optional, not shown on the map)</span>
          <input name="addressLine" maxLength={200} defaultValue={v.addressLine} className={field("addressLine")} {...bad("addressLine")} />
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-bold text-sea-950">Price</legend>
        <label className={label}>
          {listingType === "RENT" ? `Rent (${currency})` : `Price (${currency})`}
          <input name="price" required inputMode="decimal" defaultValue={v.price} className={clsx(field("price"), "price")} {...bad("price")}
            placeholder={ae ? "2,450,000" : "12,500,000"} />
        </label>
        {listingType === "RENT" && (
          <label className={label}>
            Rent is paid
            <select name="rentPeriod" defaultValue={v.rentPeriod || (ae ? "YEARLY" : "MONTHLY")} className={field("rentPeriod")} {...bad("rentPeriod")}>
              <option value="MONTHLY">per month</option>
              <option value="YEARLY">per year</option>
              <option value="DAILY">per day</option>
            </select>
          </label>
        )}
        {listingType === "RENT" && ae && (
          <label className={label}>
            Number of cheques <span className="font-normal text-ink-soft">(optional)</span>
            <input name="rentCheques" type="number" min={1} max={12} defaultValue={v.rentCheques} className={field("rentCheques")} {...bad("rentCheques")} />
          </label>
        )}
        {listingType === "PRE_SELLING" && (
          <>
            <label className={label}>
              {ae ? "Handover" : "Turnover"} quarter
              <select name="turnoverQuarter" defaultValue={v.turnoverQuarter} className={field("turnoverQuarter")} {...bad("turnoverQuarter")}>
                <option value="">Choose…</option>
                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </label>
            <label className={label}>
              {ae ? "Handover" : "Turnover"} year
              <input name="turnoverYear" type="number" min={new Date().getFullYear()} max={new Date().getFullYear() + 15} defaultValue={v.turnoverYear} className={field("turnoverYear")} {...bad("turnoverYear")} />
            </label>
          </>
        )}
        {listingType === "FORECLOSED" && (
          <label className={clsx(label, "sm:col-span-2")}>
            {ae ? "Selling bank" : "Foreclosing institution"}
            <input name="foreclosingInstitution" maxLength={120} defaultValue={v.foreclosingInstitution} className={field("foreclosingInstitution")} {...bad("foreclosingInstitution")}
              placeholder={ae ? "Emirates NBD" : "Pag-IBIG Fund"} />
          </label>
        )}
        {ae && (
          <label className={clsx(label, "sm:col-span-2")}>
            Advertising permit number {permit ? <span className="font-normal text-ink-soft">({permit}, required to publish here)</span> : <span className="font-normal text-ink-soft">(if the emirate issues one)</span>}
            <input name="adPermitNumber" maxLength={40} defaultValue={v.adPermitNumber} className={field("adPermitNumber")} {...bad("adPermitNumber")} />
          </label>
        )}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-base font-bold text-sea-950">Size and layout</legend>
        {!lotOnly && (
          <label className={label}>
            Floor area ({unit})
            <input name="floorArea" inputMode="decimal" defaultValue={v.floorArea} className={field("floorArea")} {...bad("floorArea")} />
          </label>
        )}
        {(lotOnly || propertyType === "HOUSE_AND_LOT" || propertyType === "TOWNHOUSE" || propertyType === "COMMERCIAL" || propertyType === "WAREHOUSE") && (
          <label className={label}>
            {ae ? "Plot" : "Lot"} area ({unit}){!lotOnly && propertyType !== "HOUSE_AND_LOT" && <span className="font-normal text-ink-soft"> (optional)</span>}
            <input name="lotArea" inputMode="decimal" defaultValue={v.lotArea} className={field("lotArea")} {...bad("lotArea")} />
          </label>
        )}
        {!lotOnly && (
          <>
            <label className={label}>
              Bedrooms <span className="font-normal text-ink-soft">(0 = studio)</span>
              <input name="bedrooms" type="number" min={0} max={50} defaultValue={v.bedrooms} className={field("bedrooms")} {...bad("bedrooms")} />
            </label>
            <label className={label}>
              Bathrooms
              <input name="bathrooms" type="number" min={0} max={50} defaultValue={v.bathrooms} className={field("bathrooms")} {...bad("bathrooms")} />
            </label>
            <label className={label}>
              Parking
              <input name="parkingSlots" type="number" min={0} max={100} defaultValue={v.parkingSlots} className={field("parkingSlots")} {...bad("parkingSlots")} />
            </label>
            <label className={label}>
              Furnishing
              <select name="furnishing" defaultValue={v.furnishing} className={field("furnishing")} {...bad("furnishing")}>
                <option value="">Not stated</option>
                {FURNISHING.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </label>
          </>
        )}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-bold text-sea-950">Ownership</legend>
        {!ae && (
          <label className={label}>
            Title type <span className="font-normal text-ink-soft">(optional)</span>
            <select name="titleType" defaultValue={v.titleType} className={field("titleType")} {...bad("titleType")}>
              <option value="">Not stated</option>
              {TITLE_TYPES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </label>
        )}
        {(ae || propertyType === "CONDOMINIUM") && listingType !== "RENT" && (
          <label className="flex items-start gap-2.5 self-end pb-2.5 text-sm text-ink">
            <input type="checkbox" name="foreignOwnershipEligible" defaultChecked={v.foreignOwnershipEligible} className="mt-0.5 size-4 accent-sea-900" />
            {ae ? "Freehold: open to foreign buyers" : "Open to foreign buyers (within the 40% foreign cap)"}
          </label>
        )}
      </fieldset>

      <label className={label}>
        Description
        <textarea name="description" required minLength={30} maxLength={5000} rows={8} defaultValue={v.description} className={field("description")} {...bad("description")}
          placeholder="What makes it a good home: views, light, amenities, nearby schools and transport, association dues, what's included." />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="rounded-full bg-sea-900 px-6 py-3 text-sm font-semibold text-white hover:bg-sea-800 disabled:opacity-60">
          {pending ? "Saving…" : id ? "Save changes" : "Create draft"}
        </button>
        {!id && <p className="text-sm text-ink-soft">Next you add photos, then publish.</p>}
      </div>
    </form>
  );
}
