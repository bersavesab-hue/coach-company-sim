import type { PassengerDemandProfile } from "../../domain/passenger/PassengerDemandProfile.js";

export interface PassengerDemandRepository {
  all(): readonly PassengerDemandProfile[];
}
