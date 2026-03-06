export interface Family {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childrenIds: string[];
  marriageDate?: string;
  marriageDateRaw?: string;
  marriagePlace?: string;
}
