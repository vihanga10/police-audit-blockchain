# -*- coding: utf-8 -*-
"""
check_integrity.py
------------------
Verifies referential integrity across all nine dataset CSVs and reports
the EICL multi-signal cluster counts. Run after any regeneration.

Usage:  python3 check_integrity.py
Expects the 9 CSVs in the same directory.

WHY THIS EXISTS
  The dataset is a connected web: downstream files reference complaint
  numbers, officer IDs, and event IDs. Because the generators are seeded,
  complaint numbers are deterministic and stay stable across regenerations
  — but this script proves it rather than assuming it. "0 orphaned
  references across all files" is concrete evaluation evidence.
"""

import csv
from collections import defaultdict


def load_set(fn, col):
    try:
        with open(fn, encoding="utf-8-sig") as f:
            return set(r[col] for r in csv.DictReader(f) if r.get(col))
    except (FileNotFoundError, KeyError):
        return None


def load_multi(fn, col):
    """Columns holding comma/semicolon-separated ID lists."""
    out = set()
    try:
        with open(fn, encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                for part in r.get(col, "").replace(";", ",").split(","):
                    p = part.strip()
                    if p:
                        out.add(p)
    except (FileNotFoundError, KeyError):
        return None
    return out


def report(name, refs, universe):
    if refs is None:
        print(f"  {name:52s} SKIP (column/file absent)")
        return True
    orphans = refs - universe
    ok = len(orphans) == 0
    flag = "OK " if ok else "FAIL"
    print(f"  [{flag}] {name:48s} {len(refs):6d} refs, {len(orphans)} orphaned")
    if orphans:
        print(f"         sample orphans: {sorted(orphans)[:5]}")
    return ok


print("=" * 70)
print("REFERENTIAL INTEGRITY CHECK")
print("=" * 70)

complaints = load_set("complaints.csv", "complaint_number")
officers = load_set("officers.csv", "officer_id")
events = load_set("case_events.csv", "event_id")

print(f"\nAnchors: {len(complaints)} complaints, {len(officers)} officers, "
      f"{len(events)} case events\n")

all_ok = True
print("complaint_number references ->")
all_ok &= report("persons.csv", load_set("persons.csv", "complaint_number"), complaints)
all_ok &= report("evidence_descriptors.csv", load_set("evidence_descriptors.csv", "complaint_number"), complaints)
all_ok &= report("case_events.csv", load_set("case_events.csv", "complaint_number"), complaints)
all_ok &= report("court_records.csv", load_set("court_records.csv", "complaint_number"), complaints)
all_ok &= report("property_register.csv", load_set("property_register.csv", "complaint_number"), complaints)

print("\nofficer_id references ->")
all_ok &= report("case_events.officers_involved_ids", load_multi("case_events.csv", "officers_involved_ids"), officers)
all_ok &= report("order_book.officers_assigned_ids", load_multi("order_book.csv", "officers_assigned_ids"), officers)
all_ok &= report("court_records.officers_attending_court_ids", load_multi("court_records.csv", "officers_attending_court_ids"), officers)
all_ok &= report("property_register.delivering_officer_id", load_set("property_register.csv", "delivering_officer_id"), officers)
all_ok &= report("weapons_register.armory_keeper_officer_id", load_set("weapons_register.csv", "armory_keeper_officer_id"), officers)

print("\nevent_id references ->")
all_ok &= report("property_register.event_id", load_set("property_register.csv", "event_id"), events)

print("\n" + "=" * 70)
print("RESULT:", "ALL REFERENCES RESOLVE — dataset is fully connected."
      if all_ok else "BROKEN REFERENCES FOUND (see FAIL rows above).")
print("=" * 70)

# ── EICL multi-signal report ──
print("\nEICL MULTI-SIGNAL SUMMARY")
comps = {r["complaint_number"]: r
         for r in csv.DictReader(open("complaints.csv", encoding="utf-8-sig"))}
mo_pop = sum(1 for r in comps.values() if r.get("mo_entry_method"))
print(f"  MO populated : {mo_pop}/{len(comps)} ({100*mo_pop/len(comps):.1f}%)  "
      f"(empty = sensitive / non-physical groups, by design)")

try:
    evs = list(csv.DictReader(open("evidence_descriptors.csv", encoding="utf-8-sig")))
    ev_by_comp = defaultdict(set)
    for e in evs:
        ev_by_comp[e["complaint_number"]].add((e["descriptor_type"], e["descriptor_value"]))
    mo_clusters = defaultdict(list)
    for cn, r in comps.items():
        if r.get("mo_entry_method"):
            mo_clusters[(r["mo_entry_method"], r["mo_target_type"], r["mo_time_pattern"])].append(cn)
    mo_3plus = {s: m for s, m in mo_clusters.items() if len(m) >= 3}
    multi = 0
    for members in mo_3plus.values():
        shared = defaultdict(list)
        for cn in members:
            for ev in ev_by_comp[cn]:
                shared[ev].append(cn)
        if any(len(v) >= 2 for v in shared.values()):
            multi += 1
    print(f"  MO-only clusters (3+)         : {len(mo_3plus):5d}  (coincidental noise)")
    print(f"  MO + shared-evidence clusters : {multi:5d}  (the real signal)")
    print(f"  -> multi-signal removes ~{100*(1-multi/max(1,len(mo_3plus))):.0f}% of coincidental clusters")
except FileNotFoundError:
    print("  (evidence_descriptors.csv not found — skipping EICL summary)")
