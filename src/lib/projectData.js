// Shared seed data + one-time historical migrations for the Installation
// Schedule. Pulled out of ProjectTracker.jsx so the standalone Map tab can
// read the same locations without duplicating this data or re-exporting
// non-component values from a page file (breaks Fast Refresh).
import { newId } from "./storage";
import { OWNER_PALETTE, initialsOf, UNASSIGNED } from "./dateUtils";

export const STORAGE_KEY = "vend.projectTracker.v3";

// Imported from the team's real Asana "Installation" project export
// (Installation.xlsx) on 2026-07-10. Owners were recovered from the
// "Color chart" custom field (the closest thing to a real assignee in that
// export); locations are Asana sections, and everything that appeared after
// the "COMPLETED" divider section is imported as archived. Phases with no
// Start/Due date in the source are kept but marked unconfirmed and dropped
// at today's date so they show up needing to be scheduled, instead of just
// disappearing.
export function initialData() {
  const team = [
    { id: "t1", name: "Matt Detore", initials: initialsOf("Matt Detore"), color: OWNER_PALETTE[0], timeOff: [] },
    {
      id: "t2",
      name: "Cerel Munoz",
      initials: initialsOf("Cerel Munoz"),
      color: OWNER_PALETTE[1],
      timeOff: [{ id: "oo1", start: "2026-11-01", end: "2026-11-05" }],
    },
    { id: "t3", name: "Derek Wills", initials: initialsOf("Derek Wills"), color: OWNER_PALETTE[2], timeOff: [] },
    { id: "t4", name: "Abdullah Sayed", initials: initialsOf("Abdullah Sayed"), color: OWNER_PALETTE[3], timeOff: [] },
    { id: "t5", name: "Pritesh Chandra", initials: initialsOf("Pritesh Chandra"), color: OWNER_PALETTE[4], timeOff: [] },
    { id: "t6", name: "James", initials: initialsOf("James"), color: OWNER_PALETTE[5], timeOff: [] },
  ];
  const locations = [
    {
      id: "l1",
      name: "2626 Cole",
      place: "Dallas",
      archived: true,
      phases: [
        { id: "p1", label: "Go Live", ownerId: "t1", start: "2026-07-20", end: "2026-07-23", confirmed: true, done: false },
        { id: "p2", label: "Onboarding", ownerId: "t1", start: "2026-05-13", end: "2026-07-12", confirmed: true, done: false },
        { id: "p3", label: "Install", ownerId: "t3", start: "2026-07-13", end: "2026-07-19", confirmed: true, done: false },
      ],
    },
    {
      id: "l2",
      name: "4500 N Prospect",
      place: "",
      archived: true,
      phases: [
        { id: "p4", label: "Go Live", ownerId: "t5", start: "2026-08-01", end: "2026-08-01", confirmed: true, done: false },
        { id: "p5", label: "Onboarding", ownerId: "t5", start: "2026-06-08", end: "2026-07-20", confirmed: true, done: false },
        { id: "p6", label: "Install", ownerId: "t2", start: "2026-07-21", end: "2026-07-22", confirmed: true, done: false },
        { id: "p7", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l3",
      name: "33 Arch St.",
      place: "Boston",
      archived: true,
      phases: [
        { id: "p8", label: "Onboarding", ownerId: "t1", start: "2026-05-22", end: "2026-07-26", confirmed: true, done: false },
        { id: "p9", label: "Go Live", ownerId: "t1", start: "2026-08-03", end: "2026-08-06", confirmed: true, done: false },
        { id: "p10", label: "Install", ownerId: "t2", start: "2026-07-27", end: "2026-08-02", confirmed: true, done: false },
        { id: "p11", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l4",
      name: "80 S Lake",
      place: "Pasadena, CA",
      archived: true,
      phases: [
        { id: "p12", label: "Go Live", ownerId: "t1", start: "2026-08-31", end: "2026-09-03", confirmed: true, done: false },
        { id: "p13", label: "Onboarding", ownerId: "t1", start: "2026-06-30", end: "2026-08-16", confirmed: true, done: false },
        { id: "p14", label: "Install", ownerId: "t3", start: "2026-08-17", end: "2026-08-30", confirmed: true, done: false },
        { id: "p15", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l5",
      name: "7272 Indian Bend Rd",
      place: "Scottsdale",
      archived: true,
      phases: [
        { id: "p16", label: "Go Live", ownerId: "t1", start: "2026-10-05", end: "2026-10-09", confirmed: true, done: false },
        { id: "p17", label: "Onboarding", ownerId: "t1", start: "2026-03-26", end: "2026-06-07", confirmed: true, done: false },
        { id: "p18", label: "Install", ownerId: "t2", start: "2026-06-08", end: "2026-06-22", confirmed: true, done: false },
        { id: "p19", label: "June Install maybe", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p20", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l6",
      name: "4141 N Scottsdale Rd",
      place: "Scottsdale",
      archived: true,
      phases: [
        { id: "p21", label: "Go Live", ownerId: "t1", start: "2026-10-05", end: "2026-10-09", confirmed: true, done: false },
        { id: "p22", label: "Onboarding", ownerId: "t1", start: "2026-03-26", end: "2026-06-07", confirmed: true, done: false },
        { id: "p23", label: "Install", ownerId: "t2", start: "2026-06-08", end: "2026-06-22", confirmed: true, done: false },
        { id: "p24", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l7",
      name: "Rock Spring Ct.",
      place: "MDV",
      archived: true,
      phases: [
        { id: "p25", label: "Prep (3 weeks)", ownerId: UNASSIGNED, start: "2026-08-03", end: "2026-08-24", confirmed: true, done: false },
        { id: "p26", label: "Go Live", ownerId: "t1", start: "2026-10-26", end: "2026-10-29", confirmed: true, done: true },
        { id: "p27", label: "Install", ownerId: UNASSIGNED, start: "2026-09-10", end: "2026-10-21", confirmed: true, done: true },
        { id: "p28", label: "Onboarding", ownerId: "t1", start: "2026-05-27", end: "2026-08-02", confirmed: true, done: true },
        { id: "p29", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l8",
      name: "Manulife Portfolio",
      place: "Canada",
      archived: true,
      phases: [
        { id: "p30", label: "5 x gateless lots", ownerId: UNASSIGNED, start: "2026-08-04", end: "2026-08-29", confirmed: true, done: false },
        { id: "p31", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p32", label: "Onboarding", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p33", label: "Install", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p34", label: "Go Live", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l9",
      name: "Santana Row",
      place: "",
      archived: true,
      phases: [
        { id: "p35", label: "Hold", ownerId: UNASSIGNED, start: "2026-07-04", end: "2026-09-03", confirmed: true, done: false },
        { id: "p36", label: "60 Day Notice", ownerId: UNASSIGNED, start: "2026-05-02", end: "2026-07-01", confirmed: true, done: false },
        { id: "p37", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p38", label: "Onboarding", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p39", label: "Install", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p40", label: "Go Live", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l10",
      name: "The Epic Dallas",
      place: "Tx",
      archived: true,
      phases: [
        { id: "p41", label: "Onboarding", ownerId: "t1", start: "2026-05-04", end: "2026-07-05", confirmed: true, done: true },
        { id: "p42", label: "Install", ownerId: "t3", start: "2026-07-06", end: "2026-07-22", confirmed: true, done: true },
        { id: "p43", label: "Go Live", ownerId: "t1", start: "2026-07-23", end: "2026-07-23", confirmed: true, done: true },
      ],
    },
    {
      id: "l11",
      name: "1400 K St NW",
      place: "D.C.",
      archived: true,
      phases: [
        { id: "p44", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p45", label: "Onboarding", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p46", label: "Install", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p47", label: "Go Live", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l12",
      name: "75 State",
      place: "Boston",
      archived: true,
      phases: [
        { id: "p48", label: "Hold", ownerId: UNASSIGNED, start: "2026-02-23", end: "2026-03-01", confirmed: true, done: false },
        { id: "p49", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p50", label: "Onboarding", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p51", label: "Install", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p52", label: "Go Live", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l13",
      name: "Granite Tower",
      place: "Denver",
      archived: true,
      phases: [
        { id: "p53", label: "Maybe Install", ownerId: UNASSIGNED, start: "2026-05-21", end: "2026-07-08", confirmed: true, done: false },
        { id: "p54", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p55", label: "Onboarding", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p56", label: "Install", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p57", label: "Go Live", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l14",
      name: "9711 Washington Blvd",
      place: "DMV",
      archived: true,
      phases: [
        { id: "p58", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p59", label: "Onboarding", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p60", label: "Install", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p61", label: "Go Live", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l15",
      name: "177 E Colorado",
      place: "Pasadena CA",
      archived: true,
      phases: [
        { id: "p62", label: "Onboarding", ownerId: "t1", start: "2026-03-30", end: "2026-06-21", confirmed: true, done: false },
        { id: "p63", label: "Install", ownerId: "t3", start: "2026-06-22", end: "2026-06-28", confirmed: true, done: false },
        { id: "p64", label: "Go Live", ownerId: "t1", start: "2026-06-29", end: "2026-07-03", confirmed: true, done: false },
      ],
    },
    {
      id: "l16",
      name: "1600 Broadway",
      place: "Denver",
      archived: true,
      phases: [
        { id: "p65", label: "Onboarding", ownerId: "t1", start: "2026-03-30", end: "2026-06-07", confirmed: true, done: false },
        { id: "p66", label: "Go Live", ownerId: "t1", start: "2026-06-15", end: "2026-06-18", confirmed: true, done: false },
        { id: "p67", label: "Install", ownerId: "t3", start: "2026-06-08", end: "2026-06-14", confirmed: true, done: false },
        { id: "p68", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-03-29", end: "2026-03-29", confirmed: true, done: false },
      ],
    },
    {
      id: "l17",
      name: "Denver Place",
      place: "Denver",
      archived: true,
      phases: [
        { id: "p69", label: "Go Live", ownerId: "t1", start: "2026-06-08", end: "2026-06-12", confirmed: true, done: false },
        { id: "p70", label: "Onboarding", ownerId: "t1", start: "2026-04-01", end: "2026-05-24", confirmed: true, done: false },
        { id: "p71", label: "Install", ownerId: "t3", start: "2026-05-25", end: "2026-06-07", confirmed: true, done: false },
        { id: "p72", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l18",
      name: "South Garage - Bakery Square",
      place: "Pittsburgh",
      archived: true,
      phases: [
        { id: "p73", label: "Go Live", ownerId: "t1", start: "2026-06-01", end: "2026-06-05", confirmed: true, done: false },
        { id: "p74", label: "Onboarding", ownerId: "t1", start: "2026-03-04", end: "2026-05-24", confirmed: true, done: false },
        { id: "p75", label: "Install", ownerId: "t2", start: "2026-05-25", end: "2026-05-31", confirmed: true, done: false },
        { id: "p76", label: "Pre-Install Survey", ownerId: "t2", start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l19",
      name: "North Garage - Bakery Square",
      place: "Pittsburgh",
      archived: true,
      phases: [
        { id: "p77", label: "Onboarding", ownerId: "t1", start: "2026-03-02", end: "2026-05-17", confirmed: true, done: false },
        { id: "p78", label: "Go Live", ownerId: "t1", start: "2026-06-01", end: "2026-06-05", confirmed: true, done: false },
        { id: "p79", label: "Install", ownerId: "t2", start: "2026-05-18", end: "2026-05-24", confirmed: true, done: false },
        { id: "p80", label: "Pre-Install Survey", ownerId: "t2", start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l20",
      name: "720 Harrison Garage",
      place: "Boston",
      archived: true,
      phases: [
        { id: "p81", label: "Go Live", ownerId: "t1", start: "2026-05-11", end: "2026-05-13", confirmed: true, done: false },
        { id: "p82", label: "Onboarding", ownerId: "t1", start: "2026-02-17", end: "2026-05-06", confirmed: true, done: false },
        { id: "p83", label: "Install", ownerId: "t2", start: "2026-05-07", end: "2026-05-10", confirmed: true, done: false },
        { id: "p84", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l21",
      name: "Sunset Media Center",
      place: "Los Angeles CA",
      archived: true,
      phases: [
        { id: "p85", label: "Onboarding", ownerId: "t1", start: "2026-02-17", end: "2026-04-19", confirmed: true, done: false },
        { id: "p86", label: "Go Live", ownerId: "t1", start: "2026-05-04", end: "2026-05-06", confirmed: true, done: false },
        { id: "p87", label: "Install", ownerId: "t3", start: "2026-04-20", end: "2026-05-03", confirmed: true, done: false },
      ],
    },
    {
      id: "l22",
      name: "Foundry Square II",
      place: "San Francisco",
      archived: true,
      phases: [
        { id: "p88", label: "Onboarding", ownerId: "t1", start: "2025-11-21", end: "2026-03-22", confirmed: true, done: false },
        { id: "p89", label: "Install", ownerId: "t3", start: "2026-03-23", end: "2026-03-29", confirmed: true, done: false },
        { id: "p90", label: "Go Live", ownerId: "t1", start: "2026-03-30", end: "2026-04-03", confirmed: true, done: false },
      ],
    },
    {
      id: "l23",
      name: "Phase 2 - The Crossing Clarendon",
      place: "Arlington VA",
      archived: true,
      phases: [
        { id: "p91", label: "Pre-Install Survey", ownerId: "t2", start: "2025-10-29", end: "2025-10-30", confirmed: true, done: false },
        { id: "p92", label: "Onboarding", ownerId: "t1", start: "2025-11-18", end: "2026-01-18", confirmed: true, done: false },
        { id: "p93", label: "Install", ownerId: "t2", start: "2026-01-19", end: "2026-01-27", confirmed: true, done: false },
        { id: "p94", label: "Go Live", ownerId: "t1", start: "2026-01-28", end: "2026-01-28", confirmed: true, done: false },
      ],
    },
    {
      id: "l24",
      name: "Phase 1 - The Crossing Clarendon",
      place: "Arlington VA",
      archived: true,
      phases: [
        { id: "p95", label: "Pre-Install Survey", ownerId: "t2", start: "2025-10-29", end: "2025-10-30", confirmed: true, done: false },
        { id: "p96", label: "Onboarding", ownerId: "t1", start: "2025-11-18", end: "2026-01-25", confirmed: true, done: false },
        { id: "p97", label: "Install", ownerId: "t3", start: "2026-01-26", end: "2026-02-15", confirmed: true, done: false },
        { id: "p98", label: "Go Live", ownerId: "t1", start: "2026-02-16", end: "2026-02-17", confirmed: true, done: false },
      ],
    },
    {
      id: "l25",
      name: "6700 Capital Gateway",
      place: "Bethesda MD",
      archived: true,
      phases: [
        { id: "p99", label: "Curb Cutting", ownerId: UNASSIGNED, start: "2026-01-19", end: "2026-01-23", confirmed: true, done: false },
        { id: "p100", label: "Pre-Install Survey", ownerId: "t2", start: "2025-10-30", end: "2025-10-30", confirmed: true, done: false },
        { id: "p101", label: "Onboarding", ownerId: "t1", start: "2025-11-18", end: "2026-01-18", confirmed: true, done: false },
        { id: "p102", label: "Install", ownerId: UNASSIGNED, start: "2026-01-26", end: "2026-02-07", confirmed: true, done: true },
        { id: "p103", label: "Go Live", ownerId: "t1", start: "2026-02-16", end: "2026-02-17", confirmed: true, done: false },
      ],
    },
    {
      id: "l26",
      name: "6710 Capital Gateway",
      place: "Bethesda MD",
      archived: true,
      phases: [
        { id: "p104", label: "Pre-Install Survey", ownerId: "t2", start: "2025-10-30", end: "2025-10-30", confirmed: true, done: false },
        { id: "p105", label: "Onboarding", ownerId: "t1", start: "2025-11-18", end: "2026-02-08", confirmed: true, done: false },
        { id: "p106", label: "Install", ownerId: UNASSIGNED, start: "2026-02-09", end: "2026-02-15", confirmed: true, done: false },
        { id: "p107", label: "Go Live", ownerId: "t1", start: "2026-02-16", end: "2026-02-21", confirmed: true, done: false },
      ],
    },
    {
      id: "l27",
      name: "Towers Crescent",
      place: "Tysons VA",
      archived: true,
      phases: [
        { id: "p108", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: true },
        { id: "p109", label: "Onboarding", ownerId: "t4", start: "2025-11-06", end: "2026-01-04", confirmed: true, done: false },
        { id: "p110", label: "Install - Gates/Cameras", ownerId: "t3", start: "2026-01-05", end: "2026-01-11", confirmed: true, done: true },
        { id: "p111", label: "Install - Kiosk", ownerId: "t2", start: "2026-01-12", end: "2026-01-18", confirmed: true, done: false },
        { id: "p112", label: "Go Live", ownerId: "t4", start: "2026-01-19", end: "2026-01-19", confirmed: true, done: false },
      ],
    },
    {
      id: "l28",
      name: "2000 Tower Oaks",
      place: "DMV",
      archived: true,
      phases: [
        { id: "p113", label: "Pre-Install Survey", ownerId: "t3", start: "2025-10-01", end: "2025-10-02", confirmed: true, done: false },
        { id: "p114", label: "Onboarding", ownerId: "t1", start: "2025-10-09", end: "2025-11-16", confirmed: true, done: false },
        { id: "p115", label: "Install", ownerId: "t2", start: "2025-11-17", end: "2025-11-23", confirmed: true, done: false },
        { id: "p116", label: "Signage Installation", ownerId: "t6", start: "2026-01-08", end: "2026-01-09", confirmed: true, done: false },
        { id: "p117", label: "Go Live", ownerId: "t6", start: "2026-01-12", end: "2026-01-14", confirmed: true, done: false },
      ],
    },
    {
      id: "l29",
      name: "Mobile Plaza / Trip Bower",
      place: "Alabama",
      archived: true,
      phases: [
        { id: "p118", label: "Pre-Install Survey", ownerId: "t2", start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p119", label: "Onboarding", ownerId: UNASSIGNED, start: "2025-06-11", end: "2025-10-01", confirmed: true, done: false },
        { id: "p120", label: "Install", ownerId: "t2", start: "2025-10-20", end: "2025-10-23", confirmed: true, done: false },
        { id: "p121", label: "Go Live", ownerId: UNASSIGNED, start: "2025-11-14", end: "2025-11-14", confirmed: true, done: false },
      ],
    },
    {
      id: "l30",
      name: "Linear Retail",
      place: "Mass",
      archived: true,
      phases: [
        { id: "p122", label: "Pre-Install Survey", ownerId: "t3", start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p123", label: "Onboarding", ownerId: "t4", start: "2025-07-03", end: "2025-09-21", confirmed: true, done: true },
        { id: "p124", label: "Install", ownerId: "t2", start: "2025-09-26", end: "2025-10-17", confirmed: true, done: false },
        { id: "p125", label: "Go Live", ownerId: "t4", start: "2025-11-03", end: "2025-11-03", confirmed: true, done: false },
      ],
    },
    {
      id: "l31",
      name: "One Arts Plaza",
      place: "Dallas",
      archived: true,
      phases: [
        { id: "p126", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: true },
        { id: "p127", label: "Onboarding", ownerId: "t1", start: "2025-07-24", end: "2025-09-01", confirmed: true, done: true },
        { id: "p128", label: "Install", ownerId: "t3", start: "2025-09-02", end: "2025-09-19", confirmed: true, done: true },
        { id: "p129", label: "Go Live", ownerId: "t1", start: "2025-09-22", end: "2025-09-24", confirmed: true, done: true },
        { id: "p130", label: "Install - Basement/Camera Move", ownerId: "t3", start: "2025-10-14", end: "2025-10-23", confirmed: true, done: true },
      ],
    },
    {
      id: "l32",
      name: "Roy Kelly",
      place: "Bryan, TX",
      archived: true,
      phases: [
        { id: "p131", label: "Install", ownerId: UNASSIGNED, start: "2025-09-09", end: "2025-09-21", confirmed: true, done: false },
        { id: "p132", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: true },
        { id: "p133", label: "Onboarding", ownerId: "t1", start: "2025-07-09", end: "2025-09-07", confirmed: true, done: true },
        { id: "p134", label: "Go Live", ownerId: "t1", start: "2025-09-22", end: "2025-09-24", confirmed: true, done: true },
      ],
    },
    {
      id: "l33",
      name: "1099 New York Av",
      place: "DC",
      archived: true,
      phases: [
        { id: "p135", label: "Pre-Install Survey", ownerId: "t2", start: "2026-07-10", end: "2026-07-10", confirmed: false, done: true },
        { id: "p136", label: "Onboarding", ownerId: "t4", start: "2025-06-29", end: "2025-08-08", confirmed: true, done: true },
        { id: "p137", label: "Install", ownerId: "t2", start: "2025-08-09", end: "2025-08-13", confirmed: true, done: true },
        { id: "p138", label: "Go Live", ownerId: "t4", start: "2025-08-16", end: "2025-08-16", confirmed: true, done: false },
      ],
    },
    {
      id: "l34",
      name: "National Place",
      place: "DC",
      archived: true,
      phases: [
        { id: "p139", label: "Pre-Install Survey", ownerId: "t2", start: "2026-07-10", end: "2026-07-10", confirmed: false, done: true },
        { id: "p140", label: "Onboarding", ownerId: "t4", start: "2025-06-29", end: "2025-08-03", confirmed: true, done: true },
        { id: "p141", label: "Install", ownerId: "t2", start: "2025-08-04", end: "2025-08-08", confirmed: true, done: true },
        { id: "p142", label: "Go Live", ownerId: "t4", start: "2025-08-12", end: "2025-08-12", confirmed: true, done: false },
      ],
    },
    {
      id: "l35",
      name: "The Republic",
      place: "Austin",
      archived: true,
      phases: [
        { id: "p143", label: "Pre-Install Survey", ownerId: "t3", start: "2025-03-13", end: "2025-03-13", confirmed: true, done: true },
        { id: "p144", label: "Onboarding", ownerId: "t4", start: "2025-05-14", end: "2025-07-26", confirmed: true, done: false },
        { id: "p145", label: "Install", ownerId: "t3", start: "2025-07-28", end: "2025-08-02", confirmed: true, done: false },
        { id: "p146", label: "Go Live", ownerId: "t4", start: "2025-08-04", end: "2025-08-06", confirmed: true, done: false },
      ],
    },
    {
      id: "l36",
      name: "4126 SW Freeway",
      place: "Houston",
      archived: true,
      phases: [
        { id: "p147", label: "Pre-Install Survey", ownerId: "t3", start: "2025-03-04", end: "2025-03-07", confirmed: true, done: true },
        { id: "p148", label: "Onboarding", ownerId: UNASSIGNED, start: "2025-05-14", end: "2025-07-18", confirmed: true, done: true },
        { id: "p149", label: "Install", ownerId: "t3", start: "2025-07-21", end: "2025-07-25", confirmed: true, done: true },
        { id: "p150", label: "Go Live", ownerId: UNASSIGNED, start: "2025-07-28", end: "2025-07-28", confirmed: true, done: true },
      ],
    },
    {
      id: "l37",
      name: "McPherson Building",
      place: "DC",
      archived: true,
      phases: [
        { id: "p151", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
        { id: "p152", label: "Onboarding", ownerId: UNASSIGNED, start: "2025-04-07", end: "2025-05-30", confirmed: true, done: false },
        { id: "p153", label: "Install", ownerId: "t2", start: "2025-06-06", end: "2025-06-10", confirmed: true, done: false },
        { id: "p154", label: "Go Live", ownerId: UNASSIGNED, start: "2025-06-11", end: "2025-06-11", confirmed: true, done: false },
      ],
    },
    {
      id: "l38",
      name: "Inventa",
      place: "DC",
      archived: true,
      phases: [
        { id: "p155", label: "Pre-Install Survey", ownerId: UNASSIGNED, start: "2026-07-10", end: "2026-07-10", confirmed: false, done: true },
        { id: "p156", label: "Onboarding", ownerId: UNASSIGNED, start: "2025-04-03", end: "2025-05-24", confirmed: true, done: false },
        { id: "p157", label: "Install", ownerId: "t2", start: "2025-06-02", end: "2025-06-06", confirmed: true, done: false },
        { id: "p158", label: "Go Live", ownerId: "t4", start: "2025-06-09", end: "2025-06-09", confirmed: true, done: false },
        { id: "p159", label: "Hardware confirmed", ownerId: "t2", start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l39",
      name: "8270 Greensboro",
      place: "DC",
      archived: true,
      phases: [
        { id: "p160", label: "Pre-Install Survey", ownerId: "t3", start: "2025-03-27", end: "2025-03-27", confirmed: true, done: true },
        { id: "p161", label: "Onboarding", ownerId: "t4", start: "2025-03-20", end: "2025-05-21", confirmed: true, done: false },
        { id: "p162", label: "Install", ownerId: "t3", start: "2025-05-26", end: "2025-05-30", confirmed: true, done: false },
        { id: "p163", label: "Go Live", ownerId: UNASSIGNED, start: "2025-06-02", end: "2025-06-02", confirmed: true, done: false },
        { id: "p164", label: "Hardware confirmed", ownerId: "t2", start: "2026-07-10", end: "2026-07-10", confirmed: false, done: false },
      ],
    },
    {
      id: "l40",
      name: "Heightsmed",
      place: "Houston",
      archived: true,
      phases: [
        { id: "p165", label: "Pre-Install Survey", ownerId: "t3", start: "2025-03-06", end: "2025-03-07", confirmed: true, done: true },
        { id: "p166", label: "Onboarding", ownerId: "t4", start: "2025-02-03", end: "2025-04-04", confirmed: true, done: true },
        { id: "p167", label: "Install", ownerId: "t3", start: "2025-04-07", end: "2025-04-17", confirmed: true, done: true },
        { id: "p168", label: "Go Live", ownerId: UNASSIGNED, start: "2025-04-18", end: "2025-04-18", confirmed: true, done: true },
      ],
    },
  ];
  const salesReps = [
    "Tony Alabnese",
    "Mike Miele",
    "Clayton Whitt",
    "Justin Gluck",
    "Kent Bell",
    "Crew Pavia",
    "Mark McLauthlen",
    "Blake Jenkins",
  ];

  return { team, locations, queue: [], salesReps };
}

// One-time historical import from the "Completed Projects" Asana CSV export
// (2026-08-07) — appended to whatever's already in a user's saved data on
// first load after this shipped, guarded by asanaCompletedImportedV1 so it
// never re-runs or duplicates. "Crew" only exists long enough to label these
// phases correctly; he isn't added to the persisted team roster since he
// won't be doing future work.
export function buildAsanaImportLocations(team, crewId) {
  const find = (needle) => team.find((t) => t.name.toLowerCase().startsWith(needle.toLowerCase()))?.id;
  const matt = find("matt");
  const cerel = find("cerel");
  const derek = find("derek");
  const abdullah = find("abdullah");
  const james = find("james");

  function phase(label, start, end, ownerId) {
    return { id: newId(), label, ownerId: ownerId ?? UNASSIGNED, start, end, confirmed: true, done: true };
  }
  function loc(name, place, phases) {
    return { id: newId(), name, place, archived: true, phases };
  }

  return [
    loc("1600 Broadway", "Denver", [
      phase("Onboarding", "2026-03-30", "2026-06-07", matt),
      phase("Install", "2026-06-08", "2026-06-14", derek),
      phase("Go Live", "2026-06-15", "2026-06-18", matt),
    ]),
    loc("Denver Place", "Denver", [
      phase("Onboarding", "2026-04-01", "2026-05-24", matt),
      phase("Install", "2026-05-25", "2026-06-07", derek),
      phase("Go Live", "2026-06-08", "2026-06-12", matt),
    ]),
    loc("North Garage - Bakery Square", "Pittsburgh", [
      phase("Onboarding", "2026-03-02", "2026-05-17", matt),
      phase("Install", "2026-05-18", "2026-05-24", cerel),
      phase("Go Live", "2026-06-01", "2026-06-05", matt),
    ]),
    loc("720 Harrison Garage", "Boston", [
      phase("Onboarding", "2026-02-17", "2026-05-06", matt),
      phase("Install", "2026-05-07", "2026-05-10", cerel),
      phase("Go Live", "2026-05-11", "2026-05-13", matt),
    ]),
    loc("Sunset Media Center", "Los Angeles CA", [
      phase("Onboarding", "2026-02-17", "2026-04-19", matt),
      phase("Install", "2026-04-20", "2026-05-03", derek),
      phase("Go Live", "2026-05-04", "2026-05-06", matt),
    ]),
    loc("Foundry Square II", "San Francisco", [
      phase("Onboarding", "2025-11-21", "2026-03-22", matt),
      phase("Install", "2026-03-23", "2026-03-29", derek),
      phase("Go Live", "2026-03-30", "2026-04-03", matt),
    ]),
    loc("Phase 2 - The Crossing Clarendon", "Arlington VA", [
      phase("Onboarding", "2025-11-18", "2026-01-18", matt),
      phase("Install", "2026-01-19", "2026-01-27", cerel),
      phase("Go Live", "2026-01-28", "2026-01-28", matt),
    ]),
    loc("Phase 1 - The Crossing Clarendon", "Arlington VA", [
      phase("Onboarding", "2025-11-18", "2026-01-25", matt),
      phase("Install", "2026-01-26", "2026-02-15", derek),
      phase("Go Live", "2026-02-16", "2026-02-17", matt),
    ]),
    loc("6700 Capital Gateway", "Bethesda MD", [
      phase("Onboarding", "2025-11-18", "2026-01-18", matt),
      phase("Install", "2026-01-26", "2026-02-07", cerel),
      phase("Go Live", "2026-02-16", "2026-02-17", matt),
    ]),
    loc("Towers Crescent", "Tysons VA", [
      phase("Onboarding", "2025-11-06", "2026-01-04", abdullah),
      phase("Install", "2026-01-05", "2026-01-18", cerel),
      phase("Go Live", "2026-01-19", "2026-01-19", abdullah),
    ]),
    loc("2000 Tower Oaks", "DMV", [
      phase("Onboarding", "2025-10-09", "2025-11-16", matt),
      phase("Install", "2025-11-17", "2025-11-23", cerel),
      phase("Go Live", "2026-01-12", "2026-01-14", james),
    ]),
    loc("Mobile Plaza / Trip Bower", "Alabama", [
      phase("Onboarding", "2025-06-11", "2025-10-01", crewId),
      phase("Install", "2025-10-20", "2025-10-23", cerel),
      phase("Go Live", "2025-11-14", "2025-11-14", crewId),
    ]),
    loc("Linear Retail", "Mass", [
      phase("Onboarding", "2025-07-03", "2025-09-21", abdullah),
      phase("Install", "2025-09-26", "2025-10-17", cerel),
      phase("Go Live", "2025-11-03", "2025-11-03", abdullah),
    ]),
    loc("One Arts Plaza", "Dallas", [
      phase("Onboarding", "2025-07-24", "2025-09-01", matt),
      phase("Install", "2025-09-02", "2025-09-19", derek),
      phase("Go Live", "2025-09-22", "2025-09-24", matt),
    ]),
    loc("Roy Kelly", "Bryan, TX", [
      phase("Onboarding", "2025-07-09", "2025-09-07", matt),
      phase("Install", "2025-09-09", "2025-09-21", cerel),
      phase("Go Live", "2025-09-22", "2025-09-24", matt),
    ]),
    loc("1099 New York Av", "DC", [
      phase("Onboarding", "2025-06-29", "2025-08-08", abdullah),
      phase("Install", "2025-08-09", "2025-08-13", cerel),
      phase("Go Live", "2025-08-16", "2025-08-16", abdullah),
    ]),
    loc("National Place", "DC", [
      phase("Onboarding", "2025-06-29", "2025-08-03", abdullah),
      phase("Install", "2025-08-04", "2025-08-08", cerel),
      phase("Go Live", "2025-08-12", "2025-08-12", abdullah),
    ]),
    loc("The Republic", "Austin", [
      phase("Onboarding", "2025-05-14", "2025-07-26", abdullah),
      phase("Install", "2025-07-28", "2025-08-02", derek),
      phase("Go Live", "2025-08-04", "2025-08-06", abdullah),
    ]),
    loc("4126 SW Freeway", "Houston", [
      phase("Onboarding", "2025-05-14", "2025-07-18", crewId),
      phase("Install", "2025-07-21", "2025-07-25", derek),
      phase("Go Live", "2025-07-28", "2025-07-28", crewId),
    ]),
    loc("McPherson Building", "DC", [
      phase("Onboarding", "2025-04-07", "2025-05-30", crewId),
      phase("Install", "2025-06-06", "2025-06-10", cerel),
      phase("Go Live", "2025-06-11", "2025-06-11", abdullah),
    ]),
    loc("Inventa", "DC", [
      phase("Onboarding", "2025-04-03", "2025-05-24", crewId),
      phase("Install", "2025-06-02", "2025-06-06", cerel),
      phase("Go Live", "2025-06-09", "2025-06-09", abdullah),
    ]),
    loc("8270 Greensboro", "DC", [
      phase("Onboarding", "2025-03-20", "2025-05-21", abdullah),
      phase("Install", "2025-05-26", "2025-05-30", derek),
      phase("Go Live", "2025-06-02", "2025-06-02", crewId),
    ]),
    loc("Heightsmed", "Houston", [
      phase("Onboarding", "2025-02-03", "2025-04-04", abdullah),
      phase("Install", "2025-04-07", "2025-04-17", derek),
      phase("Go Live", "2025-04-18", "2025-04-18", crewId),
    ]),
  ];
}

// Names of the locations buildAsanaImportLocations creates — used to scope
// the Syed-Hossain correction so it only touches phases from that import,
// not any of the user's own pre-existing data.
export const ASANA_IMPORT_LOCATION_NAMES = new Set([
  "1600 Broadway", "Denver Place", "North Garage - Bakery Square", "720 Harrison Garage",
  "Sunset Media Center", "Foundry Square II", "Phase 2 - The Crossing Clarendon",
  "Phase 1 - The Crossing Clarendon", "6700 Capital Gateway", "Towers Crescent",
  "2000 Tower Oaks", "Mobile Plaza / Trip Bower", "Linear Retail", "One Arts Plaza",
  "Roy Kelly", "1099 New York Av", "National Place", "The Republic", "4126 SW Freeway",
  "McPherson Building", "Inventa", "8270 Greensboro", "Heightsmed",
]);
