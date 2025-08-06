interface CurrenciesData {
  name: string;
  label: string;
  symbol: string;
  code: string;
  created_on?: bigint;
  updated_on?: bigint;
  created_by?: string;
  updated_by?: string;
}
export default CurrenciesData;

export const createCurrencySchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    label: { type: "string" },
    symbol: { type: "string" },
    code: { type: "string", minLength: 3, maxLength: 3 },
    created_on: { type: "number" },
    updated_on: { type: "number" },
    created_by: { type: "string" },
    updated_by: { type: "string" },
  },

};

