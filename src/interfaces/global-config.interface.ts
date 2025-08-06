interface GlobalConfigInterface {
  name: string,
  slug: string,
  is_enabled: boolean,
  page?: string;
  limit?: string;
  created_on?: bigint;
  updated_on?: bigint;
}
export default GlobalConfigInterface;
