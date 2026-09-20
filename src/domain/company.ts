export type LicenseLevel =
  | "county"
  | "intercounty"
  | "intercity"
  | "interprovincial"
  | "national";

export interface CompanyState {
  id: string;
  name: string;
  cashCents: number;
  reputationPermille: number;
  totalRevenueCents: number;
  licenseLevel: LicenseLevel;
}
