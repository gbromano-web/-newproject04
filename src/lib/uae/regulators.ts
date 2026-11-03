/**
 * Who registers brokers in each emirate. The label is stored with the broker's
 * number (Agent.uaeRegulator) and shown on listings, e.g. "RERA BRN 12345".
 * An admin checks the registration with the regulator before approving.
 */
export const EMIRATE_REGULATORS: { emirate: string; regulator: string; numberLabel: string }[] = [
  { emirate: "Dubai", regulator: "RERA BRN", numberLabel: "Broker registration number (BRN)" },
  { emirate: "Abu Dhabi", regulator: "ADREC", numberLabel: "ADREC broker licence number" },
  { emirate: "Sharjah", regulator: "SRERD", numberLabel: "SRERD broker registration number" },
  { emirate: "Ajman", regulator: "ARRA", numberLabel: "ARRA broker registration number" },
  { emirate: "Ras Al Khaimah", regulator: "RAK RERA", numberLabel: "RAK RERA broker registration number" },
  { emirate: "Umm Al Quwain", regulator: "UAQ", numberLabel: "Broker registration number" },
  { emirate: "Fujairah", regulator: "Fujairah", numberLabel: "Broker registration number" },
];

export const regulatorFor = (emirate: string) => EMIRATE_REGULATORS.find((e) => e.emirate === emirate);
