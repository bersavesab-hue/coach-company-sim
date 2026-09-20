import type { CompanyId } from "../../contracts/ids/EntityIds.js";
import type { Company } from "../../domain/company/Company.js";

export interface CompanyRepository {
  getById(id: CompanyId): Company | undefined;
  save(company: Company): void;
}
